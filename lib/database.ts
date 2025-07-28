
import { supabase } from './supabase';
import type { User, Circle, Event, Post, Interest } from '@/types/database';

export const DatabaseService = {
  // User operations
  async getUser(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async updateUser(id: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Circle operations
  async getCircles() {
    const { data, error } = await supabase
      .from('circles')
      .select('*')
      .order('creationDate', { ascending: false });
    return { data, error };
  },

  async getUserCircles(userId: string) {
    const { data, error } = await supabase
      .from('user_circles')
      .select(`
        circleId,
        circles (*)
      `)
      .eq('userId', userId);
    return { data, error };
  },

  async createCircle(circle: Omit<Circle, 'id' | 'creationDate'>) {
    const newCircle = {
      id: crypto.randomUUID(),
      ...circle,
      creationDate: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('circles')
      .insert(newCircle)
      .select()
      .single();
    return { data, error };
  },

  // Event operations
  async getEvents() {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:users!createdBy(name),
        circle:circles(name)
      `)
      .order('date', { ascending: true });
    return { data, error };
  },

  async createEvent(event: Omit<Event, 'id' | 'creationDate'>) {
    const newEvent = {
      id: crypto.randomUUID(),
      ...event,
      creationDate: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('events')
      .insert(newEvent)
      .select()
      .single();
    return { data, error };
  },

  // Post operations
  async getPosts(circleId?: string) {
    let query = supabase
      .from('posts')
      .select(`
        *,
        author:users!userId(name, avatar),
        circle:circles(name),
        likes:post_likes(userId),
        comments(count)
      `)
      .order('createdAt', { ascending: false });
    
    if (circleId) {
      query = query.eq('circleId', circleId);
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  async createPost(post: Omit<Post, 'id' | 'creationDate'>) {
    const newPost = {
      id: crypto.randomUUID(),
      ...post,
      createdAt: new Date().toISOString(),
      creationDate: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('posts')
      .insert(newPost)
      .select()
      .single();
    return { data, error };
  },

  // Interest operations
  async getInterests() {
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .order('title');
    return { data, error };
  },

  async getUserInterests(userId: string) {
    const { data, error } = await supabase
      .from('user_interests')
      .select(`
        interestId,
        interests (*)
      `)
      .eq('userId', userId);
    return { data, error };
  },

  // Notification operations
  async getUserNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', userId)
      .order('timestamp', { ascending: false });
    return { data, error };
  },

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    return { data, error };
  },
};
