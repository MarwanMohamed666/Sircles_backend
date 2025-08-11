
-- Enhanced RLS policies for private circles

-- Update circle_messages policies to restrict access to private circles
DROP POLICY IF EXISTS "Users can view messages in joined circles" ON circle_messages;
CREATE POLICY "Users can view messages in joined circles" ON circle_messages
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_circles uc
      JOIN circles c ON c.id = uc.circleid
      WHERE uc.circleid = circle_messages.circleid
      AND uc.userid = auth.uid()
      -- Only allow access if user is member (no public access for private circles)
    )
  );

-- Update posts policies for private circles
DROP POLICY IF EXISTS "Users can view posts from public circles or joined circles" ON posts;
CREATE POLICY "Users can view posts from public circles or joined circles" ON posts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (
      -- Public circles - anyone can view
      EXISTS (
        SELECT 1 FROM circles c
        WHERE c.id = posts.circleid
        AND c.privacy = 'public'
      )
      OR
      -- Private circles - only members can view
      EXISTS (
        SELECT 1 FROM user_circles uc
        JOIN circles c ON c.id = uc.circleid
        WHERE uc.circleid = posts.circleid
        AND uc.userid = auth.uid()
        AND c.privacy = 'private'
      )
    )
  );

-- Update events policies for private circles
DROP POLICY IF EXISTS "Users can view events" ON events;
CREATE POLICY "Users can view events" ON events
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (
      -- Public events or events in public circles
      (visibility = 'public' OR 
       EXISTS (
         SELECT 1 FROM circles c
         WHERE c.id = events.circleid
         AND c.privacy = 'public'
       ))
      OR
      -- Private events - only circle members can view
      EXISTS (
        SELECT 1 FROM user_circles uc
        WHERE uc.circleid = events.circleid
        AND uc.userid = auth.uid()
      )
    )
  );
