-- Add duration to webinars
ALTER TABLE webinars ADD COLUMN duration_minutes INTEGER DEFAULT 60;

-- Add contact info to attendees
ALTER TABLE attendees ADD COLUMN email TEXT;
ALTER TABLE attendees ADD COLUMN phone TEXT;
