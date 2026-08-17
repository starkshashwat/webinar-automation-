import { processChatMessage } from './operator';
import { createAdminClient } from '../supabase/server';

export async function processMessage(sessionId: string, messageId: string) {
  const supabase = createAdminClient();

  const { data: message } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (!message || message.message_type !== 'ATTENDEE') {
    return;
  }

  await processChatMessage({
    sessionId,
    messageId,
    attendeeId: message.target_attendee_id || message.attendee_id || message.registration_id,
    message: message.message,
    senderName: message.sender_name,
  });
}
