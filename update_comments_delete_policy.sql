
-- Drop existing policy
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete comments with permissions" ON public.comments;

-- Create new policy that allows comment owner, post owner, and circle admins to delete comments
CREATE POLICY "Users can delete comments with permissions" ON public.comments
    FOR DELETE
    USING (
        -- Comment owner can delete their own comment
        userid = auth.uid()
        OR
        -- Post owner can delete comments on their post
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = comments.postid
            AND p.userid = auth.uid()
        )
        OR
        -- Circle admins can delete comments on posts in their circle
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circles c ON c.id = p.circleid
            WHERE p.id = comments.postid
            AND (
                -- Circle creator/owner
                c.creator = auth.uid()
                OR
                -- Circle admin
                EXISTS (
                    SELECT 1 FROM public.circle_admins ca
                    WHERE ca.circleid = c.id
                    AND ca.userid = auth.uid()
                )
            )
        )
    );
