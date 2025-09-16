/**
 * Bookings Service - Core booking management with validation and conflict detection
 */

import { supabase } from '../supabase';
import type { 
  Booking, 
  CreateBookingInput, 
  UpdateBookingInput,
  BookingFilter,
  AvailableSlot
} from '../../types/database';

/**
 * Check if a space is available for booking
 */
export async function checkSpaceAvailability(
  placeId: string,
  spaceId: string,
  startsAt: string,
  endsAt: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_space_available', {
    p_place_id: placeId,
    p_space_id: spaceId,
    p_starts_at: startsAt,
    p_ends_at: endsAt
  });

  if (error) {
    console.error('Error checking space availability:', error);
    return false;
  }
  
  return data || false;
}

/**
 * Get available time slots for a space
 */
export async function getAvailableSlots(
  placeId: string,
  spaceId: string,
  date: string,
  slotDurationMinutes: number = 60
): Promise<AvailableSlot[]> {
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_place_id: placeId,
    p_space_id: spaceId,
    p_date: date,
    p_slot_duration_minutes: slotDurationMinutes
  });

  if (error) {
    console.error('Error getting available slots:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Create a new booking with availability validation
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  // First check availability using RPC function
  const isAvailable = await checkSpaceAvailability(
    input.place_id,
    input.space_id,
    input.starts_at,
    input.ends_at
  );

  if (!isAvailable) {
    throw new Error('Space is not available for the selected time period');
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert(input)
    .select()
    .single();

  if (error) {
    // Handle database errors using error codes and message patterns for reliability
    
    // Exclusion constraint violation (overlapping bookings)
    if (error.code === '23P01' && error.message?.includes('bookings_no_overlap')) {
      throw new Error('This time slot is already booked by another user');
    }
    
    // Custom validation errors from our trigger
    if (error.message?.includes('BOOKING_OUTSIDE_HOURS:')) {
      throw new Error('Booking is outside the operating hours for this venue');
    }
    
    if (error.message?.includes('BOOKING_BLACKOUT_CONFLICT:')) {
      throw new Error('The selected time conflicts with a blackout period');
    }
    
    if (error.message?.includes('SPACE_INVALID:')) {
      throw new Error('Invalid space selection for this venue');
    }
    
    if (error.message?.includes('PLACE_INACTIVE:')) {
      throw new Error('This venue is currently inactive');
    }
    
    // Foreign key constraint violations  
    if (error.code === '23503') {
      if (error.message?.includes('user_id')) {
        throw new Error('Invalid user reference');
      }
      if (error.message?.includes('space_id') || error.message?.includes('place_id')) {
        throw new Error('Invalid venue or space selection');
      }
    }
    
    // Check constraint violations
    if (error.code === '23514') {
      if (error.message?.includes('valid_period')) {
        throw new Error('Start time must be before end time');
      }
      if (error.message?.includes('status')) {
        throw new Error('Invalid booking status');
      }
    }
    
    // Generic fallback
    throw error;
  }
  
  return data;
}

/**
 * Get a booking by ID
 */
export async function getBooking(id: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Get booking with related place and space information
 */
export async function getBookingWithDetails(id: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      place:places(*),
      space:spaces(*),
      user:users(id, name, email)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Get bookings with filtering options
 */
export async function getBookings(filter: BookingFilter = {}): Promise<Booking[]> {
  let query = supabase
    .from('bookings')
    .select('*')
    .order('starts_at', { ascending: true });

  if (filter.place_id) {
    query = query.eq('place_id', filter.place_id);
  }

  if (filter.space_id) {
    query = query.eq('space_id', filter.space_id);
  }

  if (filter.user_id) {
    query = query.eq('user_id', filter.user_id);
  }

  if (filter.status) {
    query = query.eq('status', filter.status);
  }

  if (filter.date_from) {
    query = query.gte('starts_at', filter.date_from);
  }

  if (filter.date_to) {
    query = query.lte('ends_at', filter.date_to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get user's bookings
 */
export async function getMyBookings(status?: string): Promise<Booking[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  return getBookings({
    user_id: user.id,
    status: status as any
  });
}

/**
 * Get bookings for a place (admin view)
 */
export async function getPlaceBookings(
  placeId: string, 
  filter: Omit<BookingFilter, 'place_id'> = {}
): Promise<Booking[]> {
  return getBookings({
    ...filter,
    place_id: placeId
  });
}

/**
 * Get upcoming bookings
 */
export async function getUpcomingBookings(
  filter: BookingFilter = {}
): Promise<Booking[]> {
  const now = new Date().toISOString();
  return getBookings({
    ...filter,
    date_from: now,
    status: 'confirmed'
  });
}

/**
 * Update a booking
 */
export async function updateBooking(
  id: string, 
  input: UpdateBookingInput
): Promise<Booking> {
  // If updating time, check availability
  if (input.starts_at || input.ends_at) {
    const existingBooking = await getBooking(id);
    if (!existingBooking) {
      throw new Error('Booking not found');
    }

    const newStartsAt = input.starts_at || existingBooking.starts_at;
    const newEndsAt = input.ends_at || existingBooking.ends_at;

    // Only check availability if time is actually changing
    if (newStartsAt !== existingBooking.starts_at || newEndsAt !== existingBooking.ends_at) {
      const isAvailable = await checkSpaceAvailability(
        existingBooking.place_id,
        existingBooking.space_id,
        newStartsAt,
        newEndsAt
      );

      if (!isAvailable) {
        throw new Error('Space is not available for the new time period');
      }
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel a booking
 */
export async function cancelBooking(id: string): Promise<Booking> {
  return updateBooking(id, { status: 'cancelled' });
}

/**
 * Confirm a pending booking
 */
export async function confirmBooking(id: string): Promise<Booking> {
  return updateBooking(id, { status: 'confirmed' });
}

/**
 * Delete a booking permanently
 */
export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Client-side availability check (for optimistic UX)
 * This mirrors the server-side logic for immediate feedback
 */
export async function clientSideAvailabilityCheck(
  placeId: string,
  spaceId: string,
  startsAt: string,
  endsAt: string
): Promise<{
  isAvailable: boolean;
  conflicts: {
    bookings: Booking[];
    blackouts: any[];
    outsideHours: boolean;
  };
}> {
  const conflicts = {
    bookings: [] as Booking[],
    blackouts: [] as any[],
    outsideHours: false
  };

  try {
    // Check for booking conflicts
    const { data: bookingConflicts } = await supabase
      .from('bookings')
      .select('*')
      .eq('space_id', spaceId)
      .neq('status', 'cancelled')
      .lt('starts_at', endsAt)
      .gt('ends_at', startsAt);

    conflicts.bookings = bookingConflicts || [];

    // Check for blackout conflicts
    const { data: blackoutConflicts } = await supabase
      .from('blackouts')
      .select('*')
      .eq('place_id', placeId)
      .or(`space_id.is.null,space_id.eq.${spaceId}`)
      .lt('starts_at', endsAt)
      .gt('ends_at', startsAt);

    conflicts.blackouts = blackoutConflicts || [];

    // For hours check, we'd need the place timezone and more complex logic
    // For now, we'll rely on the server-side RPC function for accuracy
    const isAvailable = await checkSpaceAvailability(placeId, spaceId, startsAt, endsAt);

    return {
      isAvailable,
      conflicts
    };
  } catch (error) {
    console.error('Error in client-side availability check:', error);
    return {
      isAvailable: false,
      conflicts
    };
  }
}

/**
 * Get booking analytics for a place
 */
export async function getBookingAnalytics(placeId: string, fromDate?: string, toDate?: string) {
  const filter: BookingFilter = { place_id: placeId };
  
  if (fromDate) filter.date_from = fromDate;
  if (toDate) filter.date_to = toDate;

  const bookings = await getBookings(filter);

  const analytics = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    bySpace: {} as Record<string, number>,
    byMonth: {} as Record<string, number>
  };

  // Group by space
  bookings.forEach(booking => {
    analytics.bySpace[booking.space_id] = (analytics.bySpace[booking.space_id] || 0) + 1;
  });

  // Group by month
  bookings.forEach(booking => {
    const month = booking.starts_at.substring(0, 7); // YYYY-MM
    analytics.byMonth[month] = (analytics.byMonth[month] || 0) + 1;
  });

  return analytics;
}