-- Drop the old constraint
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_target_attendee_id_fkey;

-- Clear invalid target_attendee_ids
UPDATE chat_messages
SET target_attendee_id = NULL
WHERE target_attendee_id NOT IN (SELECT id FROM webinar_registrations);

-- Since attendee.id is now registration.id, we just alter the constraint to point to webinar_registrations
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_target_attendee_id_fkey
FOREIGN KEY (target_attendee_id) REFERENCES webinar_registrations(id) ON DELETE SET NULL;
