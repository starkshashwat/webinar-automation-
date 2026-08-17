export type MessageType = 'ATTENDEE' | 'AI' | 'HOST' | 'CTA' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  session_id: string;
  attendee_id: string | null;
  registration_id?: string | null;
  target_attendee_id: string | null; // null for broadcast, UUID for private whisper
  sender_name: string;
  message: string;
  message_type: MessageType;
  created_at: string;
}
