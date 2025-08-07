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
export const requestToJoinCircle = (userId: string, circleId: string, message?: string) => DatabaseService.requestToJoinCircle(userId, circleId, message);
export const getCircleJoinRequests = (circleId: string) => DatabaseService.getCircleJoinRequests(circleId);
export const handleJoinRequest = (requestId: string, action: 'accept' | 'reject') => DatabaseService.handleJoinRequest(requestId, action);
export const deleteCircle = (circleId: string, adminUserId: string) => DatabaseService.deleteCircle(circleId, adminUserId);
export const getCircleMembers = (circleId: string) => DatabaseService.getCircleMembers(circleId);
export const addCircleAdmin = (circleId: string, userId: string, requestingAdminId: string) => DatabaseService.addCircleAdmin(circleId, userId, requestingAdminId);
export const removeCircleAdmin = (circleId: string, userId: string, requestingAdminId: string) => DatabaseService.removeCircleAdmin(circleId, userId, requestingAdminId);
export const removeMemberFromCircle = (circleId: string, userId: string, adminId: string) => DatabaseService.removeMemberFromCircle(circleId, userId, adminId);
export const isCircleAdmin = (circleId: string, userId: string) => DatabaseService.isCircleAdmin(circleId, userId);
export const getHomePagePosts = (userId: string) => DatabaseService.getHomePagePosts(userId);
export const getCircleInterests = (circleId: string) => DatabaseService.getCircleInterests(circleId);
export const updateCircle = (circleId: string, updates: any, userId: string) => DatabaseService.updateCircle(circleId, updates, userId);
export const updateCircleInterests = (circleId: string, interestIds: string[], userId: string) => DatabaseService.updateCircleInterests(circleId, interestIds, userId);

