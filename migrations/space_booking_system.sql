-- Space Booking System Migration
-- Creates tables for places, spaces, hours, blackouts, and bookings
-- Includes RLS policies, triggers, and availability functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =====================================================
-- TABLES
-- =====================================================

-- Places table (venues/locations that can be booked)
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

-- Spaces table (individual bookable areas within places)
CREATE TABLE public.spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT spaces_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE
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

-- Blackout periods (when spaces/places are unavailable)
CREATE TABLE public.blackouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL,
    space_id UUID NULL, -- NULL means place-wide blackout
    reason TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_by TEXT DEFAULT auth.uid()::text,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT blackouts_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE,
    CONSTRAINT blackouts_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE,
    CONSTRAINT blackouts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT blackouts_valid_period CHECK (starts_at < ends_at)
);

-- Bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL,
    space_id UUID NOT NULL,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Generated column for exclusion constraint
    period tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
    
    CONSTRAINT bookings_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE,
    CONSTRAINT bookings_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE,
    CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT bookings_valid_period CHECK (starts_at < ends_at),
    CONSTRAINT bookings_space_place_match CHECK (
        EXISTS (SELECT 1 FROM public.spaces s WHERE s.id = space_id AND s.place_id = bookings.place_id)
    )
);

-- Exclusion constraint to prevent overlapping bookings
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_no_overlap 
EXCLUDE USING gist (space_id WITH =, period WITH &&) 
WHERE (status <> 'cancelled');

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_places_admin_user_id ON public.places(admin_user_id);
CREATE INDEX idx_places_active ON public.places(is_active) WHERE is_active = true;

CREATE INDEX idx_spaces_place_id ON public.spaces(place_id);
CREATE INDEX idx_spaces_active ON public.spaces(is_active) WHERE is_active = true;

CREATE INDEX idx_place_hours_place_id ON public.place_hours(place_id);
CREATE INDEX idx_place_hours_effective ON public.place_hours(effective_from, effective_to);

CREATE INDEX idx_blackouts_place_space ON public.blackouts(place_id, space_id);
CREATE INDEX idx_blackouts_period ON public.blackouts USING gist(tstzrange(starts_at, ends_at, '[)'));

CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_place_space ON public.bookings(place_id, space_id);
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
        RAISE EXCEPTION 'Booking is outside operating hours for this day';
    END IF;
    
    -- Check for blackout conflicts (space-specific takes precedence)
    SELECT EXISTS(
        SELECT 1 FROM public.blackouts b
        WHERE b.place_id = NEW.place_id
        AND (b.space_id IS NULL OR b.space_id = NEW.space_id)
        AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
    ) INTO blackout_conflict;
    
    IF blackout_conflict THEN
        RAISE EXCEPTION 'Booking conflicts with a blackout period';
    END IF;
    
    -- Ensure space belongs to place
    IF NOT EXISTS(
        SELECT 1 FROM public.spaces s 
        WHERE s.id = NEW.space_id 
        AND s.place_id = NEW.place_id 
        AND s.is_active = true
    ) THEN
        RAISE EXCEPTION 'Space does not belong to this place or is inactive';
    END IF;
    
    -- Ensure place is active
    IF NOT EXISTS(
        SELECT 1 FROM public.places p 
        WHERE p.id = NEW.place_id 
        AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'Place is inactive';
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

CREATE TRIGGER spaces_updated_at_trigger
    BEFORE UPDATE ON public.spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER bookings_updated_at_trigger
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Check if a space is available for booking
CREATE OR REPLACE FUNCTION public.is_space_available(
    p_place_id UUID,
    p_space_id UUID,
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ
)
RETURNS BOOLEAN
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
    space_active BOOLEAN;
    place_active BOOLEAN;
BEGIN
    -- Validate input
    IF p_starts_at >= p_ends_at THEN
        RETURN FALSE;
    END IF;
    
    -- Check if place is active
    SELECT is_active INTO place_active 
    FROM public.places 
    WHERE id = p_place_id;
    
    IF NOT place_active THEN
        RETURN FALSE;
    END IF;
    
    -- Check if space is active and belongs to place
    SELECT is_active INTO space_active
    FROM public.spaces 
    WHERE id = p_space_id AND place_id = p_place_id;
    
    IF NOT space_active THEN
        RETURN FALSE;
    END IF;
    
    -- Get place timezone
    SELECT timezone INTO place_tz 
    FROM public.places 
    WHERE id = p_place_id;
    
    -- Convert to place timezone for hours validation
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
        RETURN FALSE;
    END IF;
    
    -- Check for blackouts
    SELECT EXISTS(
        SELECT 1 FROM public.blackouts b
        WHERE b.place_id = p_place_id
        AND (b.space_id IS NULL OR b.space_id = p_space_id)
        AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
    ) INTO blackout_conflict;
    
    IF blackout_conflict THEN
        RETURN FALSE;
    END IF;
    
    -- Check for existing bookings
    SELECT EXISTS(
        SELECT 1 FROM public.bookings b
        WHERE b.space_id = p_space_id
        AND b.status <> 'cancelled'
        AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
    ) INTO booking_conflict;
    
    IF booking_conflict THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Get available time slots for a space on a given date
CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_place_id UUID,
    p_space_id UUID,
    p_date DATE,
    p_slot_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    place_tz TEXT;
    day_of_week INTEGER;
    open_time TIME;
    close_time TIME;
    current_slot TIMESTAMPTZ;
    slot_end_time TIMESTAMPTZ;
    date_with_tz TIMESTAMPTZ;
BEGIN
    -- Get place timezone and operating hours for the date
    SELECT p.timezone INTO place_tz
    FROM public.places p
    WHERE p.id = p_place_id AND p.is_active = true;
    
    IF place_tz IS NULL THEN
        RETURN;
    END IF;
    
    day_of_week := EXTRACT(dow FROM p_date);
    
    -- Get operating hours for this day
    SELECT ph.open_time, ph.close_time
    INTO open_time, close_time
    FROM public.place_hours ph
    WHERE ph.place_id = p_place_id
    AND ph.day_of_week = day_of_week
    AND ph.effective_from <= p_date
    AND (ph.effective_to IS NULL OR ph.effective_to >= p_date);
    
    IF open_time IS NULL THEN
        RETURN; -- No operating hours for this day
    END IF;
    
    -- Convert date to place timezone
    date_with_tz := (p_date || ' ' || open_time)::TIMESTAMP AT TIME ZONE place_tz;
    
    -- Generate time slots
    current_slot := date_with_tz;
    
    WHILE (current_slot + INTERVAL '1 minute' * p_slot_duration_minutes)::TIME <= close_time LOOP
        slot_end_time := current_slot + INTERVAL '1 minute' * p_slot_duration_minutes;
        
        -- Check if this slot is available
        IF public.is_space_available(p_place_id, p_space_id, current_slot, slot_end_time) THEN
            slot_start := current_slot;
            slot_end := slot_end_time;
            RETURN NEXT;
        END IF;
        
        current_slot := current_slot + INTERVAL '1 minute' * p_slot_duration_minutes;
    END LOOP;
    
    RETURN;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Places policies
CREATE POLICY "places_select_authenticated" ON public.places
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "places_insert_authenticated" ON public.places
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = admin_user_id);

