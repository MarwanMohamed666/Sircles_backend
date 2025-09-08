
-- Migration: user_circle_prefs_feature
-- Created: 2024-01-XX
-- Description: Implement dismiss/snooze circles functionality

-- UP MIGRATION
-- =============

-- Create user_circle_prefs table
CREATE TABLE IF NOT EXISTS public.user_circle_prefs (
    userid TEXT NOT NULL,
    circleid TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('not_interested', 'snoozed')),
    snooze_until TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (userid, circleid),
    FOREIGN KEY (userid) REFERENCES auth.users(id) ON DELETE CASCADE,
    FOREIGN KEY (circleid) REFERENCES public.circles(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_circle_prefs_not_interested 
    ON public.user_circle_prefs (userid, circleid) 
    WHERE status = 'not_interested';

CREATE INDEX IF NOT EXISTS idx_user_circle_prefs_snoozed 
    ON public.user_circle_prefs (userid, snooze_until) 
    WHERE status = 'snoozed';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_circle_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_user_circle_prefs_updated_at
    BEFORE UPDATE ON public.user_circle_prefs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_circle_prefs_updated_at();

-- Enable RLS
ALTER TABLE public.user_circle_prefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own circle preferences"
    ON public.user_circle_prefs
    FOR ALL
    TO authenticated
    USING (userid = auth.uid()::text)
    WITH CHECK (userid = auth.uid()::text);

-- Ensure read access to required tables (if not already exists)
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'circles' 
        AND policyname = 'Allow authenticated users to read circles'
    ) THEN
        CREATE POLICY "Allow authenticated users to read circles"
            ON public.circles
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Policy already exists
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'circle_interests' 
        AND policyname = 'Allow authenticated users to read circle interests'
    ) THEN
        CREATE POLICY "Allow authenticated users to read circle interests"
            ON public.circle_interests
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Create suggested circles view
CREATE OR REPLACE VIEW public.v_suggested_circles AS
WITH my_interests AS (
    SELECT ui.interestid
    FROM public.user_interests ui
    WHERE ui.userid = auth.uid()::text
),
ranked AS (
    SELECT 
        c.id, 
        c.name, 
        c.created_at,
        c.circle_profile_url,
        c.description,
        COUNT(*) as score
    FROM public.circles c
    JOIN public.circle_interests ci ON ci.circleid = c.id
    JOIN my_interests mi ON mi.interestid = ci.interestid
    LEFT JOIN public.user_circles uc
        ON uc.circleid = c.id AND uc.userid = auth.uid()::text
    LEFT JOIN public.user_circle_prefs p
        ON p.circleid = c.id AND p.userid = auth.uid()::text
    WHERE uc.userid IS NULL
        AND COALESCE(p.status, '') <> 'not_interested'
        AND NOT (p.status = 'snoozed' AND p.snooze_until > now())
    GROUP BY c.id, c.name, c.created_at, c.circle_profile_url, c.description
)
SELECT * FROM ranked
ORDER BY score DESC, created_at DESC
LIMIT 20;

-- Create RPC function for stable API
CREATE OR REPLACE FUNCTION public.suggested_circles()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    created_at TIMESTAMPTZ,
    circle_profile_url TEXT,
    description TEXT,
    score BIGINT
)
SECURITY INVOKER
LANGUAGE SQL
AS $$
    SELECT * FROM public.v_suggested_circles;
$$;

-- DOWN MIGRATION (for rollback)
-- =============================
-- To rollback, run these commands in reverse order:

-- DROP FUNCTION IF EXISTS public.suggested_circles();
-- DROP VIEW IF EXISTS public.v_suggested_circles;
-- DROP POLICY IF EXISTS "Users can manage their own circle preferences" ON public.user_circle_prefs;
-- ALTER TABLE public.user_circle_prefs DISABLE ROW LEVEL SECURITY;
-- DROP TRIGGER IF EXISTS tr_user_circle_prefs_updated_at ON public.user_circle_prefs;
-- DROP FUNCTION IF EXISTS update_user_circle_prefs_updated_at();
-- DROP INDEX IF EXISTS idx_user_circle_prefs_snoozed;
-- DROP INDEX IF EXISTS idx_user_circle_prefs_not_interested;
-- DROP TABLE IF EXISTS public.user_circle_prefs;
