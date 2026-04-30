const { supabase } = require('../db/supabaseClient');
const { ensureConversation } = require('./conversationService');
const { eventBus } = require('./eventBus');
const { logger } = require('./logger');

async function insertMessage(message) {
  const { message_id, conversation_id, direction, content, timestamp } = message;

  if (!message_id || !conversation_id || !direction || !content || !timestamp) {
    throw new Error('Missing required message fields for insert');
  }

  await ensureConversation(conversation_id);

  const { error } = await supabase
    .from('messages')
    .insert([{ message_id, conversation_id, direction, content, timestamp, processed: false }], { returning: 'minimal' });

  if (error) {
    const duplicateConstraint =
      error.message?.includes('duplicate key value') ||
      error.details?.includes('already exists') ||
      error.code === '23505';

    if (duplicateConstraint) {
      logger.info('Message already exists, skipping duplicate insert', { message_id, conversation_id });
      return { skipped: true };
    }

    logger.error('Failed to insert message', { message_id, conversation_id, error: error.message });
    throw error;
  }

  eventBus.emit('MESSAGE_RECEIVED', { conversation_id });
  logger.info('Message stored and event emitted', { message_id, conversation_id });
  return { skipped: false };
}

module.exports = { insertMessage };