CREATE POLICY "places_update_admin" ON public.places
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = admin_user_id)
    WITH CHECK (auth.uid()::text = admin_user_id);

CREATE POLICY "places_delete_admin" ON public.places
    FOR DELETE TO authenticated
    USING (auth.uid()::text = admin_user_id);

-- Spaces policies
CREATE POLICY "spaces_select_authenticated" ON public.spaces
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = spaces.place_id
    ));

CREATE POLICY "spaces_insert_place_admin" ON public.spaces
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
    ));

CREATE POLICY "spaces_update_place_admin" ON public.spaces
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
    ));

CREATE POLICY "spaces_delete_place_admin" ON public.spaces
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
    ));

-- Place hours policies
CREATE POLICY "place_hours_select_authenticated" ON public.place_hours
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = place_hours.place_id
    ));

CREATE POLICY "place_hours_write_place_admin" ON public.place_hours
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
    ));

-- Blackouts policies
CREATE POLICY "blackouts_select_authenticated" ON public.blackouts
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = blackouts.place_id
    ));

CREATE POLICY "blackouts_write_place_admin" ON public.blackouts
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.places p 
        WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
    ));

-- Bookings policies
CREATE POLICY "bookings_select_authenticated" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()::text OR 
        EXISTS (
            SELECT 1 FROM public.places p 
            WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
        )
    );

CREATE POLICY "bookings_insert_authenticated" ON public.bookings
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid()::text = user_id AND
        EXISTS (
            SELECT 1 FROM public.spaces s
            JOIN public.places p ON p.id = s.place_id
            WHERE s.id = space_id AND s.is_active = true AND p.is_active = true
        )
    );

CREATE POLICY "bookings_update_owner_or_admin" ON public.bookings
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()::text OR 
        EXISTS (
            SELECT 1 FROM public.places p 
            WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        user_id = auth.uid()::text OR 
        EXISTS (
            SELECT 1 FROM public.places p 
            WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
        )
    );

CREATE POLICY "bookings_delete_owner_or_admin" ON public.bookings
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()::text OR 
        EXISTS (
            SELECT 1 FROM public.places p 
            WHERE p.id = place_id AND p.admin_user_id = auth.uid()::text
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_space_available TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_slots TO authenticated;