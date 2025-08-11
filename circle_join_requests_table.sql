
-- Create circle_join_requests table
CREATE TABLE IF NOT EXISTS public.circle_join_requests (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  circleid text NOT NULL,
  userid text NOT NULL,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT circle_join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT circle_join_requests_circleid_fkey FOREIGN KEY (circleid) REFERENCES public.circles(id) ON DELETE CASCADE,
  CONSTRAINT circle_join_requests_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT circle_join_requests_unique_request UNIQUE (circleid, userid)
);

-- Enable RLS
ALTER TABLE public.circle_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for circle_join_requests

-- Users can view their own requests
CREATE POLICY "Users can view own join requests" ON circle_join_requests
  FOR SELECT USING (
    auth.role() = 'authenticated' AND userid = auth.uid()
  );

-- Ensure users can also view their own pending requests specifically
CREATE POLICY "Users can view own pending requests" ON circle_join_requests
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    userid = auth.uid() AND 
    status = 'pending'
  );

-- Circle admins and creators can view requests for their circles
CREATE POLICY "Circle admins can view join requests" ON circle_join_requests
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (
      -- Circle creator can view
      EXISTS (
        SELECT 1 FROM circles c
        WHERE c.id = circle_join_requests.circleid
        AND c.creator = auth.uid()
      )
      OR
      -- Circle admin can view
      EXISTS (
        SELECT 1 FROM circle_admins ca
        WHERE ca.circleid = circle_join_requests.circleid
        AND ca.userid = auth.uid()
      )
    )
  );

-- Users can create join requests for circles they're not already in
CREATE POLICY "Users can create join requests" ON circle_join_requests
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    userid = auth.uid() AND
    -- User is not already a member of the circle
    NOT EXISTS (
      SELECT 1 FROM user_circles uc
      WHERE uc.circleid = circle_join_requests.circleid
      AND uc.userid = auth.uid()
    )
  );

-- Circle admins and creators can update request status
CREATE POLICY "Circle admins can update join requests" ON circle_join_requests
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    (
      -- Circle creator can update
      EXISTS (
        SELECT 1 FROM circles c
        WHERE c.id = circle_join_requests.circleid
        AND c.creator = auth.uid()
      )
      OR
      -- Circle admin can update
      EXISTS (
        SELECT 1 FROM circle_admins ca
        WHERE ca.circleid = circle_join_requests.circleid
        AND ca.userid = auth.uid()
      )
    )
  );

-- Circle admins and creators can delete requests
CREATE POLICY "Circle admins can delete join requests" ON circle_join_requests
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    (
      -- Circle creator can delete
      EXISTS (
        SELECT 1 FROM circles c
        WHERE c.id = circle_join_requests.circleid
        AND c.creator = auth.uid()
      )
      OR
      -- Circle admin can delete
      EXISTS (
        SELECT 1 FROM circle_admins ca
        WHERE ca.circleid = circle_join_requests.circleid
        AND ca.userid = auth.uid()
      )
      OR
      -- Users can delete their own requests
      userid = auth.uid()
    )
  );
