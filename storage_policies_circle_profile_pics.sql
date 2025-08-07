
-- RLS Policies for circle-profile-pics storage bucket

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload circle profile pics" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update circle profile pics" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete circle profile pics" ON storage.objects;
DROP POLICY IF EXISTS "Public can view circle profile pics" ON storage.objects;

-- Allow public access to SELECT (view) circle profile pics
CREATE POLICY "Public can view circle profile pics" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'circle-profile-pics'
  );

-- Allow circle admins to INSERT (upload) circle profile pics
CREATE POLICY "Circle admins can upload circle profile pics" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'circle-profile-pics' AND
    auth.role() = 'authenticated' AND
    (
      -- Extract circle ID from filename (format: {circleId}.jpg)
      EXISTS (
        SELECT 1 FROM circles c
        WHERE c.id = SUBSTRING(name FROM '^([^.]+)')::uuid
        AND c.createdby = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM circle_admins ca
        JOIN circles c ON c.id = ca.circleid
        WHERE ca.userid = auth.uid()
        AND c.id = SUBSTRING(name FROM '^([^.]+)')::uuid
      )
    )
  );

-- Allow circle admins to UPDATE circle profile pics
CREATE POLICY "Circle admins can update circle profile pics" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'circle-profile-pics' AND
    auth.role() = 'authenticated' AND
    (
      -- Extract circle ID from filename (format: {circleId}.jpg)
      EXISTS (
        SELECT 1 FROM circles c
        WHERE c.id = SUBSTRING(name FROM '^([^.]+)')::uuid
        AND c.createdby = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM circle_admins ca
        JOIN circles c ON c.id = ca.circleid
        WHERE ca.userid = auth.uid()
        AND c.id = SUBSTRING(name FROM '^([^.]+)')::uuid
      )
    )
  );

-- Allow circle admins to DELETE circle profile pics
CREATE POLICY "Circle admins can delete circle profile pics" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'circle-profile-pics' AND
    auth.role() = 'authenticated' AND
    (
      -- Extract circle ID from filename (format: {circleId}.jpg)
      EXISTS (
        SELECT 1 FROM circles c
        WHERE c.id = SUBSTRING(name FROM '^([^.]+)')::uuid
        AND c.createdby = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM circle_admins ca
        JOIN circles c ON c.id = ca.circleid
        WHERE ca.userid = auth.uid()
        AND c.id = SUBSTRING(name FROM '^([^.]+)')::uuid
      )
    )
  );
