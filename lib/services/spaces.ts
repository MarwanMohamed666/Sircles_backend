/**
 * Spaces Service - CRUD operations for spaces within places
 */

import { supabase } from '../supabase';
import type { 
  Space, 
  CreateSpaceInput, 
  UpdateSpaceInput 
} from '../../types/database';

/**
 * Create a new space
 */
export async function createSpace(input: CreateSpaceInput): Promise<Space> {
  const { data, error } = await supabase
    .from('spaces')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a space by ID
 */
export async function getSpace(id: string): Promise<Space | null> {
  const { data, error } = await supabase
    .from('spaces')
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
 * Get all spaces for a place
 */
export async function getSpacesByPlace(placeId: string): Promise<Space[]> {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('place_id', placeId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get space with place information
 */
export async function getSpaceWithPlace(id: string) {
  const { data, error } = await supabase
    .from('spaces')
    .select(`
      *,
      place:places(*)
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
 * Update a space
 */
export async function updateSpace(id: string, input: UpdateSpaceInput): Promise<Space> {
  const { data, error } = await supabase
    .from('spaces')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a space (soft delete)
 */
export async function deleteSpace(id: string): Promise<void> {
  const { error } = await supabase
    .from('spaces')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Permanently delete a space
 */
export async function permanentlyDeleteSpace(id: string): Promise<void> {
  const { error } = await supabase
    .from('spaces')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Search spaces by name
 */
export async function searchSpaces(query: string, placeId?: string): Promise<Space[]> {
  let supabaseQuery = supabase
    .from('spaces')
    .select('*')
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });

  if (placeId) {
    supabaseQuery = supabaseQuery.eq('place_id', placeId);
  }

  const { data, error } = await supabaseQuery;
  if (error) throw error;
  return data || [];
}