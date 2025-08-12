
-- RLS Policies for events and event_interests tables

-- Enable RLS on both tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Circle members can view events" ON events;
DROP POLICY IF EXISTS "Circle members can create events" ON events;
DROP POLICY IF EXISTS "Circle admins can update events" ON events;
DROP POLICY IF EXISTS "Circle admins can delete events" ON events;
DROP POLICY IF EXISTS "Circle members can view event interests" ON event_interests;
DROP POLICY IF EXISTS "Circle admins can manage event interests" ON event_interests;

-- EVENTS TABLE POLICIES

-- Circle members can view events in their circles, and all users can view general events
CREATE POLICY "Circle members can view events" ON events
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (
      -- General events (circleid is null) are visible to all authenticated users
      events.circleid IS NULL
      OR
      -- Circle-specific events are visible to circle members
      EXISTS (
        SELECT 1 FROM user_circles uc
        WHERE uc.circleid = events.circleid
        AND uc.userid = auth.uid()
      )
    )
  );

-- Circle members can create events in their circles, and all users can create general events
CREATE POLICY "Circle members can create events" ON events
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    createdby = auth.uid() AND
    (
      -- Allow creating general events (circleid is null)
      events.circleid IS NULL
      OR
      -- Allow creating circle-specific events if user is a member
      EXISTS (
        SELECT 1 FROM user_circles uc
        WHERE uc.circleid = events.circleid
        AND uc.userid = auth.uid()
      )
    )
  );

-- Circle admins can update events
CREATE POLICY "Circle admins can update events" ON events
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    (
      -- Event creator can update
      createdby = auth.uid()
      OR
      -- Circle creator can update
      EXISTS (
        SELECT 1 FROM circles c
        WHERE c.id = events.circleid
        AND c.creator = auth.uid()
      )
      OR
      -- Circle admin can update
      EXISTS (
        SELECT 1 FROM circle_admins ca
        WHERE ca.circleid = events.circleid
        AND ca.userid = auth.uid()
      )
    )
  );

-- Circle admins can delete events
CREATE POLICY "Circle admins can delete events" ON events
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    (
      -- Event creator can delete
      createdby = auth.uid()
      OR
      -- Circle creator can delete
      EXISTS (
        SELECT 1 FROM circles c
        WHERE c.id = events.circleid
        AND c.creator = auth.uid()
      )
      OR
      -- Circle admin can delete
      EXISTS (
        SELECT 1 FROM circle_admins ca
        WHERE ca.circleid = events.circleid
        AND ca.userid = auth.uid()
      )
    )
  );

-- EVENT_INTERESTS TABLE POLICIES

-- Circle members can view event interests
CREATE POLICY "Circle members can view event interests" ON event_interests
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM events e
      JOIN user_circles uc ON uc.circleid = e.circleid
      WHERE e.id = event_interests.eventid
      AND uc.userid = auth.uid()
    )
  );

-- Circle admins can manage event interests
CREATE POLICY "Circle admins can manage event interests" ON event_interests
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM events e
      JOIN circles c ON c.id = e.circleid
      WHERE e.id = event_interests.eventid
      AND (
        -- Event creator
        e.createdby = auth.uid()
        OR
        -- Circle creator
        c.creator = auth.uid()
        OR
        -- Circle admin
        EXISTS (
          SELECT 1 FROM circle_admins ca
          WHERE ca.circleid = c.id
          AND ca.userid = auth.uid()
        )
      )
    )
  );
