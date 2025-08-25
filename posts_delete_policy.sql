
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can delete posts with permissions" ON public.posts;

-- Create comprehensive policy that allows post owner and circle admins to delete posts
CREATE POLICY "Users can delete posts with permissions" ON public.posts
    FOR DELETE
    USING (
        -- Post owner can delete their own post
        userid = auth.uid()
        OR
        -- Circle admins can delete posts in their circle (for posts that belong to circles)
        (
            circleid IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.circles c
                WHERE c.id = posts.circleid
                AND (
                    -- Circle creator/owner can delete any post in their circle
                    c.creator = auth.uid()
                    OR
                    -- Circle admin can delete any post in circles they admin
                    EXISTS (
                        SELECT 1 FROM public.circle_admins ca
                        WHERE ca.circleid = c.id
                        AND ca.userid = auth.uid()
                    )
                )
            )
        )
    );
