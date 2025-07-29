import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/database';

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  timestamp: string;
  linkedItemId?: string;
  linkedItemType?: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await getUserNotifications(user.id);

      if (error) {
        console.error('Error loading notifications:', error);
        Alert.alert('Error', 'Failed to load notifications');
        return;
      }

      const formattedNotifications: Notification[] = data?.map(notif => ({
        id: notif.id,
        type: notif.type || 'general',
        content: notif.content || '',
        read: notif.read || false,
        timestamp: notif.timestamp,
        linkedItemId: notif.linkedItemId || undefined,
        linkedItemType: notif.linkedItemType || undefined,
      })) || [];

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await markNotificationAsRead(notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await markAllNotificationsAsRead(user.id);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        Alert.alert('Error', 'Failed to mark all notifications as read');
        return;
      }

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'circle_join':
        return 'person.badge.plus';
      case 'circle_invite':
        return 'person.3.fill';
      case 'event_reminder':
        return 'calendar';
      case 'new_message':
        return 'message.fill';
      case 'event_created':
        return 'calendar.badge.plus';
      case 'post_like':
        return 'heart.fill';
      case 'comment':
        return 'bubble.left.fill';
      default:
        return 'bell.fill';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'circle_join':
      case 'circle_invite':
        return '#4CAF50';
      case 'event_reminder':
      case 'event_created':
        return '#FF9800';
      case 'new_message':
        return '#2196F3';
      case 'post_like':
        return '#E91E63';
      case 'comment':
        return '#9C27B0';
      default:
        return tintColor;
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    if (diffInMinutes < 1) {
      return texts.justNow || 'Just now';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || !notification.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = (notification: Notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        { backgroundColor: notification.read ? 'transparent' : tintColor + '10' }
      ]}
      onPress={() => {
        if (!notification.read) {
          handleMarkAsRead(notification.id);
        }
      }}
    >
      <View style={[styles.notificationContent, isRTL && styles.notificationContentRTL]}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: getNotificationColor(notification.type) + '20' }
        ]}>
          <IconSymbol 
            name={getNotificationIcon(notification.type)} 
            size={20} 
            color={getNotificationColor(notification.type)} 
          />
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={[
            styles.notificationText,
            { fontWeight: notification.read ? 'normal' : '600' },
            isRTL && styles.rtlText
          ]}>
            {notification.content}
          </ThemedText>

          <View style={[styles.notificationFooter, isRTL && styles.notificationFooterRTL]}>
            <ThemedText style={styles.notificationTime}>
              {formatNotificationTime(notification.timestamp)}
            </ThemedText>
            {!notification.read && (
              <View style={[styles.unreadDot, { backgroundColor: tintColor }]} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {texts.notifications || 'Notifications'}
        </ThemedText>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={[styles.markAllButton, { backgroundColor: tintColor }]}
            onPress={handleMarkAllAsRead}
          >
            <ThemedText style={styles.markAllButtonText}>
              {texts.markAllRead || 'Mark All Read'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'all' && { backgroundColor: tintColor }
          ]}
          onPress={() => setFilter('all')}
        >
          <ThemedText style={[
            styles.filterTabText,
            filter === 'all' && { color: '#fff' }
          ]}>
            {texts.all || 'All'} ({notifications.length})
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'unread' && { backgroundColor: tintColor }
          ]}
          onPress={() => setFilter('unread')}
        >
          <ThemedText style={[
            styles.filterTabText,
            filter === 'unread' && { color: '#fff' }
          ]}>
            {texts.unread || 'Unread'} ({unreadCount})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>{texts.loading || 'Loading...'}</ThemedText>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="bell" size={64} color={textColor + '40'} />
            <ThemedText style={styles.emptyText}>
              {filter === 'unread' 
                ? texts.noUnreadNotifications || 'No unread notifications'
                : texts.noNotifications || 'No notifications yet'
              }
            </ThemedText>
            <ThemedText style={styles.emptySubText}>
              {texts.notificationsWillAppear || 'Notifications will appear here when you have updates'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {filteredNotifications.map(renderNotification)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  notificationsList: {
    paddingVertical: 8,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationContentRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationFooterRTL: {
    flexDirection: 'row-reverse',
  },
  notificationTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.6,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  rtlText: {
    textAlign: 'right',
  },
});