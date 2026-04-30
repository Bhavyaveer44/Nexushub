const dotenv = require('dotenv');
dotenv.config();

const { supabase } = require('../db/supabaseClient');
const { preprocessConversation } = require('../services/preprocessorService');
const { processConversations } = require('../services/crmProcessingService');

async function main() {
  const { data, error } = await supabase
    .from('messages')
    .select('message_id,conversation_id,direction,content,timestamp')
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Failed to fetch messages from Supabase:', error.message || error);
    process.exit(1);
  }

  const preprocessed = preprocessConversation(data);
  const crm = processConversations(preprocessed.conversations);

  process.stdout.write(JSON.stringify(crm, null, 2));
}

main().catch(error => {
  console.error('Pipeline failed:', error.message || error);
  process.exit(1);
});