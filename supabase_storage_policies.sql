
-- Drop existing policies first
DROP POLICY IF EXISTS "Any logged-in user can view .png or .jpg avatars 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own .png or .jpg avatar 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload .png or .jpg avatar only 1oj01fe_0" ON storage.objects;

-- Create correct policies with proper operation types
CREATE POLICY "Users can upload avatar files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    right(lower(name), 4) = '.png'
    OR right(lower(name), 4) = '.jpg'
    OR right(lower(name), 5) = '.jpeg'
  )
  AND (
    name ~ ('^' || auth.uid()::text || '\.')
  )
);

CREATE POLICY "Users can view avatar files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    right(lower(name), 4) = '.png'
    OR right(lower(name), 4) = '.jpg'
  )
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    right(lower(name), 4) = '.png'
    OR right(lower(name), 4) = '.jpg'
    OR right(lower(name), 5) = '.jpeg'
  )
  AND (
    name ~ ('^' || auth.uid()::text || '\.')
  )
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    right(lower(name), 4) = '.png'
    OR right(lower(name), 4) = '.jpg'
    OR right(lower(name), 5) = '.jpeg'
  )
  AND (
    name ~ ('^' || auth.uid()::text || '\.')
  )
);
