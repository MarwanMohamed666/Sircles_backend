
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
      .order('creationdate', { ascending: false });
    return { data, error };
  },

  async getUserCircles(userId: string) {
    const { data, error } = await supabase
      .from('user_circles')
      .select(`
        circleid,
        circles (*)
      `)
      .eq('userid', userId);
    return { data, error };
  },

  async createCircle(circle: Omit<Circle, 'id' | 'creationdate'>) {
    const newCircle = {
      id: crypto.randomUUID(),
      ...circle,
      creationdate: new Date().toISOString(),
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
        creator:users!events_createdby_fkey(name),
        circle:circles!events_circleid_fkey(name)
      `)
      .order('date', { ascending: true });
    return { data, error };
  },

  async createEvent(event: Omit<Event, 'id' | 'creationdate'>) {
    const newEvent = {
      id: crypto.randomUUID(),
      ...event,
      creationdate: new Date().toISOString(),
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
        author:users!posts_userid_fkey(name, avatar),
        circle:circles!posts_circleid_fkey(name),
        likes:post_likes(userid),
        comments(count)
      `)
      .order('creationdate', { ascending: false });
    
    if (circleId) {
      query = query.eq('circleid', circleId);
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  async createPost(post: Omit<Post, 'id' | 'creationdate'>) {
    const newPost = {
      id: crypto.randomUUID(),
      ...post,
      creationdate: new Date().toISOString(),
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
        interestid,
        interests (*)
      `)
      .eq('userid', userId);
    return { data, error };
  },

  // Notification operations
  async getUserNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userid', userId)
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

  // Additional helper functions
  async joinCircle(userId: string, circleId: string) {
    const { data, error } = await supabase
      .from('user_circles')
      .insert({ userid: userId, circleid: circleId });
    return { data, error };
  },

  async leaveCircle(userId: string, circleId: string) {
    const { data, error } = await supabase
      .from('user_circles')
      .delete()
      .eq('userid', userId)
      .eq('circleid', circleId);
    return { data, error };
  },

  async getUserJoinedCircles(userId: string) {
    const { data, error } = await supabase
      .from('user_circles')
      .select('circleid')
      .eq('userid', userId);
    return { data, error };
  },

  // Messages operations
  async getCircleMessages(circleId: string) {
    const { data, error } = await supabase
      .from('circle_messages')
      .select(`
        *,
        sender:users!circle_messages_senderid_fkey(name, avatar)
      `)
      .eq('circleid', circleId)
      .order('timestamp', { ascending: true });
    return { data, error };
  },

  async sendMessage(message: {
    circleid: string;
    senderid: string;
    content: string;
    type: string;
    attachment?: string;
  }) {
    const newMessage = {
      id: crypto.randomUUID(),
      ...message,
      timestamp: new Date().toISOString(),
      creationdate: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('circle_messages')
      .insert(newMessage)
      .select()
      .single();
    return { data, error };
  },
};
