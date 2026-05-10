const dotenv = require('dotenv');
const Redis = require('ioredis');
dotenv.config();

const express = require('express');
const { Queue, QueueEvents } = require('bullmq');
const { ensureConversation } = require('./services/conversationService');
const { supabase } = require('./db/supabaseClient');

const PORT = Number(process.env.PORT || 3000);
const QUEUE_NAME = 'incoming-messages';
const REDIS_CONFIG = process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379
};

const redisConnection = new Redis(REDIS_CONFIG, {
    maxRetriesPerRequest: null,
});

const logger = {
  info: (message, meta = {}) => console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() })),
  warn: (message, meta = {}) => console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() })),
  error: (message, meta = {}) => console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() })),
};

const incomingMessagesQueue = new Queue(QUEUE_NAME, { connection: REDIS_CONFIG });
const queueEvents = new QueueEvents(QUEUE_NAME, { connection: REDIS_CONFIG });

queueEvents.on('completed', ({ jobId }) => logger.info('Queue job completed', { jobId }));
queueEvents.on('failed', ({ jobId, failedReason }) => logger.error('Queue job failed', { jobId, failedReason }));

function validateWebhookRequest(req) {
  if (process.env.DISABLE_WEBHOOK_VALIDATION === 'true') {
    return true;
  }

  // Placeholder validation. Replace this with real WhatsApp Cloud signature verification.
  const token = req.header('x-whatsapp-signature') || req.header('x-hub-signature-256');
  if (!token) {
    return false;
  }

  // In production, verify token or signature using the app secret.
  // Example: compare HMAC-SHA256 of request body with X-Hub-Signature-256 header.
  return true;
}

function extractMessageData(body) {
  const entry = Array.isArray(body.entry) ? body.entry[0] : null;
  const changes = Array.isArray(entry?.changes) ? entry.changes[0] : null;
  const value = changes?.value;
  const messages = Array.isArray(value?.messages) ? value.messages : null;
  const message = messages?.[0];

  if (!message) {
    throw new Error('Missing message object in webhook payload');
  }

  const message_id = message.id || message.message_id || null;
  const from = message.from || null;
  const contactName = Array.isArray(value?.contacts) ? value.contacts[0]?.profile?.name || null : null;
  const timestamp = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  let content = null;
  if (message.text?.body) {
    content = message.text.body;
  } else if (message.button?.text) {
    content = message.button.text;
  } else if (message.image?.caption) {
    content = message.image.caption;
  } else if (message.interactive?.button_reply?.title) {
    content = message.interactive.button_reply.title;
  } else if (message.interactive?.list_reply?.title) {
    content = message.interactive.list_reply.title;
  } else {
    content = '[unsupported message type]';
  }

  if (!message_id || !from) {
    throw new Error('Missing required message fields: message_id or from');
  }

  return { message_id, from, content, timestamp, contactName };
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('Invalid JSON payload received', { error: err.message });
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

// Enable CORS for the dashboard
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.post('/webhook', async (req, res) => {
  logger.info('Incoming webhook request', { path: req.path, receivedAt: new Date().toISOString() });

  if (!validateWebhookRequest(req)) {
    logger.warn('Webhook validation failed');
    return res.status(401).json({ error: 'Invalid webhook signature or token' });
  }

  try {
    const { message_id, from, content, timestamp, contactName } = extractMessageData(req.body);
    await ensureConversation(from, contactName);

    const normalizedPayload = {
      message_id,
      conversation_id: from,
      direction: 'inbound',
      content,
      timestamp,
    };

    await incomingMessagesQueue.add('message', normalizedPayload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: { count: 5 },
    });

    logger.info('Enqueued incoming WhatsApp message', { message_id, conversation_id: from });
    return res.status(200).json({ status: 'accepted' });
  } catch (error) {
    logger.error('Webhook processing error', { error: error.message, stack: error.stack, body: req.body });
    const responsePayload = { status: 'ignored' };
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.error = error.message;
    }
    return res.status(500).json(responsePayload);
  }
});

// CRM Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/dashboard.html');
});

// API endpoint to fetch CRM data
app.get('/api/crm-data', async (req, res) => {
  try {
    // Get the latest entry for each conversation_id based on created_at
    const { data: outputs, error } = await supabase
      .from('ai_outputs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch CRM data', { error: error.message });
      return res.status(500).json({ error: 'Failed to fetch data' });
    }

    const { data: conversationRows, error: conversationError } = await supabase
      .from('conversations')
      .select('conversation_id, name');

    if (conversationError) {
      logger.warn('Failed to fetch conversation names', { error: conversationError.message });
    }

    const conversationNameById = (conversationRows || []).reduce((map, row) => {
      if (row.conversation_id) {
        map[row.conversation_id] = row.name;
      }
      return map;
    }, {});

    // Transform data to match dashboard format - keep only the latest entry per conversation
    const conversations = {};
    (outputs || []).forEach(row => {
      // Only add if we haven't seen this conversation_id before (since we're ordered by created_at desc)
      if (!conversations[row.conversation_id]) {
        conversations[row.conversation_id] = {
          name: conversationNameById[row.conversation_id] || row.conversation_id,
          summary: row.summary || '',
          customer_requirements: row.requirements ? JSON.parse(row.requirements) : [],
          business_requirements: row.business_requirements ? JSON.parse(row.business_requirements) : [],
          next_steps: row.next_steps ? JSON.parse(row.next_steps) : [],
          lead_status: row.lead_status || 'cold',
          key_entities: row.key_entities ? JSON.parse(row.key_entities) : [],
          created_at: row.created_at // Include timestamp for reference
        };
      }
    });

    res.json({ conversations });
  } catch (error) {
    logger.error('CRM API error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((err, req, res, next) => {
  logger.error('Unhandled server error', { error: err?.message, stack: err?.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  logger.info('WhatsApp webhook service started', {
    port: PORT,
    queueName: QUEUE_NAME,
    redisHost: REDIS_CONFIG.host,
    redisPort: REDIS_CONFIG.port,
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error('Port already in use', { port: PORT });
    process.exit(1);
  }
  logger.error('Server error', { error: error.message, stack: error.stack });
  throw error;
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
