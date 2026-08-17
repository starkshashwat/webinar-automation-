DROP POLICY IF EXISTS "Admins can manage webinars" ON webinars;
CREATE POLICY "Admins can manage webinars" ON webinars USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage sessions" ON webinar_sessions;
CREATE POLICY "Admins can manage sessions" ON webinar_sessions USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage attendees" ON attendees;
CREATE POLICY "Admins can manage attendees" ON attendees USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage chat messages" ON chat_messages;
CREATE POLICY "Admins can manage chat messages" ON chat_messages USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage campaigns" ON campaigns;
CREATE POLICY "Admins can manage campaigns" ON campaigns USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage campaign messages" ON campaign_messages;
CREATE POLICY "Admins can manage campaign messages" ON campaign_messages USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage knowledge base" ON knowledge_base;
CREATE POLICY "Admins can manage knowledge base" ON knowledge_base USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
