
import { supabase } from './supabase';

export interface Notification {
  id: string;
  userid: string;
  type: 'join' | 'accept_join' | 'comment' | 'new_event';
  content: string;
  linkeditemtype: 'circle' | 'post' | 'event';
  linkeditemid: string;
  read: boolean;
  creationdate: string;
}

// Get notifications for current user with pagination
export const getNotifications = async (
  page: number = 0,
  limit: number = 20,
  unreadOnly: boolean = false
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('userid', user.id)
    .order('creationdate', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Notification[];
};

// Get unread notification count
export const getUnreadCount = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('userid', user.id)
    .eq('read', false);

  if (error) throw error;
  return count || 0;
};

// Mark notification as read
export const markAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('userid', user.id)
    .eq('read', false);

  if (error) throw error;
};

// Delete notification
export const deleteNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
};

// Handle navigation based on notification type
export const getNavigationTarget = (notification: Notification) => {
  switch (notification.type) {
    case 'join':
      return {
        screen: 'circle/[id]',
        params: { id: notification.linkeditemid, tab: 'admin' }
      };
    case 'accept_join':
      return {
        screen: 'circle/[id]',
        params: { id: notification.linkeditemid, tab: 'feed' }
      };
    case 'comment':
      return {
        screen: 'post/[id]',
        params: { id: notification.linkeditemid }
      };
    case 'new_event':
      return {
        screen: 'event/[id]',
        params: { id: notification.linkeditemid }
      };
    default:
      return null;
  }
};
