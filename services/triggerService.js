const Redis = require('ioredis');
const { Queue } = require('bullmq');
const { eventBus } = require('./eventBus');
const { logger } = require('./logger');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
};

const redis = new Redis(REDIS_CONFIG);
const conversationTriggerQueue = new Queue('conversation-trigger', { connection: REDIS_CONFIG });

const JOB_DELAY_MS = 30000; // 30 seconds

async function acquireLock(conversationId, timeoutMs = 10000) {
  const lockKey = `conversation:lock:${conversationId}`;
  const result = await redis.set(lockKey, '1', 'NX', 'EX', Math.ceil(timeoutMs / 1000));
  return result === 'OK';
}

async function releaseLock(conversationId) {
  const lockKey = `conversation:lock:${conversationId}`;
  await redis.del(lockKey);
}

async function getPreviousJobId(conversationId) {
  const jobIdKey = `conversation:jobId:${conversationId}`;
  const jobId = await redis.get(jobIdKey);
  return jobId;
}

async function storeJobId(conversationId, jobId) {
  const jobIdKey = `conversation:jobId:${conversationId}`;
  await redis.set(jobIdKey, jobId);
}

async function cancelPreviousJob(jobId) {
  if (!jobId) return;

  try {
    const job = await conversationTriggerQueue.getJob(jobId);
    if (job && !job.finished) {
      await job.remove();
      logger.info('Cancelled previous job', { jobId });
    }
  } catch (error) {
    logger.error('Error cancelling job', { jobId, error: error.message });
  }
}

async function scheduleConversationJob(conversationId) {
  const jobId = `process-conversation-${conversationId}-${Date.now()}`;

  try {
    const job = await conversationTriggerQueue.add(
      'process-conversation',
      { conversation_id: conversationId },
      {
        jobId,
        delay: JOB_DELAY_MS,
        removeOnComplete: true,
        removeOnFail: { count: 3 },
      }
    );

    await storeJobId(conversationId, jobId);
    logger.info('Scheduled conversation job successfully', { conversationId, jobId, delay: JOB_DELAY_MS });
    return jobId;
  } catch (error) {
    logger.error('Failed to schedule conversation job', { conversationId, jobId, error: error.message, stack: error.stack });
    throw error;
  }
}

async function handleMessageReceived({ conversation_id }) {
  logger.info('Trigger layer received MESSAGE_RECEIVED event', { conversation_id });
  
  if (!conversation_id) {
    logger.warn('Received MESSAGE_RECEIVED event without conversation_id');
    return;
  }

  const lockAcquired = await acquireLock(conversation_id);
  logger.info('Lock acquisition result', { conversation_id, lockAcquired });
  
  if (!lockAcquired) {
    logger.warn('Could not acquire lock, skipping job scheduling', { conversation_id });
    return;
  }

  try {
    const previousJobId = await getPreviousJobId(conversation_id);
    logger.info('Retrieved previous job ID', { conversation_id, previousJobId });
    
    if (previousJobId) {
      logger.info('Cancelling previous job before scheduling new one', { conversation_id, previousJobId });
      await cancelPreviousJob(previousJobId);
    }

    const newJobId = await scheduleConversationJob(conversation_id);
    logger.info('Successfully scheduled new conversation job', { conversation_id, jobId: newJobId });
  } catch (error) {
    logger.error('Error handling message received', { conversation_id, error: error.message, stack: error.stack });
  } finally {
    await releaseLock(conversation_id);
    logger.info('Lock released after handling', { conversation_id });
  }
}

function startTriggerLayer() {
  // Wrap async handler to ensure promise rejections are properly caught
  eventBus.on('MESSAGE_RECEIVED', async (data) => {
    try {
      await handleMessageReceived(data);
    } catch (error) {
      logger.error('Uncaught error in trigger layer message handler', {
        error: error.message,
        stack: error.stack,
        data,
      });
    }
  });
  
  logger.info('Trigger layer started, listening for MESSAGE_RECEIVED events');
}

module.exports = { startTriggerLayer, conversationTriggerQueue };