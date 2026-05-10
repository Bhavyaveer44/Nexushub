const { supabase } = require('../db/supabaseClient');
const { logger } = require('./logger');

async function ensureConversation(conversation_id, name = null) {
  if (!conversation_id) {
    throw new Error('conversation_id is required to ensure conversation');
  }

  if (name) {
    const { error } = await supabase
      .from('conversations')
      .upsert([{ conversation_id, name }], { onConflict: 'conversation_id', returning: 'minimal' });

    if (error) {
      const missingColumn = error.message?.includes('column "name" of relation "conversations" does not exist');
      if (missingColumn) {
        // Fallback when the DB schema has not been updated yet.
        const { error: fallbackError } = await supabase
          .from('conversations')
          .insert([{ conversation_id }], { returning: 'minimal' });

        const duplicateConstraint =
          fallbackError?.message?.includes('duplicate key value') ||
          fallbackError?.detail?.includes('already exists') ||
          fallbackError?.code === '23505';

        if (fallbackError && !duplicateConstraint) {
          logger.error('Failed to ensure conversation fallback', { conversation_id, error: fallbackError.message });
          throw fallbackError;
        }

        return;
      }

      logger.error('Failed to ensure conversation', { conversation_id, name, error: error.message });
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from('conversations')
    .insert([{ conversation_id }], { returning: 'minimal' });

  if (error && error.message && error.message.includes('duplicate key value')) {
    return;
  }

  if (error) {
    logger.error('Failed to ensure conversation', { conversation_id, error: error.message });
    throw error;
  }
}

module.exports = { ensureConversation };