// Add missing functions
export const getCirclesByUser = async (userId: string) => {
  try {
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: [], error: new Error('Authentication required') };
    }

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
      .update({ avatar_url: avatarUrl })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Circle operations
  async getCircles() {
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('Authentication required') };
    }

    const { data, error } = await supabase
      .from('circles')
      .select(`
        *,
        circle_interests(
          interests(
            id,
            title,
            category
          )
        )
      `)
      .order('creationdate', { ascending: false });
    return { data, error };
  },

  async getCircleInterests(circleId: string) {
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: [], error: new Error('Authentication required') };
    }

    const { data, error } = await supabase
      .from('circle_interests')
      .select(`
        interests(
          id,
          title,
          category
        )
      `)
      .eq('circleid', circleId);

    return { 
      data: data?.map(ci => ci.interests).filter(Boolean) || [], 
      error 
    };
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
    // Verify user exists and is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const circleId = crypto.randomUUID();
    const userId = currentUser.user.id;

    // Use auth.uid() directly as the creator ID and include the generated ID
    const newCircle = {
      id: circleId,
      ...circle,
      creator: userId,
      creationdate: new Date().toISOString(),
    };

    try {
      // 1. Insert into circles table with the generated ID
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .insert(newCircle)
        .select()
        .single();

      if (circleError) {
        console.error('Error creating circle:', circleError);
        return { data: null, error: circleError };
      }

      // 2. Add creator as admin in circle_admins using the created circle's ID
      const { error: adminError } = await supabase
        .from('circle_admins')
        .insert({
          circleid: circleData.id, // Use the ID from the created circle
          userid: userId
        });

      if (adminError) {
        console.error('Error adding admin:', adminError);
        // Rollback circle creation if admin creation fails
        await supabase.from('circles').delete().eq('id', circleData.id);
        return { data: null, error: adminError };
      }

      // 3. Add creator to user_circles (join the circle) using the created circle's ID
      const { error: joinError } = await supabase
        .from('user_circles')
        .insert({
          userid: userId,
          circleid: circleData.id // Use the ID from the created circle
        });

      if (joinError) {
        console.error('Error joining circle:', joinError);
        // Rollback previous operations
        await supabase.from('circle_admins').delete().eq('circleid', circleData.id);
        await supabase.from('circles').delete().eq('id', circleData.id);
        return { data: null, error: joinError };
      }

      return { data: circleData, error: null };
    } catch (error) {
      console.error('Error in createCircle transaction:', error);
      return { data: null, error: error as Error };
    }
  },

  async updateCircle(circleId: string, updates: {
    name?: string;
    description?: string;
    privacy?: 'public' | 'private';
    circle_profile_url?: string;
  }, userId: string) {
    try {
      // Verify user is authenticated
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { data: null, error: new Error('Authentication required') };
      }

      // Check if user is admin or creator
      const { data: adminCheck } = await supabase
        .from('circles')
        .select('creator')
        .eq('id', circleId)
        .single();

      if (!adminCheck) {
        return { data: null, error: new Error('Circle not found') };
      }

      const isCreator = adminCheck.creator === userId;

      if (!isCreator) {
        // Check if user is admin
        const { data: isAdmin } = await supabase
          .from('circle_admins')
          .select('userid')
          .eq('circleid', circleId)
          .eq('userid', userId)
          .single();

        if (!isAdmin) {
          return { data: null, error: new Error('You do not have permission to edit this circle') };
        }
      }

      const { data, error } = await supabase
        .from('circles')
        .update(updates)
        .eq('id', circleId)
        .select()
        .single();

      if (error) {
        console.error('Error updating circle:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateCircle:', error);
      return { data: null, error: error as Error };
    }
  },

  async updateCircleInterests(circleId: string, interestIds: string[], userId: string) {
    try {
      // Verify user is authenticated
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { data: null, error: new Error('Authentication required') };
      }

      // Check if user is admin or creator
      const { data: adminCheck } = await supabase
        .from('circles')
        .select('creator')
        .eq('id', circleId)
        .single();

      if (!adminCheck) {
        return { data: null, error: new Error('Circle not found') };
      }

      const isCreator = adminCheck.creator === userId;

      if (!isCreator) {
        // Check if user is admin
        const { data: isAdmin } = await supabase
          .from('circle_admins')
          .select('userid')
          .eq('circleid', circleId)
          .eq('userid', userId)
          .single();

        if (!isAdmin) {
          return { data: null, error: new Error('You do not have permission to edit circle interests') };
        }
      }

      // Get current interests
      const { data: currentInterests } = await supabase
        .from('circle_interests')
        .select('interestid')
        .eq('circleid', circleId);

      const currentInterestIds = currentInterests?.map(ci => ci.interestid) || [];

      // Find interests to add and remove
      const interestsToAdd = interestIds.filter(id => !currentInterestIds.includes(id));
      const interestsToRemove = currentInterestIds.filter(id => !interestIds.includes(id));

      // Remove old interests
      if (interestsToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('circle_interests')
          .delete()
          .eq('circleid', circleId)
          .in('interestid', interestsToRemove);

        if (removeError) {
          console.error('Error removing interests:', removeError);
          return { data: null, error: removeError };
        }
      }

      // Add new interests
      if (interestsToAdd.length > 0) {
        const newInterests = interestsToAdd.map(interestId => ({
          circleid: circleId,
          interestid: interestId
        }));

        const { error: addError } = await supabase
          .from('circle_interests')
          .insert(newInterests);

        if (addError) {
          console.error('Error adding interests:', addError);
          return { data: null, error: addError };
        }
      }

      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('Error in updateCircleInterests:', error);
      return { data: null, error: error as Error };
    }
  },

  // Event operations
  async getEvents() {
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('Authentication required') };
    }

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
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('Authentication required') };
    }

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
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('Authentication required') };
    }

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_userid_fkey(name, avatar_url),
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
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('Authentication required') };
    }

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
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('Authentication required') };
    }

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
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('Authentication required') };
    }

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
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('Authentication required') };
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userid', userId)
      .order('timestamp', { ascending: false });
    return { data, error };
  },

  async markNotificationAsRead(notificationId: string) {
    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return { data: null, error: new Error('Authentication required') };
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    return { data, error };
  },

  // Circle Management Functions
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

  async requestToJoinCircle(userId: string, circleId: string, message?: string) {
    try {
      // For now, since we don't have circle_join_requests table, we'll create a notification
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          id: crypto.randomUUID(),
          userid: circleId, // We'll need the circle admin's ID here
          type: 'join_request',
          content: `User wants to join circle: ${message || 'No message'}`,
          read: false,
          timestamp: new Date().toISOString(),
          linkeditemid: circleId,
          linkeditemtype: 'circle',
          creationdate: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating join request notification:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in requestToJoinCircle:', error);
      return { data: null, error: error as Error };
    }
  },

  async getCircleJoinRequests(circleId: string) {
    try {
      // For now, return empty array since we don't have a proper join requests table
      // This prevents the delete function from failing
      return { data: [], error: null };
    } catch (error) {
      console.error('Error in getCircleJoinRequests:', error);
      return { data: [], error: error as Error };
    }
  },

  async handleJoinRequest(requestId: string, action: 'accept' | 'reject') {
    try {
      // Mark notification as read
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', requestId);

      if (updateError) return { data: null, error: updateError };

      // For now, we'll just mark it as read since we don't have the user-circle connection
      // In a full implementation, you'd extract user ID from the notification content
      // and add them to the circle if accepted

      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('Error in handleJoinRequest:', error);
      return { data: null, error: error as Error };
    }
  },

  async deleteCircle(circleId: string, userId: string) {
    try {
      console.log('Starting delete process for circle:', circleId, 'by user:', userId);

      // Check if user is the creator
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .select('creator')
        .eq('id', circleId)
        .single();

      if (circleError) {
        console.error('Error fetching circle:', circleError);
        return { data: null, error: circleError };
      }

      if (circle?.creator !== userId) {
        return { data: null, error: { message: 'Only the circle creator can delete this circle' } };
      }

      // Delete the circle (cascade will handle related data due to foreign key constraints)
      const { error: deleteError } = await supabase
        .from('circles')
        .delete()
        .eq('id', circleId)
        .eq('creator', userId);

      if (deleteError) {
        console.error('Error deleting circle:', deleteError);
        return { data: null, error: deleteError };
      }

      console.log('Circle deleted successfully');
      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('Error in deleteCircle:', error);
      return { data: null, error: error as Error };
    }
  },

  async getCircleMembers(circleId: string) {
    try {
      const { data, error } = await supabase
        .from('user_circles')
        .select(`
          userid,
          users!inner(id, name, avatar_url)
        `)
        .eq('circleid', circleId);

      if (error) {
        console.error('Error fetching circle members:', error);
        return { data: [], error };
      }

      if (!data || data.length === 0) {
        return { data: [], error: null };
      }

      // Get admin status for each member
      const userIds = data.map(member => member.userid);
      const { data: adminData } = await supabase
        .from('circle_admins')
        .select('userid')
        .eq('circleid', circleId)
        .in('userid', userIds);

      const adminUserIds = new Set(adminData?.map(admin => admin.userid) || []);

      return { 
        data: data.map(member => ({
          id: member.users.id,
          name: member.users.name,
          avatar_url: member.users.avatar_url,
          isAdmin: adminUserIds.has(member.userid)
        })), 
        error: null 
      };
    } catch (error) {
      console.error('Error in getCircleMembers:', error);
      return { data: [], error: error as Error };
    }
  },

  async addCircleAdmin(circleId: string, userId: string, requestingAdminId: string) {
    try {
      // Get circle creator
      const { data: circle } = await supabase
        .from('circles')
        .select('creator')
        .eq('id', circleId)
        .single();

      // Verify requesting user is the main admin (creator)
      if (circle?.creator !== requestingAdminId) {
        return { data: null, error: new Error('Only the circle creator can manage admin privileges') };
      }

      const { data, error } = await supabase
        .from('circle_admins')
        .insert({
          circleid: circleId,
          userid: userId
        });

      return { data, error };
    } catch (error) {
      console.error('Error in addCircleAdmin:', error);
      return { data: null, error: error as Error };
    }
  },

  async removeCircleAdmin(circleId: string, userId: string, requestingAdminId: string) {
    try {
      // Get circle creator
      const { data: circle } = await supabase
        .from('circles')
        .select('creator')
        .eq('id', circleId)
        .single();

      // Cannot remove the main admin (creator)
      if (circle?.creator === userId) {
        return { data: null, error: new Error('Cannot remove the main admin') };
      }

      // Verify requesting user is the main admin (creator)
      if (circle?.creator !== requestingAdminId) {
        return { data: null, error: new Error('Only the circle creator can manage admin privileges') };
      }

      const { data, error } = await supabase
        .from('circle_admins')
        .delete()
        .eq('circleid', circleId)
        .eq('userid', userId);

      return { data, error };
    } catch (error) {
      console.error('Error in removeCircleAdmin:', error);
      return { data: null, error: error as Error };
    }
  },

  async removeMemberFromCircle(circleId: string, userId: string, adminId: string) {
    try {
      // Verify admin permissions
      const { data: adminCheck } = await supabase
        .from('circle_admins')
        .select('userid')
        .eq('circleid', circleId)
        .eq('userid', adminId)
        .single();

      if (!adminCheck) {
        return { data: null, error: new Error('You do not have admin permissions') };
      }

      // Remove from circle
      const { data, error } = await supabase
        .from('user_circles')
        .delete()
        .eq('circleid', circleId)
        .eq('userid', userId);

      // Also remove admin status if they had it
      await supabase
        .from('circle_admins')
        .delete()
        .eq('circleid', circleId)
        .eq('userid', userId);

      return { data, error };
    } catch (error) {
      console.error('Error in removeMemberFromCircle:', error);
      return { data: null, error: error as Error };
    }
  },

  async isCircleAdmin(circleId: string, userId: string) {
    try {
      // Check if user is the creator
      const { data: circle } = await supabase
        .from('circles')
        .select('creator')
        .eq('id', circleId)
        .single();

      const isCreator = circle?.creator === userId;
      if (isCreator) return { data: { isAdmin: true, isMainAdmin: true, isCreator: true }, error: null };

      // Check if user is in circle_admins
      const { data: admin } = await supabase
        .from('circle_admins')
        .select('userid')
        .eq('circleid', circleId)
        .eq('userid', userId)
        .single();

      const isAdmin = !!admin;
      return { data: { isAdmin, isMainAdmin: false, isCreator: false }, error: null };
    } catch (error) {
      console.error('Error in isCircleAdmin:', error);
      return { data: { isAdmin: false, isMainAdmin: false, isCreator: false }, error: error as Error };
    }
  },

  async getHomePagePosts(userId: string) {
    try {
      // First get the user's joined circles
      const { data: userCircles, error: circlesError } = await supabase
        .from('user_circles')
        .select('circleid')
        .eq('userid', userId);

      if (circlesError) {
        console.error('Error fetching user circles:', circlesError);
        return { data: [], error: circlesError };
      }

      if (!userCircles || userCircles.length === 0) {
        return { data: [], error: null };
      }

      const circleIds = userCircles.map(uc => uc.circleid);

      // Then get posts from those circles
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:users!posts_userid_fkey(name, avatar_url),
          circle:circles!posts_circleid_fkey(name),
          likes:post_likes(userid),
          comments(count)
        `)
        .in('circleid', circleIds)
        .order('creationdate', { ascending: false });

      return { data: data || [], error };
    } catch (error) {
      console.error('Error in getHomePagePosts:', error);
      return { data: [], error: error as Error };
    }
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
          users:senderid(name, avatar_url)
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