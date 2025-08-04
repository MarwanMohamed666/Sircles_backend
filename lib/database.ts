
import { supabase } from './supabase';
import type { User, Circle, Event, Post, Interest } from '@/types/database';

// Export individual functions for easier importing
export const getUser = (id: string) => DatabaseService.getUser(id);
export const updateUser = (id: string, updates: Partial<User>) => DatabaseService.updateUser(id, updates);
export const getCircles = () => DatabaseService.getCircles();
export const getUserCircles = (userId: string) => DatabaseService.getUserCircles(userId);
export const createCircle = (circle: Omit<Circle, 'id' | 'creationdate'>) => DatabaseService.createCircle(circle);
export const getEvents = () => DatabaseService.getEvents();
export const createEvent = (event: Omit<Event, 'id' | 'creationdate'>) => DatabaseService.createEvent(event);
export const getPosts = (circleId?: string) => DatabaseService.getPosts(circleId);
export const createPost = (post: Omit<Post, 'id' | 'creationdate'>) => DatabaseService.createPost(post);
export const getInterests = () => DatabaseService.getInterests();
export const getUserInterests = (userId: string) => DatabaseService.getUserInterests(userId);
export const getInterestsByCategory = () => DatabaseService.getInterestsByCategory();
export const getUserNotifications = (userId: string) => DatabaseService.getUserNotifications(userId);
export const markNotificationAsRead = (notificationId: string) => DatabaseService.markNotificationAsRead(notificationId);
export const joinCircle = (userId: string, circleId: string) => DatabaseService.joinCircle(userId, circleId);
export const leaveCircle = (userId: string, circleId: string) => DatabaseService.leaveCircle(userId, circleId);
export const getUserJoinedCircles = (userId: string) => DatabaseService.getUserJoinedCircles(userId);
export const getCircleMessages = (circleId: string) => DatabaseService.getCircleMessages(circleId);
export const sendMessage = (message: any) => DatabaseService.sendMessage(message);

// Add missing functions
export const getCirclesByUser = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_circles')
      .select(`
        circleid,
        circles!inner(
          id,
          name,
          description
        )
      `)
      .eq('userid', userId);
    
    if (error) {
      // Handle RLS policy errors
      if (error.code === 'PGRST001' || error.code === '42501') {
        console.log('RLS policy prevented access to user circles');
        return { data: [], error: null }; // Return empty array instead of error
      }
      return { data: null, error };
    }
    
    return { 
      data: data?.map(uc => ({
        circleId: uc.circleid,
        circles: uc.circles
      })) || [], 
      error: null 
    };
  } catch (error) {
    console.error('Error in getCirclesByUser:', error);
    return { data: [], error: null };
  }
};

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

  async updateUserAvatar(id: string, avatarUrl: string) {
    const { data, error } = await supabase
      .from('users')
      .update({ avatar: avatarUrl })
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
    try {
      const { data, error } = await supabase
        .from('user_circles')
        .select(`
          circleid,
          circles (*)
        `)
        .eq('userid', userId);
      
      if (error) {
        // Handle RLS policy errors
        if (error.code === 'PGRST001' || error.code === '42501') {
          console.log('RLS policy prevented access to user circles');
          return { data: [], error: null };
        }
        return { data: null, error };
      }
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getUserCircles:', error);
      return { data: [], error: null };
    }
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
      .select('id, title, category')
      .order('category, title');
    return { data, error };
  },

  async getUserInterests(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_interests')
        .select(`
          interestid,
          interests (id, title, category)
        `)
        .eq('userid', userId);
      
      if (error) {
        // Handle RLS policy errors
        if (error.code === 'PGRST001' || error.code === '42501') {
          console.log('RLS policy prevented access to user interests');
          return { data: [], error: null };
        }
        return { data: null, error };
      }
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getUserInterests:', error);
      return { data: [], error: null };
    }
  },

  async getInterestsByCategory() {
    const { data, error } = await supabase
      .from('interests')
      .select('id, title, category')
      .order('category, title');
    
    if (error) return { data: null, error };
    
    // Group interests by category
    const groupedInterests: { [key: string]: any[] } = {};
    data?.forEach(interest => {
      const category = interest.category || 'Other';
      if (!groupedInterests[category]) {
        groupedInterests[category] = [];
      }
      groupedInterests[category].push(interest);
    });
    
    return { data: groupedInterests, error: null };
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
    try {
      const { data, error } = await supabase
        .from('user_circles')
        .insert({ userid: userId, circleid: circleId });
      
      if (error) {
        // Handle RLS policy errors
        if (error.code === 'PGRST001' || error.code === '42501') {
          return { data: null, error: new Error('You do not have permission to join this circle') };
        }
        // Handle duplicate entry
        if (error.code === '23505') {
          return { data: null, error: new Error('You are already a member of this circle') };
        }
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error in joinCircle:', error);
      return { data: null, error: error as Error };
    }
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
    try {
      const { data, error } = await supabase
        .from('circle_messages')
        .select(`
          *,
          users:senderid(name, avatar)
        `)
        .eq('circleid', circleId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        // Handle RLS policy errors
        if (error.code === 'PGRST001' || error.code === '42501') {
          console.log('RLS policy prevented access to circle messages');
          return { data: [], error: null }; // Return empty array for non-members
        }
        return { data: null, error };
      }
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getCircleMessages:', error);
      return { data: [], error: null };
    }
  },

  async sendMessage(message: {
    circleId: string;
    senderId: string;
    content: string;  
    type: string;
    attachment?: string;
  }) {
    try {
      const newMessage = {
        id: crypto.randomUUID(),
        circleid: message.circleId,
        senderid: message.senderId,
        content: message.content,
        type: message.type,
        attachment: message.attachment,
        timestamp: new Date().toISOString(),
        creationdate: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('circle_messages')
        .insert(newMessage)
        .select()
        .single();
      
      if (error) {
        // Handle RLS policy errors
        if (error.code === 'PGRST001' || error.code === '42501') {
          return { data: null, error: new Error('You do not have permission to send messages in this circle') };
        }
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return { data: null, error: error as Error };
    }
  },
};
