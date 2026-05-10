const dotenv = require('dotenv');
dotenv.config();

const { Worker, QueueEvents } = require('bullmq');
const { insertMessage } = require('../services/messageService');
const { processConversation } = require('../services/aiController');
const { startTriggerLayer } = require('../services/triggerService');
const { logger } = require('../services/logger');
const Redis = require('ioredis');

const QUEUE_NAME = 'incoming-messages';
const TRIGGER_QUEUE_NAME = 'conversation-trigger';

// Build Redis connection URL with authentication
const REDIS_CONFIG = process.env.REDIS_URL 
  ? process.env.REDIS_URL 
  : `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}/0`;

const redisConnection = new Redis(REDIS_CONFIG, {
    maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  logger.info('Worker Redis connected successfully');
});

redisConnection.on('error', (err) => {
  logger.error('Worker Redis connection error', { error: err.message, code: err.code });
});

redisConnection.on('close', () => {
  logger.warn('Worker Redis connection closed');
});

const queueEvents = new QueueEvents(QUEUE_NAME, { connection: REDIS_CONFIG });
queueEvents.on('completed', ({ jobId }) => logger.info('Queue event completed', { jobId }));
queueEvents.on('failed', ({ jobId, failedReason }) => logger.error('Queue event failed', { jobId, failedReason }));
queueEvents.on('error', (err) => {
  logger.error('Queue events error', { error: err.message, code: err.code });
});

const triggerQueueEvents = new QueueEvents(TRIGGER_QUEUE_NAME, { connection: REDIS_CONFIG });
triggerQueueEvents.on('completed', ({ jobId }) => logger.info('Trigger queue event completed', { jobId }));
triggerQueueEvents.on('failed', ({ jobId, failedReason }) => logger.error('Trigger queue event failed', { jobId, failedReason }));
triggerQueueEvents.on('error', (err) => {
  logger.error('Trigger queue events error', { error: err.message, code: err.code });
});

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
