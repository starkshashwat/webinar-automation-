import { createAdminClient } from '../supabase/server';
import { type ChatMessage } from '@/types/chat';

export async function getRecentContext(sessionId: string, limit: number = 10): Promise<ChatMessage[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching context:', error);
    return [];
  }

  // Return in chronological order (oldest first)
  return (data as ChatMessage[]).reverse();
}
