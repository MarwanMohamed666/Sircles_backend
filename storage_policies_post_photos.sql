
-- Create RLS policies for post-photos bucket

-- Allow authenticated users to INSERT (upload) post photos
CREATE POLICY "Authenticated users can upload post photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-photos' AND
    auth.role() = 'authenticated' AND
    -- Validate file extensions (jpg, png, gif)
    (RIGHT(LOWER(name), 4) = '.png' OR 
     RIGHT(LOWER(name), 4) = '.jpg' OR 
     RIGHT(LOWER(name), 5) = '.jpeg' OR 
     RIGHT(LOWER(name), 4) = '.gif') AND
    -- Limit file size to 3MB (3,145,728 bytes)
    (octet_length(decode(encode(name, 'escape'), 'hex')) <= 3145728)
  );

-- Allow users to SELECT (view) post photos
CREATE POLICY "Anyone can view post photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-photos');

-- Allow post authors to UPDATE their post photos
CREATE POLICY "Users can update their own post photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'post-photos' AND
    auth.role() = 'authenticated' AND
    -- Extract post ID from filename and check if user owns the post
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id::text = SPLIT_PART(name, '_', 1)
      AND p.userid = auth.uid()
    )
  );

-- Allow post authors to DELETE their post photos
CREATE POLICY "Users can delete their own post photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-photos' AND
    auth.role() = 'authenticated' AND
    -- Extract post ID from filename and check if user owns the post
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id::text = SPLIT_PART(name, '_', 1)
      AND p.userid = auth.uid()
    )
  );
