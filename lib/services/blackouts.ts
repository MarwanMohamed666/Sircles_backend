/**
 * Blackouts Service - Manage blackout periods for places and spaces
 */

import { supabase } from '../supabase';
import type { 
  Blackout, 
  CreateBlackoutInput 
} from '../../types/database';

/**
 * Create a new blackout period
 */
export async function createBlackout(input: CreateBlackoutInput): Promise<Blackout> {
  const { data, error } = await supabase
    .from('blackouts')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a blackout by ID
 */
export async function getBlackout(id: string): Promise<Blackout | null> {
  const { data, error } = await supabase
    .from('blackouts')
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
 * Get blackouts for a place
 */
export async function getBlackoutsByPlace(
  placeId: string, 
  options?: {
    spaceId?: string;
    fromDate?: string;
    toDate?: string;
    includeExpired?: boolean;
  }
): Promise<Blackout[]> {
  let query = supabase
    .from('blackouts')
    .select('*')
    .eq('place_id', placeId)
    .order('starts_at', { ascending: true });

  if (options?.spaceId) {
    query = query.or(`space_id.is.null,space_id.eq.${options.spaceId}`);
  }

  if (options?.fromDate) {
    query = query.gte('ends_at', options.fromDate);
  }

  if (options?.toDate) {
    query = query.lte('starts_at', options.toDate);
  }

  if (!options?.includeExpired) {
    const now = new Date().toISOString();
    query = query.gte('ends_at', now);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get blackouts for a specific space
 */
export async function getBlackoutsBySpace(
  spaceId: string,
  options?: {
    fromDate?: string;
    toDate?: string;
    includeExpired?: boolean;
  }
): Promise<Blackout[]> {
  // Get the space to find its place_id
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('place_id')
    .eq('id', spaceId)
    .single();

  if (spaceError) throw spaceError;

  return getBlackoutsByPlace(space.place_id, {
    ...options,
    spaceId
  });
}

/**
 * Check if there's a blackout conflict for a time period
 */
export async function checkBlackoutConflict(
  placeId: string,
  spaceId: string,
  startsAt: string,
  endsAt: string
): Promise<{ hasConflict: boolean; conflicts: Blackout[] }> {
  const { data, error } = await supabase
    .from('blackouts')
    .select('*')
    .eq('place_id', placeId)
    .or(`space_id.is.null,space_id.eq.${spaceId}`)
    .lt('starts_at', endsAt)
    .gt('ends_at', startsAt);

  if (error) throw error;

  return {
    hasConflict: (data || []).length > 0,
    conflicts: data || []
  };
}

/**
 * Update a blackout
 */
export async function updateBlackout(
  id: string, 
  input: Partial<CreateBlackoutInput>
): Promise<Blackout> {
  const { data, error } = await supabase
    .from('blackouts')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a blackout
 */
export async function deleteBlackout(id: string): Promise<void> {
  const { error } = await supabase
    .from('blackouts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Create a recurring blackout (e.g., every Sunday for maintenance)
 */
export async function createRecurringBlackout(
  input: CreateBlackoutInput & {
    recurrence: {
      type: 'daily' | 'weekly' | 'monthly';
      interval: number; // Every N days/weeks/months
      endDate: string; // When to stop creating blackouts
    };
  }
): Promise<Blackout[]> {
  const blackouts: CreateBlackoutInput[] = [];
  const start = new Date(input.starts_at);
  const end = new Date(input.ends_at);
  const endDate = new Date(input.recurrence.endDate);
  
  const duration = end.getTime() - start.getTime();
  
  let currentDate = new Date(start);
  
  while (currentDate <= endDate) {
    blackouts.push({
      place_id: input.place_id,
      space_id: input.space_id,
      reason: input.reason,
      starts_at: currentDate.toISOString(),
      ends_at: new Date(currentDate.getTime() + duration).toISOString()
    });
    
    // Calculate next occurrence
    switch (input.recurrence.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + input.recurrence.interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * input.recurrence.interval));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + input.recurrence.interval);
        break;
    }
  }

  const { data, error } = await supabase
    .from('blackouts')
    .insert(blackouts)
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Get upcoming blackouts (next 30 days)
 */
export async function getUpcomingBlackouts(placeId: string): Promise<Blackout[]> {
  const now = new Date().toISOString();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return getBlackoutsByPlace(placeId, {
    fromDate: now,
    toDate: thirtyDaysFromNow.toISOString()
  });
}