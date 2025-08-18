
-- RLS Policies for post_likes table

-- Enable RLS on post_likes table
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view post likes" ON post_likes;
DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON post_likes;

-- Users can view all post likes (for displaying like counts and checking if they liked a post)
CREATE POLICY "Users can view post likes" ON post_likes
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Users can like posts (insert their own likes)
CREATE POLICY "Users can like posts" ON post_likes
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    userid = auth.uid()
  );

-- Users can only unlike their own likes (delete their own likes)
CREATE POLICY "Users can unlike their own likes" ON post_likes
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    userid = auth.uid()
  );

-- Prevent users from updating likes (likes are binary - either exists or doesn't)
-- No UPDATE policy needed since likes shouldn't be updated, only inserted or deleted
