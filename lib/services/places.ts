/**
 * Places Service - CRUD operations for places/venues
 */

import { supabase } from '../supabase';
import type { 
  Place, 
  CreatePlaceInput, 
  UpdatePlaceInput 
} from '../../types/database';

/**
 * Create a new place
 */
export async function createPlace(input: CreatePlaceInput): Promise<Place> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('places')
    .insert({
      ...input,
      admin_user_id: user.id,
      timezone: input.timezone || 'UTC'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a place by ID
 */
export async function getPlace(id: string): Promise<Place | null> {
  const { data, error } = await supabase
    .from('places')
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
 * Get all places (optionally filter by admin)
 */
export async function getPlaces(adminUserId?: string): Promise<Place[]> {
  let query = supabase
    .from('places')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (adminUserId) {
    query = query.eq('admin_user_id', adminUserId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get places managed by current user
 */
export async function getMyPlaces(): Promise<Place[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  return getPlaces(user.id);
}

/**
 * Update a place
 */
export async function updatePlace(id: string, input: UpdatePlaceInput): Promise<Place> {
  const { data, error } = await supabase
    .from('places')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a place (soft delete by setting is_active = false)
 */
export async function deletePlace(id: string): Promise<void> {
  const { error } = await supabase
    .from('places')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Permanently delete a place (hard delete)
 */
export async function permanentlyDeletePlace(id: string): Promise<void> {
  const { error } = await supabase
    .from('places')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Check if user is admin of a place
 */
export async function isPlaceAdmin(placeId: string, userId?: string): Promise<boolean> {
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    userId = user.id;
  }

  const { data, error } = await supabase
    .from('places')
    .select('admin_user_id')
    .eq('id', placeId)
    .single();

  if (error) return false;
  return data.admin_user_id === userId;
}