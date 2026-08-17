import { createAdminClient } from '@/lib/supabase/server';
import { type Attendee } from '@/types/webinar';
import { type ChatMessage } from '@/types/chat';

export interface WebinarProvider {
  startWebinar(webinarId: string): Promise<void>;
  endWebinar(webinarId: string): Promise<void>;
  getAttendees(webinarId: string): Promise<Attendee[]>;
  sendPublicMessage(
    sessionId: string,
    message: string,
    senderName?: string
  ): Promise<ChatMessage | null>;
  sendPrivateMessage(
    sessionId: string,
    attendeeId: string,
    message: string,
    senderName?: string
  ): Promise<ChatMessage | null>;
}

export class SupabaseWebinarProvider implements WebinarProvider {
  private supabase = createAdminClient();

  async startWebinar(webinarId: string): Promise<void> {
    const now = new Date().toISOString();
    
    // Update webinar status to LIVE
    await this.supabase
      .from('webinars')
      .update({
        status: 'LIVE',
        started_at: now,
        actual_start_at: now,
        updated_at: now,
      })
      .eq('id', webinarId);

    // Create a new session if one doesn't exist
    const { data: existingSession } = await this.supabase
      .from('webinar_sessions')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('status', 'LIVE')
      .limit(1)
      .maybeSingle();

    if (!existingSession) {
      await this.supabase
        .from('webinar_sessions')
        .insert([{
          webinar_id: webinarId,
          started_at: now,
          status: 'LIVE'
        }]);
    }
  }

  async endWebinar(webinarId: string): Promise<void> {
    const now = new Date().toISOString();
    
    await this.supabase
      .from('webinars')
      .update({
        status: 'ENDED',
        actual_end_at: now,
        updated_at: now,
      })
      .eq('id', webinarId);

    await this.supabase
      .from('webinar_sessions')
      .update({
        status: 'ENDED',
        ended_at: now,
        actual_end_at: now,
      })
      .eq('webinar_id', webinarId)
      .eq('status', 'LIVE');
  }

  async getAttendees(webinarId: string): Promise<Attendee[]> {
    const { data } = await this.supabase
      .from('webinar_registrations')
      .select('*')
      .eq('webinar_id', webinarId);

    return (data || []) as Attendee[];
  }

  async sendPublicMessage(
    sessionId: string,
    message: string,
    senderName: string = 'MOYA Assistant'
  ): Promise<ChatMessage | null> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert([{
        session_id: sessionId,
        sender_name: senderName,
        message,
        message_type: 'AI',
        target_attendee_id: null
      }])
      .select()
      .single();

    if (error) {
      console.error('[SupabaseWebinarProvider] Error sending public message:', error);
      return null;
    }

    return data as ChatMessage;
  }

  async sendPrivateMessage(
    sessionId: string,
    attendeeId: string,
    message: string,
    senderName: string = 'MOYA Assistant'
  ): Promise<ChatMessage | null> {
    
    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert([{
        session_id: sessionId,
        sender_name: senderName,
        message,
        message_type: 'AI',
        target_attendee_id: attendeeId
      }])
      .select()
      .single();

    if (error) {
      console.error('[SupabaseWebinarProvider] Error sending private message:', error);
      return null;
    }

    return data as ChatMessage;
  }
}

export const defaultWebinarProvider = new SupabaseWebinarProvider();
