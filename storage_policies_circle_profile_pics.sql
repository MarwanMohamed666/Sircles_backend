
-- RLS Policies for circle-profile-pics storage bucket

-- Allow authenticated users to INSERT (upload) to circle-profile-pics bucket
CREATE POLICY "Authenticated users can upload circle profile pics" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'circle-profile-pics' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to UPDATE circle profile pics (THIS WAS MISSING!)
CREATE POLICY "Authenticated users can update circle profile pics" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'circle-profile-pics' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to DELETE circle profile pics
CREATE POLICY "Authenticated users can delete circle profile pics" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'circle-profile-pics' AND
    auth.role() = 'authenticated'
  );

-- Allow public access to SELECT (view) circle profile pics
CREATE POLICY "Public can view circle profile pics" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'circle-profile-pics'
  );
