import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/database";
import { getNavigationTarget } from "@/lib/notifications";
import { router } from "expo-router";

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  creationdate: string;
  linkedItemId?: string;
  linkedItemType?: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await getUserNotifications(user.id);
      if (error) {
        console.error("Error loading notifications:", error);
        Alert.alert("Error", "Failed to load notifications");
        return;
      }
      const formatted: Notification[] =
        data?.map((n: any) => ({
          id: n.id,
          type: n.type || "general",
          content: n.content || "",
          read: n.read || false,
          creationdate: n.creationdate,
          linkedItemId: n.linkeditemid || undefined,
          linkedItemType: n.linkeditemtype || undefined,
        })) || [];
      setNotifications(formatted);
    } catch (e) {
      console.error("Error loading notifications:", e);
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
        console.error("Error marking notification as read:", error);
        return;
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const { error } = await markAllNotificationsAsRead(user.id);
      if (error) {
        console.error("Error marking all notifications as read:", error);
        Alert.alert("Error", "Failed to mark all notifications as read");
        return;
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("Error marking all notifications as read:", e);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "circle_join":
        return "person.badge.plus";
      case "circle_invite":
        return "person.3.fill";
      case "event_reminder":
        return "calendar";
      case "new_message":
        return "message.fill";
      case "event_created":
        return "calendar.badge.plus";
      case "post_like":
        return "heart.fill";
      case "comment":
        return "bubble.left.fill";
      default:
        return "bell.fill";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "circle_join":
      case "circle_invite":
        return "#4CAF50";
      case "event_reminder":
      case "event_created":
        return "#FF9800";
      case "new_message":
        return "#2196F3";
      case "post_like":
        return "#E91E63";
      case "comment":
        return "#9C27B0";
      default:
        return tintColor;
    }
  };

  const formatNotificationTime = (creationdate: string) => {
    const date = new Date(creationdate);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;
    if (diffInMinutes < 1) return texts.justNow || "Just now";
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m`;
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    if (diffInDays < 7) return `${Math.floor(diffInDays)}d`;
    return date.toLocaleDateString();
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      if (!notification.read) await handleMarkAsRead(notification.id);
      const target = getNavigationTarget(notification);
      if (!target) return;
      if (target.params?.tab) {
        router.push(`/circle/${target.params.id}?tab=${target.params.tab}`);
      } else if (target.screen === "post/[id]") {
        router.push(`/post/${target.params.id}`);
      } else if (target.screen === "event/[id]") {
        router.push(`/event/${target.params.id}`);
      }
    } catch (e) {
      console.error("Error handling notification press:", e);
    }
  };

  const filtered = notifications.filter((n) => filter === "all" || !n.read);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotification = (n: Notification) => {
    const isRead = n.read;
    return (
      <TouchableOpacity
        key={n.id}
        style={[
          styles.notificationItem,
          {
            backgroundColor: isRead ? "#F9FAFB" : tintColor + "12", 
          },
        ]}
        onPress={() => handleNotificationPress(n)}
      >
        <View
          style={[
            styles.notificationContent,
            isRTL && styles.notificationContentRTL,
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isRead
                  ? "#EEF1F4"
                  : getNotificationColor(n.type) + "22",
              },
            ]}
          >
            <IconSymbol
              name={getNotificationIcon(n.type)}
              size={20}
              color={isRead ? "#7F8B97" : getNotificationColor(n.type)}
              style={{ opacity: isRead ? 0.85 : 1 }}
            />
          </View>

          <View style={styles.textContainer}>
            <ThemedText
              style={[
                styles.notificationText,
                isRead ? styles.mutedText : styles.unreadText,
                isRTL && styles.rtlText,
              ]}
            >
              {n.content}
            </ThemedText>

            <View
              style={[
                styles.notificationFooter,
                isRTL && styles.notificationFooterRTL,
              ]}
            >
              <ThemedText
                style={[styles.notificationTime, isRead && styles.mutedTime]}
              >
                {formatNotificationTime(n.creationdate)}
              </ThemedText>

              {isRead ? (
                <View style={styles.readPill} />
              ) : (
                <View
                  style={[styles.unreadDot, { backgroundColor: tintColor }]}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#FFFFFF" }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={22} color="#000" />
        </TouchableOpacity>

        <ThemedText style={styles.headerTitle}>
          {texts.notifications || "Notifications"}
        </ThemedText>

        <TouchableOpacity onPress={() => console.log("Menu pressed")}>
          <IconSymbol name="ellipsis" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="tabs" style={styles.tabsContainer}>
        <TouchableOpacity onPress={() => setFilter("all")}>
          <ThemedText
            style={[styles.tabText, filter === "all" && styles.activeTabText]}
          >
            {texts.all || "All"}
          </ThemedText>
          {filter === "all" && <View style={styles.activeLine} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setFilter("unread")}>
          <View style={styles.unreadContainer}>
            <ThemedText
              style={[
                styles.tabText,
                filter === "unread" && styles.activeTabText,
              ]}
            >
              {texts.unread || "Unread"}
            </ThemedText>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <ThemedText style={styles.unreadBadgeText}>
                  {unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
          {filter === "unread" && <View style={styles.activeLine} />}
        </TouchableOpacity>
      </View>

      {/* Filter + Mark all */}
      <View style={styles.filterSection}>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, { backgroundColor: "#F6F6F6" }]}
          >
            <ThemedText style={styles.filterTabText}>Event</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, { backgroundColor: "#F6F6F6" }]}
          >
            <ThemedText style={styles.filterTabText}>Announcement</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, { backgroundColor: "#F6F6F6" }]}
          >
            <ThemedText style={styles.filterTabText}>Interactions</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.markAsReadWrapper}>
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <ThemedText style={styles.markAsReadText}>
              Mark all as read
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>{texts.loading || "Loading..."}</ThemedText>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="bell" size={64} color={textColor + "40"} />
            <ThemedText style={styles.emptyText}>
              {filter === "unread"
                ? texts.noUnreadNotifications || "No unread notifications"
                : texts.noNotifications || "No notifications yet"}
            </ThemedText>
            <ThemedText style={styles.emptySubText}>
              {texts.notificationsWillAppear ||
                "Notifications will appear here when you have updates"}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {filtered.map(renderNotification)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },

  // tabs
  tabsContainer: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "#fff",
  },
  tabText: { fontSize: 14, color: "#999", fontWeight: "500" },
  activeTabText: { color: "#000", fontWeight: "600" },
  activeLine: {
    height: 2,
    backgroundColor: "#22A757",
    marginTop: 10,
    borderRadius: 2,
  },
  unreadContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  unreadBadge: {
    backgroundColor: "#D6F5DD",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  unreadBadgeText: { fontSize: 12, color: "#2E7D32", fontWeight: "600" },

  // filter
  filterSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  filterTabs: { flexDirection: "row", gap: 8 },
  filterTab: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F6F6F6",
  },
  filterTabText: { fontSize: 13, color: "#000", fontWeight: "500" },
  markAsReadWrapper: { alignItems: "flex-end" },
  markAsReadText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#00692C",
    paddingVertical: 16,
  },

  // list
  content: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  notificationsList: { paddingVertical: 8 },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  notificationContent: { flexDirection: "row", alignItems: "flex-start" },
  notificationContentRTL: { flexDirection: "row-reverse" },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: { flex: 1 },

  // text states
  notificationText: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  unreadText: { color: "#111", fontWeight: "600" },
  mutedText: {
    color: "#374151", 
    fontWeight: "500",
    opacity: 0.9, 
  },

  notificationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationFooterRTL: { flexDirection: "row-reverse" },
  notificationTime: { fontSize: 12, color: "#6B7280", opacity: 0.7 },
  mutedTime: { opacity: 0.6, color: "#8A94A6" },

  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  readPill: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E6E8EC", 
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.6,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: "center",
    lineHeight: 20,
  },
  rtlText: { textAlign: "right" },
});
