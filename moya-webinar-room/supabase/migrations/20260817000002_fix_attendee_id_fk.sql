-- Fix chat_messages_attendee_id_fkey to point to webinar_registrations instead of attendees
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_attendee_id_fkey;

-- Also drop registration_id foreign key if any exists
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_registration_id_fkey;

-- Clear invalid attendee_ids from old legacy attendees table
UPDATE chat_messages
SET attendee_id = NULL
WHERE attendee_id IS NOT NULL AND attendee_id NOT IN (SELECT id FROM webinar_registrations);

-- Re-point attendee_id to webinar_registrations
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_attendee_id_fkey
FOREIGN KEY (attendee_id) REFERENCES webinar_registrations(id) ON DELETE SET NULL;
