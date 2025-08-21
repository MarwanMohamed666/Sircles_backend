
-- Enable RLS on user_look_for table
ALTER TABLE public.user_look_for ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own look_for interests
CREATE POLICY "Users can view own look_for interests" ON public.user_look_for
    FOR SELECT
    USING (userid = auth.uid());

-- Policy: Users can insert their own look_for interests
CREATE POLICY "Users can insert own look_for interests" ON public.user_look_for
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND userid = auth.uid()
    );

-- Policy: Users can delete their own look_for interests
CREATE POLICY "Users can delete own look_for interests" ON public.user_look_for
    FOR DELETE
    USING (userid = auth.uid());

-- Policy: Users can update their own look_for interests (if needed)
CREATE POLICY "Users can update own look_for interests" ON public.user_look_for
    FOR UPDATE
    USING (userid = auth.uid())
    WITH CHECK (userid = auth.uid());
