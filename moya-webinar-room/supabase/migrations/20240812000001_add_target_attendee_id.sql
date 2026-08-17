-- Add target_attendee_id to chat_messages for private replies
ALTER TABLE chat_messages 
ADD COLUMN target_attendee_id UUID REFERENCES attendees(id) ON DELETE SET NULL;
