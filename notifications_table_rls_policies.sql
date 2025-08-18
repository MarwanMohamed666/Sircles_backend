
-- RLS Policies for notifications table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND userid = auth.uid()
  );

-- Allow system to create notifications (for join requests, etc.)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND userid = auth.uid()
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (
    auth.role() = 'authenticated' AND userid = auth.uid()
  );
-- RLS Policies for notifications table

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND userid = auth.uid()::text
  );

-- Allow system to create notifications (for join requests, comments, events, etc.)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND userid = auth.uid()::text
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (
    auth.role() = 'authenticated' AND userid = auth.uid()::text
  );

-- Additional policy for circle admins to manage circle-related notifications
CREATE POLICY "Circle admins can manage circle notifications" ON notifications
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    linkeditemtype = 'circle' AND
    EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = notifications.linkeditemid
      AND (
        c.creator = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM circle_admins ca
          WHERE ca.circleid = c.id AND ca.userid = auth.uid()::text
        )
      )
    )
  );
