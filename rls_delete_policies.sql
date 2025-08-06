
-- RLS Delete Policies for Circle-related Tables

-- 1. CIRCLES - Only creator can delete
CREATE POLICY "Only circle creator can delete circles" ON circles
  FOR DELETE USING (creator = auth.uid()::text);

-- 2. CIRCLE_ADMINS - Circle creator and admins can manage admins
CREATE POLICY "Circle creator and admins can delete circle admins" ON circle_admins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = circle_admins.circleid 
      AND (circles.creator = auth.uid()::text OR 
           EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = circles.id AND ca.userid = auth.uid()::text))
    )
  );

-- 3. CIRCLE_INTERESTS - Circle creator and admins can manage interests
CREATE POLICY "Circle creator and admins can delete circle interests" ON circle_interests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = circle_interests.circleid 
      AND (circles.creator = auth.uid()::text OR 
           EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = circles.id AND ca.userid = auth.uid()::text))
    )
  );

-- 4. CIRCLE_MESSAGES - Message sender, circle creator and admins can delete messages
CREATE POLICY "Message sender or circle admins can delete messages" ON circle_messages
  FOR DELETE USING (
    senderid = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = circle_messages.circleid 
      AND (circles.creator = auth.uid()::text OR 
           EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = circles.id AND ca.userid = auth.uid()::text))
    )
  );

-- 5. USER_CIRCLES - Users can leave circles, admins can remove members
CREATE POLICY "Users can leave or admins can remove from circles" ON user_circles
  FOR DELETE USING (
    userid = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = user_circles.circleid 
      AND (circles.creator = auth.uid()::text OR 
           EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = circles.id AND ca.userid = auth.uid()::text))
    )
  );

-- 6. POSTS - Post author or circle admins can delete posts
CREATE POLICY "Post author or circle admins can delete posts" ON posts
  FOR DELETE USING (
    userid = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = posts.circleid 
      AND (circles.creator = auth.uid()::text OR 
           EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = circles.id AND ca.userid = auth.uid()::text))
    )
  );

-- 7. COMMENTS - Comment author or circle admins can delete comments (for posts in their circles)
CREATE POLICY "Comment author or circle admins can delete comments" ON comments
  FOR DELETE USING (
    userid = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM posts p
      JOIN circles c ON c.id = p.circleid
      WHERE p.id = comments.postid 
      AND (c.creator = auth.uid()::text OR 
           EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = c.id AND ca.userid = auth.uid()::text))
    )
  );

-- 8. POST_LIKES - User who liked or circle admins can delete likes
CREATE POLICY "User or circle admins can delete post likes" ON post_likes
  FOR DELETE USING (
    userid = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM posts p
      JOIN circles c ON c.id = p.circleid
      WHERE p.id = post_likes.postid 
      AND (c.creator = auth.uid()::text OR 
           EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = c.id AND ca.userid = auth.uid()::text))
    )
  );

-- 9. EVENTS - Event creator or circle admins can delete events
CREATE POLICY "Event creator or circle admins can delete events" ON events
  FOR DELETE USING (
    createdby = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = events.circleid 
      AND (circles.creator = auth.uid()::text OR 
           EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = circles.id AND ca.userid = auth.uid()::text))
    )
  );

-- 10. EVENT_INTERESTS - Circle admins can manage event interests
CREATE POLICY "Circle admins can delete event interests" ON event_interests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN circles c ON c.id = e.circleid
      WHERE e.id = event_interests.eventid 
      AND (c.creator = auth.uid()::text OR 
           EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = c.id AND ca.userid = auth.uid()::text))
    )
  );

-- 11. NOTIFICATIONS - User owns notification or it's circle-related and user is admin
CREATE POLICY "User or circle admin can delete notifications" ON notifications
  FOR DELETE USING (
    userid = auth.uid()::text OR
    (linkeditemtype = 'circle' AND 
     EXISTS (
       SELECT 1 FROM circles 
       WHERE circles.id = notifications.linkeditemid 
       AND (circles.creator = auth.uid()::text OR 
            EXISTS (SELECT 1 FROM circle_admins ca WHERE ca.circleid = circles.id AND ca.userid = auth.uid()::text))
     )
    )
  );

-- 12. REPORTS - Only admins or the reporting user can delete reports
CREATE POLICY "Report author can delete reports" ON reports
  FOR DELETE USING (userid = auth.uid()::text);
