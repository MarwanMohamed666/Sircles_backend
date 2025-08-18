
-- Enable RLS on comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments on posts they can see
CREATE POLICY "Users can view comments on accessible posts" ON public.comments
    FOR SELECT
    USING (
        -- User can see comments if they can see the post
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = comments.postid
            AND (
                -- Post is in a public circle or general (circleid is null)
                p.circleid IS NULL
                OR EXISTS (
                    SELECT 1 FROM public.circles c
                    WHERE c.id = p.circleid
                    AND c.privacy = 'public'
                )
                OR EXISTS (
                    -- User is a member of the circle
                    SELECT 1 FROM public.user_circles uc
                    WHERE uc.circleid = p.circleid
                    AND uc.userid = auth.uid()
                )
            )
        )
    );

-- Policy: Users can create comments on posts they can see
CREATE POLICY "Users can create comments on accessible posts" ON public.comments
    FOR INSERT
    WITH CHECK (
        -- User must be authenticated
        auth.uid() IS NOT NULL
        AND userid = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = comments.postid
            AND (
                -- Post is in a public circle or general (circleid is null)
                p.circleid IS NULL
                OR EXISTS (
                    SELECT 1 FROM public.circles c
                    WHERE c.id = p.circleid
                    AND c.privacy = 'public'
                )
                OR EXISTS (
                    -- User is a member of the circle
                    SELECT 1 FROM public.user_circles uc
                    WHERE uc.circleid = p.circleid
                    AND uc.userid = auth.uid()
                )
            )
        )
    );

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE
    USING (userid = auth.uid())
    WITH CHECK (userid = auth.uid());

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE
    USING (userid = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
-- Note: No sequence needed since comments table uses text IDs, not auto-increment
