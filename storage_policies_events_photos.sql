
-- RLS Policies for events-photos bucket

-- Allow authenticated users to INSERT (upload) event photos
CREATE POLICY "Authenticated users can upload event photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'events-photos' AND
    auth.role() = 'authenticated' AND
    -- Validate file extensions (jpg, png, gif)
    (RIGHT(LOWER(name), 4) = '.png' OR 
     RIGHT(LOWER(name), 4) = '.jpg' OR 
     RIGHT(LOWER(name), 5) = '.jpeg' OR 
     RIGHT(LOWER(name), 4) = '.gif') AND
    -- Limit file size to 5MB (5,242,880 bytes)
    (octet_length(decode(encode(name, 'escape'), 'hex')) <= 5242880)
  );

-- Allow users to SELECT (view) event photos
CREATE POLICY "Anyone can view event photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'events-photos');

-- Allow event creators and circle admins to UPDATE event photos
CREATE POLICY "Event creators and circle admins can update event photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'events-photos' AND
    auth.role() = 'authenticated' AND
    -- Extract event ID from filename and check if user owns the event or is circle admin
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id::text = SPLIT_PART(name, '_', 1)
      AND (
        e.createdby = auth.uid() OR
        -- If it's a circle event, check if user is circle admin
        (e.circleid IS NOT NULL AND EXISTS (
          SELECT 1 FROM circle_admins ca
          WHERE ca.circleid = e.circleid AND ca.userid = auth.uid()
        )) OR
        -- If it's a circle event, check if user is circle creator
        (e.circleid IS NOT NULL AND EXISTS (
          SELECT 1 FROM circles c
          WHERE c.id = e.circleid AND c.creator = auth.uid()
        ))
      )
    )
  );

-- Allow event creators and circle admins to DELETE event photos
CREATE POLICY "Event creators and circle admins can delete event photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'events-photos' AND
    auth.role() = 'authenticated' AND
    -- Extract event ID from filename and check if user owns the event or is circle admin
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id::text = SPLIT_PART(name, '_', 1)
      AND (
        e.createdby = auth.uid() OR
        -- If it's a circle event, check if user is circle admin
        (e.circleid IS NOT NULL AND EXISTS (
          SELECT 1 FROM circle_admins ca
          WHERE ca.circleid = e.circleid AND ca.userid = auth.uid()
        )) OR
        -- If it's a circle event, check if user is circle creator
        (e.circleid IS NOT NULL AND EXISTS (
          SELECT 1 FROM circles c
          WHERE c.id = e.circleid AND c.creator = auth.uid()
        ))
      )
    )
  );
