import { createAdminClient } from '../supabase/server';
import { type KnowledgeBaseEntry } from '@/types/ai';

export async function getKnowledgeBase(webinarId: string): Promise<KnowledgeBaseEntry[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('webinar_id', webinarId)
    .eq('enabled', true);

  if (error || !data) {
    console.error('Error fetching knowledge base:', error);
    return [];
  }

  return data as KnowledgeBaseEntry[];
}
