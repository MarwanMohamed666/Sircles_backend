
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';

interface Notification {
  id: string;
  type: 'event' | 'message' | 'post' | 'rsvp' | 'circle';
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
  linkedItemId?: string;
}

export default function NotificationsScreen() {
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'event',
      title: 'New Event: Community BBQ',
      content: 'A new event has been created in your community. Join us for a fun BBQ evening!',
      timestamp: '2 minutes ago',
      read: false,
    },
    {
      id: '2',
      type: 'message',
      title: 'New message in Tech Enthusiasts',
      content: 'Ahmed Ali: Great discussion about AI trends today! 🚀',
      timestamp: '15 minutes ago',
      read: false,
    },
    {
      id: '3',
      type: 'rsvp',
      title: 'RSVP Reminder',
      content: 'Don\'t forget to RSVP for the Book Club Meeting tomorrow at 7:30 PM.',
      timestamp: '1 hour ago',
      read: true,
    },
    {
      id: '4',
      type: 'circle',
      title: 'Circle Invitation',
      content: 'You\'ve been invited to join the Photography Club circle.',
      timestamp: '2 hours ago',
      read: false,
    },
    {
      id: '5',
      type: 'post',
      title: 'New post in Fitness Group',
      content: 'Sara Mohamed shared tips for staying motivated during winter workouts.',
      timestamp: '3 hours ago',
      read: true,
    },
    {
      id: '6',
      type: 'event',
      title: 'Event Update',
      content: 'Photography Workshop has been moved to the Community Center.',
      timestamp: '1 day ago',
      read: true,
    },
  ]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event':
        return 'calendar';
      case 'message':
        return 'message';
      case 'post':
        return 'doc.text';
      case 'rsvp':
        return 'clock';
      case 'circle':
        return 'person.3';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'event':
        return '#FF9800';
      case 'message':
        return tintColor;
      case 'post':
        return '#9C27B0';
      case 'rsvp':
        return '#FFB74D';
      case 'circle':
        return '#66BB6A';
      default:
        return tintColor;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {texts.notifications || 'Notifications'}
        </ThemedText>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={[styles.markAllReadButton, { backgroundColor: tintColor }]}
            onPress={markAllAsRead}
          >
            <ThemedText style={styles.markAllReadText}>
              {texts.markAllRead || 'Mark All Read'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Unread Count */}
      {unreadCount > 0 && (
        <View style={[styles.unreadSection, { backgroundColor: surfaceColor }]}>
          <ThemedText style={[styles.unreadText, isRTL && styles.rtlText]}>
            {unreadCount} {texts.unreadNotifications || 'unread notifications'}
          </ThemedText>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="bell" size={64} color={textColor + '40'} />
            <ThemedText style={[styles.emptyStateText, isRTL && styles.rtlText]}>
              {texts.noNotifications || 'No notifications yet'}
            </ThemedText>
            <ThemedText style={[styles.emptyStateSubtext, isRTL && styles.rtlText]}>
              {texts.notificationsWillAppear || 'Your notifications will appear here'}
            </ThemedText>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                {
                  backgroundColor: notification.read ? backgroundColor : surfaceColor,
                  borderLeftColor: getNotificationColor(notification.type),
                }
              ]}
              onPress={() => markAsRead(notification.id)}
            >
              <View style={[styles.notificationContent, isRTL && styles.notificationContentRTL]}>
                <View style={[
                  styles.notificationIcon,
                  { backgroundColor: getNotificationColor(notification.type) + '20' }
                ]}>
                  <IconSymbol
                    name={getNotificationIcon(notification.type)}
                    size={20}
                    color={getNotificationColor(notification.type)}
                  />
                </View>

                <View style={styles.notificationText}>
                  <View style={[styles.notificationHeader, isRTL && styles.notificationHeaderRTL]}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[styles.notificationTitle, isRTL && styles.rtlText]}
                      numberOfLines={1}
                    >
                      {notification.title}
                    </ThemedText>
                    {!notification.read && (
                      <View style={[styles.unreadDot, { backgroundColor: tintColor }]} />
                    )}
                  </View>

                  <ThemedText
                    style={[styles.notificationBody, isRTL && styles.rtlText]}
                    numberOfLines={2}
                  >
                    {notification.content}
                  </ThemedText>

                  <ThemedText style={[styles.notificationTime, isRTL && styles.rtlText]}>
                    {notification.timestamp}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))
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
  markAllReadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  unreadSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  unreadText: {
    fontSize: 14,
    opacity: 0.8,
  },
  notificationsList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  notificationItem: {
    borderLeftWidth: 4,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  notificationContentRTL: {
    flexDirection: 'row-reverse',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationBody: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  rtlText: {
    textAlign: 'right',
  },
});
