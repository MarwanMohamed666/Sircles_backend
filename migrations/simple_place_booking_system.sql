-- Simple Place Booking System Migration
-- Only places (no spaces) - users book entire places directly from admin
-- Includes RLS policies, triggers, and availability functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =====================================================
-- TABLES
-- =====================================================

-- Places table (venues/locations that can be booked directly)
CREATE TABLE public.places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    location JSONB, -- {address, city, coordinates, etc}
    capacity INTEGER,
    admin_user_id TEXT NOT NULL, -- matches existing users.id type
    timezone TEXT NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_by TEXT DEFAULT auth.uid()::text,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT places_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT places_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Operating hours for places
CREATE TABLE public.place_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE NULL, -- NULL means indefinite
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT place_hours_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE,
    CONSTRAINT place_hours_valid_times CHECK (open_time < close_time),
    CONSTRAINT place_hours_unique UNIQUE (place_id, day_of_week, effective_from)
);

-- Blackout periods (when places are unavailable)
CREATE TABLE public.blackouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL,
    reason TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_by TEXT DEFAULT auth.uid()::text,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT blackouts_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE,
    CONSTRAINT blackouts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT blackouts_valid_period CHECK (starts_at < ends_at)
);

-- Bookings table (book entire places directly)
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    approved_by TEXT NULL, -- Admin who approved the booking
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Generated column for exclusion constraint
    period tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
    
    CONSTRAINT bookings_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE,
    CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT bookings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT bookings_valid_period CHECK (starts_at < ends_at)
);

-- Exclusion constraint to prevent overlapping bookings for the same place
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_no_overlap 
EXCLUDE USING gist (place_id WITH =, period WITH &&) 
WHERE (status <> 'cancelled');

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_places_admin_user_id ON public.places(admin_user_id);
CREATE INDEX idx_places_active ON public.places(is_active) WHERE is_active = true;

CREATE INDEX idx_place_hours_place_id ON public.place_hours(place_id);
CREATE INDEX idx_place_hours_effective ON public.place_hours(effective_from, effective_to);

CREATE INDEX idx_blackouts_place ON public.blackouts(place_id);
CREATE INDEX idx_blackouts_period ON public.blackouts USING gist(tstzrange(starts_at, ends_at, '[)'));

CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_place_id ON public.bookings(place_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_period ON public.bookings USING gist(period);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to validate booking against hours and blackouts
CREATE OR REPLACE FUNCTION validate_booking()
RETURNS TRIGGER AS $$
DECLARE
    place_tz TEXT;
    booking_day INTEGER;
    booking_start_time TIME;
    booking_end_time TIME;
    hours_exist BOOLEAN;
    blackout_conflict BOOLEAN;
BEGIN
    -- Get place timezone
    SELECT timezone INTO place_tz 
    FROM public.places 
    WHERE id = NEW.place_id;
    
    -- Convert booking times to place timezone for validation
    booking_day := EXTRACT(dow FROM (NEW.starts_at AT TIME ZONE place_tz));
    booking_start_time := (NEW.starts_at AT TIME ZONE place_tz)::TIME;
    booking_end_time := (NEW.ends_at AT TIME ZONE place_tz)::TIME;
    
    -- Check if booking falls within operating hours
    SELECT EXISTS(
        SELECT 1 FROM public.place_hours ph
        WHERE ph.place_id = NEW.place_id
        AND ph.day_of_week = booking_day
        AND ph.open_time <= booking_start_time
        AND ph.close_time >= booking_end_time
        AND (ph.effective_from <= CURRENT_DATE)
        AND (ph.effective_to IS NULL OR ph.effective_to >= CURRENT_DATE)
    ) INTO hours_exist;
    
    IF NOT hours_exist THEN
        RAISE EXCEPTION 'BOOKING_OUTSIDE_HOURS: Booking is outside operating hours for this day';
    END IF;
    
    -- Check for blackout conflicts
    SELECT EXISTS(
        SELECT 1 FROM public.blackouts b
        WHERE b.place_id = NEW.place_id
        AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
    ) INTO blackout_conflict;
    
    IF blackout_conflict THEN
        RAISE EXCEPTION 'BOOKING_BLACKOUT_CONFLICT: Booking conflicts with a blackout period';
    END IF;
    
    -- Ensure place is active
    IF NOT EXISTS(
        SELECT 1 FROM public.places p 
        WHERE p.id = NEW.place_id 
        AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'BOOKING_INACTIVE_PLACE: Place is inactive';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for booking validation
CREATE TRIGGER bookings_validate_trigger
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION validate_booking();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER places_updated_at_trigger
    BEFORE UPDATE ON public.places
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER bookings_updated_at_trigger
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Places policies
CREATE POLICY "Places are viewable by everyone" ON public.places 
FOR SELECT USING (true);

CREATE POLICY "Only admins can create places" ON public.places 
FOR INSERT WITH CHECK (auth.uid()::text = admin_user_id);

CREATE POLICY "Only place admins can update their places" ON public.places 
FOR UPDATE USING (auth.uid()::text = admin_user_id);

CREATE POLICY "Only place admins can delete their places" ON public.places 
FOR DELETE USING (auth.uid()::text = admin_user_id);

-- Place hours policies
CREATE POLICY "Place hours are viewable by everyone" ON public.place_hours 
FOR SELECT USING (true);

CREATE POLICY "Only place admins can manage hours" ON public.place_hours 
FOR ALL USING (EXISTS(
    SELECT 1 FROM public.places p 
    WHERE p.id = place_hours.place_id 
    AND p.admin_user_id = auth.uid()::text
));

-- Blackouts policies
CREATE POLICY "Blackouts are viewable by everyone" ON public.blackouts 
FOR SELECT USING (true);

CREATE POLICY "Only place admins can manage blackouts" ON public.blackouts 
FOR ALL USING (EXISTS(
    SELECT 1 FROM public.places p 
    WHERE p.id = blackouts.place_id 
    AND p.admin_user_id = auth.uid()::text
));

-- Bookings policies
CREATE POLICY "Users can view their own bookings and place admins can view all bookings for their places" ON public.bookings 
FOR SELECT USING (
    auth.uid()::text = user_id 
    OR EXISTS(
        SELECT 1 FROM public.places p 
        WHERE p.id = bookings.place_id 
        AND p.admin_user_id = auth.uid()::text
    )
);

CREATE POLICY "Authenticated users can create bookings" ON public.bookings 
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own bookings (pending only) and place admins can update all bookings" ON public.bookings 
FOR UPDATE USING (
    (auth.uid()::text = user_id AND status = 'pending')
    OR EXISTS(
        SELECT 1 FROM public.places p 
        WHERE p.id = bookings.place_id 
        AND p.admin_user_id = auth.uid()::text
    )
);

CREATE POLICY "Users can cancel their own bookings and place admins can cancel any booking for their places" ON public.bookings 
FOR DELETE USING (
    auth.uid()::text = user_id 
    OR EXISTS(
        SELECT 1 FROM public.places p 
        WHERE p.id = bookings.place_id 
        AND p.admin_user_id = auth.uid()::text
    )
);

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Check if a place is available for booking
CREATE OR REPLACE FUNCTION is_place_available(
    p_place_id UUID,
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    place_tz TEXT;
    booking_day INTEGER;
    booking_start_time TIME;
    booking_end_time TIME;
    hours_exist BOOLEAN;
    blackout_conflict BOOLEAN;
    booking_conflict BOOLEAN;
BEGIN
    -- Check if place exists and is active
    SELECT timezone INTO place_tz 
    FROM public.places 
    WHERE id = p_place_id AND is_active = true;
    
    IF place_tz IS NULL THEN
        RETURN false;
    END IF;
    
    -- Convert to place timezone
    booking_day := EXTRACT(dow FROM (p_starts_at AT TIME ZONE place_tz));
    booking_start_time := (p_starts_at AT TIME ZONE place_tz)::TIME;
    booking_end_time := (p_ends_at AT TIME ZONE place_tz)::TIME;
    
    -- Check operating hours
    SELECT EXISTS(
        SELECT 1 FROM public.place_hours ph
        WHERE ph.place_id = p_place_id
        AND ph.day_of_week = booking_day
        AND ph.open_time <= booking_start_time
        AND ph.close_time >= booking_end_time
        AND (ph.effective_from <= CURRENT_DATE)
        AND (ph.effective_to IS NULL OR ph.effective_to >= CURRENT_DATE)
    ) INTO hours_exist;
    
    IF NOT hours_exist THEN
        RETURN false;
    END IF;
    
    -- Check blackout periods
    SELECT EXISTS(
        SELECT 1 FROM public.blackouts b
        WHERE b.place_id = p_place_id
        AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
    ) INTO blackout_conflict;
    
    IF blackout_conflict THEN
        RETURN false;
    END IF;
    
    -- Check existing bookings
    SELECT EXISTS(
        SELECT 1 FROM public.bookings b
        WHERE b.place_id = p_place_id
        AND b.status <> 'cancelled'
        AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
    ) INTO booking_conflict;
    
    RETURN NOT booking_conflict;
END;
$$;

-- Get available time slots for a place
CREATE OR REPLACE FUNCTION get_available_place_slots(
    p_place_id UUID,
    p_date DATE,
    p_slot_duration_minutes INTEGER DEFAULT 60
) RETURNS TABLE(slot_time TEXT)
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    place_tz TEXT;
    slot_start TIMESTAMPTZ;
    slot_end TIMESTAMPTZ;
    day_start TIMESTAMPTZ;
    day_end TIMESTAMPTZ;
    open_time TIME;
    close_time TIME;
    current_slot TIMESTAMPTZ;
    slot_interval INTERVAL;
BEGIN
    -- Get place timezone and operating hours for the given date
    SELECT p.timezone INTO place_tz 
    FROM public.places p 
    WHERE p.id = p_place_id AND p.is_active = true;
    
    IF place_tz IS NULL THEN
        RETURN;
    END IF;
    
    -- Get operating hours for the day
    SELECT ph.open_time, ph.close_time INTO open_time, close_time
    FROM public.place_hours ph
    WHERE ph.place_id = p_place_id
    AND ph.day_of_week = EXTRACT(dow FROM p_date)
    AND (ph.effective_from <= p_date)
    AND (ph.effective_to IS NULL OR ph.effective_to >= p_date)
    LIMIT 1;
    
    IF open_time IS NULL THEN
        RETURN; -- No operating hours defined
    END IF;
    
    -- Calculate day boundaries in place timezone
    day_start := (p_date::text || ' ' || open_time::text)::timestamp AT TIME ZONE place_tz;
    day_end := (p_date::text || ' ' || close_time::text)::timestamp AT TIME ZONE place_tz;
    slot_interval := (p_slot_duration_minutes || ' minutes')::interval;
    
    -- Generate time slots
    current_slot := day_start;
    WHILE current_slot + slot_interval <= day_end LOOP
        slot_start := current_slot;
        slot_end := current_slot + slot_interval;
        
        -- Check if this slot is available
        IF is_place_available(p_place_id, slot_start, slot_end) THEN
            slot_time := to_char(slot_start AT TIME ZONE place_tz, 'HH24:MI');
            RETURN NEXT;
        END IF;
        
        current_slot := current_slot + slot_interval;
    END LOOP;
END;
$$;