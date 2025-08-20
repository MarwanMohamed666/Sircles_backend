
-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE
    USING (userid = auth.uid());
