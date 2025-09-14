
import { supabase } from './supabase';

export type Circle = {
  id: string;
  name: string;
  created_at: string;
  circle_profile_url?: string;
  description?: string;
  score: number;
};

export type CirclePref = {
  userid: string;
  circleid: string;
  status: 'not_interested' | 'snoozed';
  snooze_until?: string | null;
  reason?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Dismiss a circle permanently (mark as not interested)
 */
export async function dismissCircle(circleId: string, reason = 'dismissed') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_circle_prefs')
    .upsert({
      userid: user.id,
      circleid: circleId,
      status: 'not_interested' as const,
      reason,
      snooze_until: null,
    }, {
      onConflict: 'userid,circleid'
    })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Snooze a circle temporarily
 */
export async function snoozeCircle(circleId: string, days = 30) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const snoozeUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('user_circle_prefs')
    .upsert({
      userid: user.id,
      circleid: circleId,
      status: 'snoozed' as const,
      snooze_until: snoozeUntil,
      reason: 'snoozed',
    }, {
      onConflict: 'userid,circleid'
    })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Undo a preference (remove the preference row)
 */
export async function undoPreference(circleId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_circle_prefs')
    .delete()
    .eq('userid', user.id)
    .eq('circleid', circleId)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Fetch suggested circles using RPC function with fallback to view
 */
export async function fetchSuggestedCircles(): Promise<Circle[]> {
  try {
    console.log('🔍 Starting fetchSuggestedCircles...');
    
    // Try RPC function first
    console.log('🔍 Calling RPC function...');
    const { data, error } = await supabase.rpc('suggested_circles');
    
    if (error) {
      console.log('🔍 RPC failed, trying view fallback. Error:', error);
      // Fallback to view if RPC fails
      const viewResult = await supabase
        .from('v_suggested_circles')
        .select('*');
      
      console.log('🔍 View result:', { data: viewResult.data, error: viewResult.error });
      
      if (viewResult.error) throw viewResult.error;
      return viewResult.data || [];
    }
    
    console.log('🔍 RPC succeeded, data:', data);
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching suggested circles:', error);
    throw error;
  }
}

/**
 * Get user's circle preferences
 */
export async function getUserCirclePrefs(): Promise<CirclePref[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_circle_prefs')
    .select('*')
    .eq('userid', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
