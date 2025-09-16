/**
 * Place Hours Service - Manage operating hours for places
 */

import { supabase } from '../supabase';
import type { 
  PlaceHours, 
  CreatePlaceHoursInput 
} from '../../types/database';

/**
 * Create or update place hours
 */
export async function upsertPlaceHours(input: CreatePlaceHoursInput): Promise<PlaceHours> {
  const { data, error } = await supabase
    .from('place_hours')
    .upsert(input, {
      onConflict: 'place_id,day_of_week,effective_from',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Bulk upsert place hours for all days of the week
 */
export async function upsertPlaceHoursBulk(
  placeId: string, 
  hours: Omit<CreatePlaceHoursInput, 'place_id'>[]
): Promise<PlaceHours[]> {
  const hoursWithPlaceId = hours.map(hour => ({
    ...hour,
    place_id: placeId
  }));

  const { data, error } = await supabase
    .from('place_hours')
    .upsert(hoursWithPlaceId, {
      onConflict: 'place_id,day_of_week,effective_from',
      ignoreDuplicates: false
    })
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Get place hours for a specific place
 */
export async function getPlaceHours(placeId: string, effectiveDate?: string): Promise<PlaceHours[]> {
  let query = supabase
    .from('place_hours')
    .select('*')
    .eq('place_id', placeId)
    .order('day_of_week', { ascending: true })
    .order('effective_from', { ascending: false });

  if (effectiveDate) {
    query = query
      .lte('effective_from', effectiveDate)
      .or(`effective_to.is.null,effective_to.gte.${effectiveDate}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get current active hours for a place
 */
export async function getCurrentPlaceHours(placeId: string): Promise<PlaceHours[]> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  return getPlaceHours(placeId, today);
}

/**
 * Get hours for a specific day of the week
 */
export async function getPlaceHoursForDay(
  placeId: string, 
  dayOfWeek: number, 
  effectiveDate?: string
): Promise<PlaceHours | null> {
  const date = effectiveDate || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('place_hours')
    .select('*')
    .eq('place_id', placeId)
    .eq('day_of_week', dayOfWeek)
    .lte('effective_from', date)
    .or(`effective_to.is.null,effective_to.gte.${date}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Delete place hours
 */
export async function deletePlaceHours(id: string): Promise<void> {
  const { error } = await supabase
    .from('place_hours')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Delete all hours for a place
 */
export async function deleteAllPlaceHours(placeId: string): Promise<void> {
  const { error } = await supabase
    .from('place_hours')
    .delete()
    .eq('place_id', placeId);

  if (error) throw error;
}

/**
 * Check if a place is open at a specific time
 */
export async function isPlaceOpen(
  placeId: string, 
  dateTime: string
): Promise<boolean> {
  const date = new Date(dateTime);
  const dayOfWeek = date.getDay();
  const time = date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
  const dateStr = date.toISOString().split('T')[0];

  const hours = await getPlaceHoursForDay(placeId, dayOfWeek, dateStr);
  
  if (!hours) return false;
  
  return time >= hours.open_time && time <= hours.close_time;
}

/**
 * Utility: Generate standard business hours (9 AM - 5 PM, Monday-Friday)
 */
export function generateStandardBusinessHours(): Omit<CreatePlaceHoursInput, 'place_id'>[] {
  const businessDays = [1, 2, 3, 4, 5]; // Monday to Friday
  return businessDays.map(day => ({
    day_of_week: day,
    open_time: '09:00',
    close_time: '17:00'
  }));
}

/**
 * Utility: Generate 24/7 hours
 */
export function generate24SevenHours(): Omit<CreatePlaceHoursInput, 'place_id'>[] {
  const allDays = [0, 1, 2, 3, 4, 5, 6]; // All days
  return allDays.map(day => ({
    day_of_week: day,
    open_time: '00:00',
    close_time: '23:59'
  }));
}