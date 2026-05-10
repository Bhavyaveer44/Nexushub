const dotenv = require('dotenv');
dotenv.config();

const { Worker, QueueEvents } = require('bullmq');
const { insertMessage } = require('../services/messageService');
const { processConversation } = require('../services/aiController');
const { startTriggerLayer } = require('../services/triggerService');
const { logger } = require('../services/logger');

const QUEUE_NAME = 'incoming-messages';
const TRIGGER_QUEUE_NAME = 'conversation-trigger';
const redisConfig = process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379
};

const redisConnection = new Redis(redisConfig, {
    maxRetriesPerRequest: null,
});

const queueEvents = new QueueEvents(QUEUE_NAME, { connection: REDIS_CONFIG });
queueEvents.on('completed', ({ jobId }) => logger.info('Queue event completed', { jobId }));
queueEvents.on('failed', ({ jobId, failedReason }) => logger.error('Queue event failed', { jobId, failedReason }));

const triggerQueueEvents = new QueueEvents(TRIGGER_QUEUE_NAME, { connection: REDIS_CONFIG });
triggerQueueEvents.on('completed', ({ jobId }) => logger.info('Trigger queue event completed', { jobId }));
triggerQueueEvents.on('failed', ({ jobId, failedReason }) => logger.error('Trigger queue event failed', { jobId, failedReason }));

// Start the trigger layer before worker processing begins
startTriggerLayer();

const worker = new Worker(
  QUEUE_NAME,
  async job => {
    logger.info('Worker processing job', { jobId: job.id, jobName: job.name });

    if (job.name !== 'message') {
      const message = `Unsupported job name: ${job.name}`;
      logger.warn(message, { jobId: job.id });
      return { ignored: true };
    }

    return insertMessage(job.data);
  },
  {
    connection: REDIS_CONFIG,
    concurrency: 5,
  }
);

const triggerWorker = new Worker(
  TRIGGER_QUEUE_NAME,
  async job => {
    logger.info('Trigger worker processing job', { jobId: job.id, jobName: job.name });

    if (job.name !== 'process-conversation') {
      const message = `Unsupported job name: ${job.name}`;
      logger.warn(message, { jobId: job.id });
      return { ignored: true };
    }

    const { conversation_id } = job.data;
    if (!conversation_id) {
      logger.warn('Missing conversation_id in job data', { jobId: job.id });
      return { error: 'Missing conversation_id' };
    }

    // Call AI Controller to process the conversation
    const result = await processConversation(conversation_id);

    return result;
  },
  {
    connection: REDIS_CONFIG,
    concurrency: 2,
  }
);

worker.on('completed', job => {
  logger.info('Worker completed job successfully', { jobId: job.id, jobName: job.name });
});

worker.on('failed', (job, err) => {
  logger.error('Worker failed job', {
    jobId: job?.id,
    jobName: job?.name,
    error: err?.message,
    stack: err?.stack,
  });
});

triggerWorker.on('completed', job => {
  logger.info('Trigger worker completed job successfully', { jobId: job.id, jobName: job.name });
});

triggerWorker.on('failed', (job, err) => {
  logger.error('Trigger worker failed job', {
    jobId: job?.id,
    jobName: job?.name,
    error: err?.message,
    stack: err?.stack,
  });
});

process.on('SIGINT', async () => {
  logger.info('Workers shutting down gracefully');
  await Promise.all([worker.close(), triggerWorker.close()]);
  process.exit(0);
});

process.on('uncaughtException', err => {
  logger.error('Uncaught exception in worker process', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled rejection in worker process', { reason });
  process.exit(1);
});
