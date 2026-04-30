const { supabase } = require('../db/supabaseClient');
const { preprocessConversation } = require('./preprocessorService');
const { processConversations } = require('./crmProcessingService');
const { logger } = require('./logger');

/**
 * AI Controller: Processes a conversation through preprocessing and CRM analysis,
 * then stores the results in the ai_outputs table.
 * @param {string} conversation_id - The ID of the conversation to process
 * @returns {Promise<Object>} - The stored AI output record
 */
async function processConversation(conversation_id) {
  try {
    logger.info('AI Controller: Starting processing for conversation', { conversation_id });

    // 1. Fetch recent messages from Supabase
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('message_id, conversation_id, direction, content, timestamp')
      .eq('conversation_id', conversation_id)
      .eq('processed', 'false')
      .order('timestamp', { ascending: true });

    if (fetchError) {
      logger.error('AI Controller: Failed to fetch messages', { conversation_id, error: fetchError.message });
      throw fetchError;
    }

    if (!messages || messages.length === 0) {
      logger.warn('AI Controller: No messages found for conversation', { conversation_id });
      return null;
    }

    logger.info('AI Controller: Fetched messages', { conversation_id, messageCount: messages.length });

    // 2. Fetch previous AI outputs for context (last 5 entries)
    const { data: previousOutputs, error: prevError } = await supabase
      .from('ai_outputs')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (prevError && prevError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      logger.error('AI Controller: Failed to fetch previous AI outputs', { conversation_id, error: prevError.message });
      throw prevError;
    }

    logger.info('AI Controller: Previous AI outputs fetched', { conversation_id, count: previousOutputs?.length || 0 });

    // 3. Call Context Builder (Preprocessor)
    const preprocessed = preprocessConversation(messages);
    logger.info('AI Controller: Preprocessing completed', { conversation_id });

    // 4. Call AI Processing (CRM Analysis)
    const crmResult = processConversations(preprocessed.conversations, previousOutputs || []);
    const analysis = crmResult.results[conversation_id];

    if (!analysis) {
      logger.warn('AI Controller: No CRM analysis result for conversation', { conversation_id });
      return null;
    }

    logger.info('AI Controller: CRM analysis completed', { conversation_id, analysis });

    // 6. Store results in ai_outputs table
    const { data: stored, error: storeError } = await supabase
      .from('ai_outputs')
      .insert({
        conversation_id,
        summary: analysis.summary,
        requirements: analysis.customer_requirements,
        business_requirements: analysis.business_requirements,
        next_steps: analysis.next_steps,
        lead_status: analysis.lead_status,
        key_entities: analysis.logistics_entities,
      })
      .select()
      .single();

    if (storeError) {
      logger.error('AI Controller: Failed to store AI output', { conversation_id, error: storeError.message });
      throw storeError;
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ processed: true })
      .eq('conversation_id', conversation_id)
      .eq('processed', false);

    if (updateError) {
      console.error('Error updating processed flag:', updateError);
    }

    logger.info('AI Controller: Successfully stored AI output', { conversation_id, id: stored.id });

    return stored;
  } catch (error) {
    logger.error('AI Controller: Error processing conversation', {
      conversation_id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  processConversation,
};