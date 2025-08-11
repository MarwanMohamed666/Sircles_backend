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
export const getUserPendingRequest = (circleId: string, userId: string) => DatabaseService.getUserPendingRequest(circleId, userId);
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
      createdby: userId, // Also set createdby for consistency
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
      // First check if the circle is private
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .select('privacy')
        .eq('id', circleId)
        .single();

      if (circleError) {
        return { data: null, error: new Error('Circle not found') };
      }

      // If circle is private, user should request to join instead
      if (circle.privacy === 'private') {
        return { data: null, error: new Error('This is a private circle. Please request to join instead.') };
      }

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
      // Verify user is authenticated
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { data: null, error: new Error('Authentication required') };
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('user_circles')
        .select('userid')
        .eq('userid', userId)
        .eq('circleid', circleId)
        .single();

      if (existingMember) {
        return { data: null, error: new Error('You are already a member of this circle') };
      }

      // Check if user already has a pending request
      const { data: existingRequest } = await supabase
        .from('circle_join_requests')
        .select('id, status')
        .eq('userid', userId)
        .eq('circleid', circleId)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return { data: null, error: new Error('You already have a pending request for this circle') };
        } else if (existingRequest.status === 'rejected') {
          // Update the existing rejected request to pending with new message
          const { data, error } = await supabase
            .from('circle_join_requests')
            .update({
              message: message || '',
              status: 'pending',
              created_at: new Date().toISOString()
            })
            .eq('id', existingRequest.id)
            .select()
            .single();

          return { data, error };
        }
      }

      // Create new join request
      const { data, error } = await supabase
        .from('circle_join_requests')
        .insert({
          id: crypto.randomUUID(),
          userid: userId,
          circleid: circleId,
          message: message || '',
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating join request:', error);
        return { data: null, error };
      }

      // Try to create notification for circle admins (don't fail if this fails)
      try {
        // Get circle admins and creator
        const { data: circle } = await supabase
          .from('circles')
          .select('creator, name')
          .eq('id', circleId)
          .single();

        if (circle) {
          const { data: admins } = await supabase
            .from('circle_admins')
            .select('userid')
            .eq('circleid', circleId);

          // Create notification for creator
          await supabase
            .from('notifications')
            .insert({
              id: crypto.randomUUID(),
              userid: circle.creator,
              type: 'join_request',
              title: 'New Join Request',
              message: `Someone requested to join "${circle.name}"`,
              read: false,
              timestamp: new Date().toISOString()
            });

          // Create notifications for admins (excluding creator)
          if (admins) {
            for (const admin of admins) {
              if (admin.userid !== circle.creator) {
                await supabase
                  .from('notifications')
                  .insert({
                    id: crypto.randomUUID(),
                    userid: admin.userid,
                    type: 'join_request',
                    title: 'New Join Request',
                    message: `Someone requested to join "${circle.name}"`,
                    read: false,
                    timestamp: new Date().toISOString()
                  });
              }
            }
          }
        }
      } catch (notificationError) {
        console.error('Error creating join request notification:', notificationError);
        // Don't fail the join request if notification creation fails
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in requestToJoinCircle:', error);
      return { data: null, error: error as Error };
    }
  },

  async getCircleJoinRequests(circleId: string) {
    try {
      // Verify user is authenticated
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { data: [], error: new Error('Authentication required') };
      }

      const { data, error } = await supabase
        .from('circle_join_requests')
        .select(`
          *,
          users!circle_join_requests_userid_fkey(
            id,
            name,
            avatar_url
          )
        `)
        .eq('circleid', circleId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching join requests:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getCircleJoinRequests:', error);
      return { data: [], error: error as Error };
    }
  },

  async getUserPendingRequest(circleId: string, userId: string) {
    try {
      // Verify user is authenticated
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user || currentUser.user.id !== userId) {
        return { data: null, error: new Error('Authentication required') };
      }

      console.log('Checking for pending request:', { circleId, userId });

      // Use .maybeSingle() instead of .single() to handle cases where no rows exist
      const { data, error } = await supabase
        .from('circle_join_requests')
        .select('*')
        .eq('circleid', circleId)
        .eq('userid', userId)
        .eq('status', 'pending')
        .maybeSingle();

      console.log('Pending request query result:', { 
        hasData: !!data, 
        hasError: !!error, 
        errorCode: error?.code,
        errorMessage: error?.message 
      });

      if (error) {
        console.error('Error checking pending request:', error);
        return { data: null, error };
      }

      const hasPending = !!data;
      console.log('Final pending status:', hasPending);
      return { data: data, error: null };
    } catch (error) {
      console.error('Error in getUserPendingRequest:', error);
      return { data: null, error: error as Error };
    }
  },

  async handleJoinRequest(requestId: string, action: 'accept' | 'reject') {
    try {
      // Verify user is authenticated
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { data: null, error: new Error('Authentication required') };
      }

      // Get the join request details
      const { data: request, error: requestError } = await supabase
        .from('circle_join_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        return { data: null, error: new Error('Join request not found') };
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('circle_join_requests')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', requestId);

      if (updateError) {
        return { data: null, error: updateError };
      }

      // If accepted, add user to circle
      if (action === 'accept') {
        const { error: joinError } = await supabase
          .from('user_circles')
          .insert({
            userid: request.userid,
            circleid: request.circleid
          });

        if (joinError) {
          // Rollback request status update
          await supabase
            .from('circle_join_requests')
            .update({ status: 'pending' })
            .eq('id', requestId);
          
          return { data: null, error: new Error('Failed to add user to circle') };
        }
      }

      return { data: { success: true, action }, error: null };
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
    console.log('🔵 DATABASE FUNCTION ENTRY: addCircleAdmin called');
    console.log('🔵 IMMEDIATE ENTRY LOG - Function definitely started');
    try {
      console.log('=== DATABASE: addCircleAdmin function started ===');
      console.log('INPUT Parameters:', { 
        circleId: circleId || 'undefined', 
        userId: userId || 'undefined', 
        requestingAdminId: requestingAdminId || 'undefined' 
      });

      // Validate inputs
      if (!circleId) {
        console.error('VALIDATION ERROR: circleId is required');
        return { data: null, error: new Error('Circle ID is required') };
      }
      if (!userId) {
        console.error('VALIDATION ERROR: userId is required');
        return { data: null, error: new Error('User ID is required') };
      }
      if (!requestingAdminId) {
        console.error('VALIDATION ERROR: requestingAdminId is required');
        return { data: null, error: new Error('Requesting admin ID is required') };
      }

      console.log('INPUT VALIDATION: All parameters are valid');

      // Get circle creator
      console.log('STEP 1: Fetching circle creator...');
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .select('creator')
        .eq('id', circleId)
        .single();

      console.log('STEP 1 RESULT:', { 
        hasCircleData: !!circle, 
        creator: circle?.creator, 
        hasError: !!circleError,
        errorMessage: circleError?.message,
        errorCode: circleError?.code
      });

      if (circleError) {
        console.error('STEP 1 FAILED: Error fetching circle:', circleError);
        return { data: null, error: new Error(`Failed to fetch circle: ${circleError.message}`) };
      }

      if (!circle) {
        console.error('STEP 1 FAILED: Circle not found');
        return { data: null, error: new Error('Circle not found') };
      }

      // Verify requesting user is the main admin (creator) OR a regular admin
      const isCreator = circle.creator === requestingAdminId;
      console.log('STEP 2: Permission check - isCreator:', isCreator);
      console.log('STEP 2: Creator comparison:', { 
        circleCreator: circle.creator, 
        requestingAdminId: requestingAdminId,
        areEqual: circle.creator === requestingAdminId
      });
      
      if (!isCreator) {
        // Check if requesting user is at least an admin
        console.log('STEP 2A: User is not creator, checking admin status...');
        const { data: adminCheck, error: adminError } = await supabase
          .from('circle_admins')
          .select('userid')
          .eq('circleid', circleId)
          .eq('userid', requestingAdminId)
          .single();

        console.log('STEP 2A RESULT:', { 
          hasAdminData: !!adminCheck, 
          adminUserId: adminCheck?.userid,
          hasError: !!adminError,
          errorMessage: adminError?.message,
          errorCode: adminError?.code
        });

        if (adminError || !adminCheck) {
          console.error('STEP 2A FAILED: Permission denied - requesting user is not an admin');
          return { data: null, error: new Error('Only circle admins can manage admin privileges') };
        }
        
        console.log('STEP 2A PASSED: User is confirmed as admin');
      } else {
        console.log('STEP 2 PASSED: User is creator, has permission');
      }

      // Check if user is already an admin
      console.log('STEP 3: Checking if target user is already an admin...');
      const { data: existingAdmin, error: existingError } = await supabase
        .from('circle_admins')
        .select('userid')
        .eq('circleid', circleId)
        .eq('userid', userId)
        .single();

      console.log('STEP 3 RESULT:', { 
        hasExistingAdmin: !!existingAdmin, 
        existingUserId: existingAdmin?.userid,
        hasError: !!existingError,
        errorMessage: existingError?.message,
        errorCode: existingError?.code
      });

      if (existingAdmin) {
        console.log('STEP 3 RESULT: User is already an admin, returning early');
        return { data: null, error: new Error('User is already an admin') };
      }
      
      console.log('STEP 3 PASSED: User is not currently an admin, proceeding with insert');

      // Perform the insert
      console.log('STEP 4: Attempting to insert new admin...');
      console.log('STEP 4: Insert payload:', { circleid: circleId, userid: userId });
      
      const { data, error } = await supabase
        .from('circle_admins')
        .insert({
          circleid: circleId,
          userid: userId
        })
        .select();

      console.log('STEP 4 RESULT:', { 
        hasData: !!data,
        dataLength: data?.length || 0,
        data: data,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint
      });

      if (error) {
        console.error('STEP 4 FAILED: Error inserting circle admin:', error);
        return { data: null, error: new Error(`Failed to add admin: ${error.message}`) };
      }

      console.log('STEP 4 PASSED: Successfully added circle admin');
      console.log('=== DATABASE: addCircleAdmin function completed successfully ===');
      return { data, error: null };
      
    } catch (error) {
      console.error('=== DATABASE: UNEXPECTED ERROR in addCircleAdmin ===');
      console.error('Caught error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      return { data: null, error: error as Error };
    }
  },

  async removeCircleAdmin(circleId: string, userId: string, requestingAdminId: string) {
    console.log('🔴 DATABASE FUNCTION ENTRY: removeCircleAdmin called');
    console.log('🔴 IMMEDIATE ENTRY LOG - Function definitely started');
    try {
      console.log('=== DATABASE: removeCircleAdmin function started ===');
      console.log('INPUT Parameters:', { 
        circleId: circleId || 'undefined', 
        userId: userId || 'undefined', 
        requestingAdminId: requestingAdminId || 'undefined' 
      });

      // Validate inputs
      if (!circleId) {
        console.error('VALIDATION ERROR: circleId is required');
        return { data: null, error: new Error('Circle ID is required') };
      }
      if (!userId) {
        console.error('VALIDATION ERROR: userId is required');
        return { data: null, error: new Error('User ID is required') };
      }
      if (!requestingAdminId) {
        console.error('VALIDATION ERROR: requestingAdminId is required');
        return { data: null, error: new Error('Requesting admin ID is required') };
      }

      console.log('INPUT VALIDATION: All parameters are valid');

      // Get circle creator
      console.log('STEP 1: Fetching circle creator...');
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .select('creator')
        .eq('id', circleId)
        .single();

      console.log('STEP 1 RESULT:', { 
        hasCircleData: !!circle, 
        creator: circle?.creator, 
        hasError: !!circleError,
        errorMessage: circleError?.message,
        errorCode: circleError?.code
      });

      if (circleError) {
        console.error('STEP 1 FAILED: Error fetching circle:', circleError);
        return { data: null, error: new Error(`Failed to fetch circle: ${circleError.message}`) };
      }

      if (!circle) {
        console.error('STEP 1 FAILED: Circle not found');
        return { data: null, error: new Error('Circle not found') };
      }

      // Cannot remove the main admin (creator)
      console.log('STEP 2: Checking if trying to remove creator...');
      if (circle.creator === userId) {
        console.error('STEP 2 FAILED: Cannot remove the main admin (creator)');
        return { data: null, error: new Error('Cannot remove the main admin') };
      }
      console.log('STEP 2 PASSED: Not trying to remove creator');

      // Verify requesting user is the main admin (creator) OR a regular admin
      const isCreator = circle.creator === requestingAdminId;
      console.log('STEP 3: Permission check - isCreator:', isCreator);
      console.log('STEP 3: Creator comparison:', { 
        circleCreator: circle.creator, 
        requestingAdminId: requestingAdminId,
        areEqual: circle.creator === requestingAdminId
      });
      
      if (!isCreator) {
        // Check if requesting user is at least an admin
        console.log('STEP 3A: User is not creator, checking admin status...');
        const { data: adminCheck, error: adminError } = await supabase
          .from('circle_admins')
          .select('userid')
          .eq('circleid', circleId)
          .eq('userid', requestingAdminId)
          .single();

        console.log('STEP 3A RESULT:', { 
          hasAdminData: !!adminCheck, 
          adminUserId: adminCheck?.userid,
          hasError: !!adminError,
          errorMessage: adminError?.message,
          errorCode: adminError?.code
        });

        if (adminError || !adminCheck) {
          console.error('STEP 3A FAILED: Permission denied - requesting user is not an admin');
          return { data: null, error: new Error('Only circle admins can manage admin privileges') };
        }
        
        console.log('STEP 3A PASSED: User is confirmed as admin');
      } else {
        console.log('STEP 3 PASSED: User is creator, has permission');
      }

      // Perform the delete
      console.log('STEP 4: Attempting to remove admin...');
      console.log('STEP 4: Delete conditions:', { circleid: circleId, userid: userId });
      
      const { data, error } = await supabase
        .from('circle_admins')
        .delete()
        .eq('circleid', circleId)
        .eq('userid', userId);

      console.log('STEP 4 RESULT:', { 
        hasData: !!data,
        data: data,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint
      });

      if (error) {
        console.error('STEP 4 FAILED: Error removing circle admin:', error);
        return { data: null, error: new Error(`Failed to remove admin: ${error.message}`) };
      }

      console.log('STEP 4 PASSED: Successfully removed circle admin');
      console.log('=== DATABASE: removeCircleAdmin function completed successfully ===');
      return { data, error: null };
      
    } catch (error) {
      console.error('=== DATABASE: UNEXPECTED ERROR in removeCircleAdmin ===');
      console.error('Caught error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      return { data: null, error: error as Error };
    }
  },

  async removeMemberFromCircle(circleId: string, userId: string, adminId: string) {
    try {
      console.log('removeMemberFromCircle called:', { circleId, userId, adminId });

      // First check if requesting user is the creator
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .select('creator')
        .eq('id', circleId)
        .single();

      if (circleError) {
        console.error('Error fetching circle for removeMember:', circleError);
        return { data: null, error: new Error(`Failed to fetch circle: ${circleError.message}`) };
      }

      const isCreator = circle?.creator === adminId;
      console.log('Admin check - isCreator:', isCreator, 'circle creator:', circle?.creator);

      if (!isCreator) {
        // Check if user is admin
        const { data: adminCheck, error: adminError } = await supabase
          .from('circle_admins')
          .select('userid')
          .eq('circleid', circleId)
          .eq('userid', adminId)
          .single();

        if (adminError) {
          console.error('Error checking admin status:', adminError);
          return { data: null, error: new Error(`Failed to verify admin status: ${adminError.message}`) };
        }

        if (!adminCheck) {
          console.error('User is not an admin and not the creator');
          return { data: null, error: new Error('You do not have admin permissions to remove members') };
        }
      }

      // Cannot remove the creator from their own circle
      if (circle?.creator === userId) {
        console.error('Cannot remove the circle creator');
        return { data: null, error: new Error('Cannot remove the circle creator') };
      }

      console.log('Removing user from circle...');
      // Remove from circle
      const { data, error } = await supabase
        .from('user_circles')
        .delete()
        .eq('circleid', circleId)
        .eq('userid', userId);

      if (error) {
        console.error('Error removing member from circle:', error);
        return { data: null, error: new Error(`Failed to remove member: ${error.message}`) };
      }

      console.log('Removing admin status if exists...');
      // Also remove admin status if they had it (ignore errors here as they might not be admin)
      const { error: adminRemoveError } = await supabase
        .from('circle_admins')
        .delete()
        .eq('circleid', circleId)
        .eq('userid', userId);

      if (adminRemoveError) {
        console.log('Note: Could not remove admin status (user might not be admin):', adminRemoveError);
      }

      console.log('Successfully removed member from circle');
      return { data, error: null };
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