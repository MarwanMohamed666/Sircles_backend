
-- RLS Policies for circles table to allow updates by circle creators and admins

-- Enable RLS on circles table if not already enabled
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all circles" ON circles;
DROP POLICY IF EXISTS "Users can create circles" ON circles;
DROP POLICY IF EXISTS "Circle creators and admins can update circles" ON circles;
DROP POLICY IF EXISTS "Circle creators can delete circles" ON circles;

-- Allow all authenticated users to view circles
CREATE POLICY "Users can view all circles" ON circles
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to create circles
CREATE POLICY "Users can create circles" ON circles
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    createdby = auth.uid()
  );

-- Allow circle creators and admins to update circles
CREATE POLICY "Circle creators and admins can update circles" ON circles
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    (
      -- Circle creator can update
      createdby = auth.uid()
      OR
      -- Circle admin can update
      EXISTS (
        SELECT 1 FROM circle_admins ca
        WHERE ca.circleid = circles.id
        AND ca.userid = auth.uid()
      )
    )
  );

-- Allow circle creators to delete circles
CREATE POLICY "Circle creators can delete circles" ON circles
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    createdby = auth.uid()
  );
