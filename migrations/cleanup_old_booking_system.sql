-- Cleanup Old Booking System
-- Removes all old booking system tables, functions, triggers, and policies
-- Run this BEFORE running the new simple_place_booking_system.sql

-- =====================================================
-- DROP TRIGGERS AND FUNCTIONS
-- =====================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS bookings_validate_trigger ON public.bookings;
DROP TRIGGER IF EXISTS bookings_updated_at_trigger ON public.bookings;
DROP TRIGGER IF EXISTS places_updated_at_trigger ON public.places;
DROP TRIGGER IF EXISTS spaces_updated_at_trigger ON public.spaces;

-- Drop functions
DROP FUNCTION IF EXISTS validate_booking();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS is_space_available(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_available_slots(UUID, UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS is_place_available(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_available_place_slots(UUID, DATE, INTEGER);

-- =====================================================
-- DROP POLICIES (RLS)
-- =====================================================

-- Drop all RLS policies
DROP POLICY IF EXISTS "Places are viewable by everyone" ON public.places;
DROP POLICY IF EXISTS "Only admins can create places" ON public.places;
DROP POLICY IF EXISTS "Only place admins can update their places" ON public.places;
DROP POLICY IF EXISTS "Only place admins can delete their places" ON public.places;

DROP POLICY IF EXISTS "Spaces are viewable by everyone" ON public.spaces;
DROP POLICY IF EXISTS "Only place admins can manage spaces" ON public.spaces;

DROP POLICY IF EXISTS "Place hours are viewable by everyone" ON public.place_hours;
DROP POLICY IF EXISTS "Only place admins can manage hours" ON public.place_hours;

DROP POLICY IF EXISTS "Blackouts are viewable by everyone" ON public.blackouts;
DROP POLICY IF EXISTS "Only place admins can manage blackouts" ON public.blackouts;

DROP POLICY IF EXISTS "Users can view their own bookings and place admins can view all bookings for their places" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings (pending only) and place admins can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can cancel their own bookings and place admins can cancel any booking for their places" ON public.bookings;

-- =====================================================
-- DROP CONSTRAINTS
-- =====================================================

-- Drop exclusion constraints
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- =====================================================
-- DROP INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_places_admin_user_id;
DROP INDEX IF EXISTS idx_places_active;

DROP INDEX IF EXISTS idx_spaces_place_id;
DROP INDEX IF EXISTS idx_spaces_active;

DROP INDEX IF EXISTS idx_place_hours_place_id;
DROP INDEX IF EXISTS idx_place_hours_effective;

DROP INDEX IF EXISTS idx_blackouts_place_space;
DROP INDEX IF EXISTS idx_blackouts_period;

DROP INDEX IF EXISTS idx_bookings_user_id;
DROP INDEX IF EXISTS idx_bookings_place_space;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_period;

-- =====================================================
-- DROP TABLES
-- =====================================================

-- Drop tables in order (dependent tables first)
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.blackouts CASCADE;
DROP TABLE IF EXISTS public.spaces CASCADE;
DROP TABLE IF EXISTS public.place_hours CASCADE;
DROP TABLE IF EXISTS public.places CASCADE;

-- =====================================================
-- CLEANUP EXTENSIONS (if not used elsewhere)
-- =====================================================

-- Note: Only drop btree_gist if you're sure it's not used by other tables
-- DROP EXTENSION IF EXISTS btree_gist;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify cleanup (these should return 0 rows)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('places', 'spaces', 'place_hours', 'blackouts', 'bookings');
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('validate_booking', 'is_space_available', 'get_available_slots');

-- Success message
SELECT 'Old booking system cleanup completed successfully!' as status;