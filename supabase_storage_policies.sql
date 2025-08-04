
-- Drop existing policies first
DROP POLICY IF EXISTS "Any logged-in user can view .png or .jpg avatars 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own .png or .jpg avatar 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload .png or .jpg avatar only 1oj01fe_0" ON storage.objects;

-- Create correct policies with proper operation types
CREATE POLICY "Users can upload .png or .jpg avatar only"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND bucket_id = 'avatars'
  AND (
    right(lower(name), 4) = '.png'
    OR right(lower(name), 4) = '.jpg'
  )
  AND (
    name LIKE auth.uid()::text || '.%' 
    OR name LIKE auth.uid()::text || '/%'
  )
);

CREATE POLICY "Any logged-in user can view .png or .jpg avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND bucket_id = 'avatars'
  AND (
    right(lower(name), 4) = '.png'
    OR right(lower(name), 4) = '.jpg'
  )
);

CREATE POLICY "Users can delete their own .png or .jpg avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND bucket_id = 'avatars'
  AND (
    right(lower(name), 4) = '.png'
    OR right(lower(name), 4) = '.jpg'
  )
  AND (
    name LIKE auth.uid()::text || '.%' 
    OR name LIKE auth.uid()::text || '/%'
  )
);
