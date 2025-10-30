import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
  useWindowDimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { DatabaseService } from "@/lib/database";
import { CircleCard } from "@/components/CircleCard";
import { useCirclesStore } from "@/stores/circlesStore";
import EventModal from "@/components/EventModal";

interface Post {
  id: string;
  content: string;
  image?: string;
  creationdate: string;
  author: { id: string; name: string; avatar_url?: string } | null;
  circle: {
    id?: string;
    name: string;
    circle_interests?: { interests: { id: string; title: string } }[];
  } | null;
  likes: any[];
  comments: any[];
  likes_count?: number;
  userLiked?: boolean;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { texts } = useLanguage();
  const { width } = useWindowDimensions();

  // theme
  const PRIMARY = "#198F4B";
  const SURFACE = "#FFFFFF";
  const BG = "#FFFFFF";
  const TEXT = "#0F172A";
  const SUBTLE = "#6B7280";
  const BORDER = "#E5E7EB";

  const surfaceColor = SURFACE;
  const tintColor = PRIMARY;
  const textColor = TEXT;
  const backgroundColor = BG;

  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create / edit post
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedCircle, setSelectedCircle] = useState<string>("");
  const [userCircles, setUserCircles] = useState<any[]>([]);
  const [selectedPostImage, setSelectedPostImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [editingPost, setEditingPost] = useState<{ id: string } | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [deletePostLoading, setDeletePostLoading] = useState<string | null>(
    null
  );
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [isEventModalVisible, setEventModalVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  // menu state
  const [menuFor, setMenuFor] = useState<{
    type: "post" | "event";
    id: string;
  } | null>(null);

  // search
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const PALETTE = {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    border: "#E5E7EB",
    text: "#111827",
    muted: "#6B7280",
    tint: "#0E7F45",
    success: "#0E7F45",
    warning: "#F59E0B",
    danger: "#EF4444",
    link: "#0EA5E9",
    overlay: "rgba(0,0,0,0.6)",
  };

  const isAllowedImageAsset = (
    asset: ImagePicker.ImagePickerAsset | null | undefined
  ) => {
    if (!asset) return false;

    const allowedMimes = new Set(["image/png", "image/jpeg", "image/jpg"]);
    const allowedExts = new Set(["png", "jpg", "jpeg"]);

    const mime = asset.mimeType?.toLowerCase();
    if (mime && allowedMimes.has(mime)) return true;

    const nameOrUri = (asset.fileName || asset.uri || "").toLowerCase();
    const ext = nameOrUri.split(".").pop();
    if (ext && allowedExts.has(ext)) return true;

    return false;
  };

  const showUnsupportedAlert = () =>
    Alert.alert(
      "Unsupported Format",
      "Only PNG, JPG, or JPEG images are allowed.\nPlease select a valid image format."
    );

  // suggested circles store
  const {
    suggested: suggestedCircles,
    loading: suggestedLoading,
    loadSuggested,
    dismiss,
    snooze,
    error: circlesError,
  } = useCirclesStore();

  useFocusEffect(
    useCallback(() => {
      loadPosts();
      loadSuggested();
      loadEvents();
    }, [])
  );

  const isOwner = useCallback(
    (post?: Post | null) => !!post?.author?.id && post?.author?.id === user?.id,
    [user?.id]
  );

  const loadPosts = async () => {
    if (!user?.id) {
      setPosts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await DatabaseService.getHomePagePosts(user.id);
      if (error) {
        setError("Unable to load posts. Please try again.");
        setPosts([]);
      } else {
        const postsWithLikes = (data || []).map((post: any) => ({
          ...post,
          likes_count: post.likes?.length || post.likes_count || 0,
          userLiked:
            post.userLiked ??
            (post.likes?.some((like: any) => like.userid === user.id) || false),
        }));
        setPosts(postsWithLikes);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await DatabaseService.getEvents();
      if (error) setError("Unable to load events. Please try again.");
      else setEvents(data || []);
    } catch {
      setError("Unable to load events. Please try again.");
    }
  };

  // ✅ تعديل الحذف ليطابق صفحة Events: حذف من الـDB ثم إعادة التحميل
  const handleDeleteEvent = async (eventId: string) => {
    if (!eventId) {
      Alert.alert("Error", "Invalid event ID");
      return;
    }
    const { error } = await DatabaseService.deleteEvent(eventId);
    if (error) {
      Alert.alert("Error", error.message || "Failed to delete event");
      return;
    }
    await loadEvents(); // أعد تحميل الأحداث لكي يتحدّث الـfeed
    Alert.alert("Success", "Event deleted successfully");
  };

  function formatTo12Hour(timeString: string | undefined) {
    if (!timeString) {
      return "";
    }
    const [hours, minutes] = timeString.split(":");
    const hoursNum = parseInt(hours, 10);
    if (isNaN(hoursNum)) return "";

    const period = hoursNum >= 12 ? "PM" : "AM";
    let displayHours = hoursNum % 12;
    if (displayHours === 0) {
      displayHours = 12;
    }

    return `${displayHours}:${minutes} ${period}`;
  }

  const calculateInterestScore = (item: any) => {
    if (!userInterests?.length) return 0;
    let itemInterests: string[] = [];
    if (item.type === "event") {
      itemInterests =
        item.event_interests
          ?.map((ei: any) => ei.interests?.id)
          .filter(Boolean) || [];
    } else {
      itemInterests =
        item.circle?.circle_interests
          ?.map((ci: any) => ci.interests?.id)
          .filter(Boolean) || [];
    }
    const userIds = userInterests
      .map((ui) => ui.interests?.id || ui.interestid)
      .filter(Boolean);
    return itemInterests.filter((id) => userIds.includes(id)).length;
  };

  const combineFeedItems = () => {
    const combined = [
      ...posts.map((post) => ({
        ...post,
        type: "post",
        sortDate: new Date(post.creationdate),
      })),
      ...events.map((event) => ({
        ...event,
        type: "event",
        sortDate: new Date(event.creationdate || event.date || Date.now()),
      })),
    ];
    combined.forEach((i) => (i.interestScore = calculateInterestScore(i)));
    combined.sort(
      (a, b) =>
        (b.interestScore || 0) - (a.interestScore || 0) ||
        (b.sortDate as any) - (a.sortDate as any)
    );

    let withSuggested = combined;
    if (suggestedCircles && suggestedCircles.length > 0) {
      const insertAt = Math.min(3, combined.length);
      withSuggested = [
        ...combined.slice(0, insertAt),
        { id: "suggested-section", type: "suggested" },
        ...combined.slice(insertAt),
      ];
    }

    setFeedItems(withSuggested);
    setLoading(false);
  };

  const loadUserInterests = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await DatabaseService.getUserInterests(user.id);
      if (!error) setUserInterests(data || []);
    } catch {}
  };

  const loadUserCircles = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await DatabaseService.getUserJoinedCircles(
        user.id
      );
      if (error) return;
      const { data: allCircles } = await DatabaseService.getCircles();
      const joined = (data || [])
        .map((uc: any) => allCircles?.find((c: any) => c.id === uc.circleid))
        .filter(Boolean);
      setUserCircles(joined);
    } catch {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadPosts(),
      loadEvents(),
      loadUserCircles(),
      loadUserInterests(),
    ]);
    await loadSuggested();
    setRefreshing(false);
  }, [user, loadSuggested]);

  useEffect(() => {
    if (user)
      Promise.all([
        loadPosts(),
        loadEvents(),
        loadUserCircles(),
        loadUserInterests(),
      ]);
    else {
      setPosts([]);
      setEvents([]);
      setFeedItems([]);
      setUserInterests([]);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (posts.length || events.length || userInterests.length >= 0)
      combineFeedItems();
  }, [posts, events, userInterests, suggestedCircles]);

  useEffect(() => {
    if (user) loadSuggested();
  }, [user?.id, userInterests.length, loadSuggested]);

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "Unknown time";
    const date = new Date(dateString);
    if (isNaN(+date)) return "Unknown time";
    const diffH = Math.floor((Date.now() - +date) / 36e5);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    const d = Math.floor(diffH / 24);
    if (d < 7) return `${d}d ago`;
    return date.toLocaleDateString();
  };

  // ====== اختيار صورة مع تحقق الصيغة ======
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!isAllowedImageAsset(asset)) {
      showUnsupportedAlert();
      return;
    }

    setSelectedPostImage(asset!);
  };

  const handleLikePost = async (postId: string) => {
    if (!user?.id) return Alert.alert("Error", "Login first");
    const i = posts.findIndex((p) => p.id === postId);
    if (i === -1) return;
    const original = [...posts];
    const p = posts[i];
    const next = [...posts];
    next[i] = {
      ...p,
      userLiked: !p.userLiked,
      likes_count: (p.likes_count || 0) + (p.userLiked ? -1 : 1),
    };
    setPosts(next);
    const { error } = p.userLiked
      ? await DatabaseService.unlikePost(postId, user.id)
      : await DatabaseService.likePost(postId, user.id);
    if (error) {
      setPosts(original);
      Alert.alert("Error", "Failed to update like");
    }
  };

  // ====== إنشاء بوست مع تحقق الصيغة قبل الرفع ======
  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !selectedCircle) {
      Alert.alert("Error", "Content & circle required");
      return;
    }
    if (!user?.id) {
      Alert.alert("Error", "Login first");
      return;
    }
    if (selectedPostImage && !isAllowedImageAsset(selectedPostImage)) {
      showUnsupportedAlert();
      return;
    }

    try {
      const { error } = await DatabaseService.createPost(
        {
          userid: user.id,
          content: newPostContent.trim(),
          circleid: selectedCircle,
        },
        selectedPostImage || undefined
      );

      if (error) {
        Alert.alert("Error", error.message || "Failed to create post");
        return;
      }

      setShowPostModal(false);
      setNewPostContent("");
      setSelectedCircle("");
      setSelectedPostImage(null);
      await loadPosts();
    } catch {
      Alert.alert("Error", "Failed to create post");
    }
  };

  const handleEditPostStart = (postId: string, current: string) => {
    setEditingPost({ id: postId });
    setEditPostContent(current);
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !editPostContent.trim() || !user?.id) return;
    const post = posts.find((p) => p.id === editingPost.id);
    if (!isOwner(post)) return Alert.alert("Error", "Not allowed");
    const { error } = await DatabaseService.updatePost(
      editingPost.id,
      { content: editPostContent.trim() },
      user.id
    );
    if (error) return Alert.alert("Error", "Failed to update post");
    setEditingPost(null);
    setEditPostContent("");
    await loadPosts();
  };

  const handleDeletePost = async (postId: string) => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to delete posts");
      return;
    }
    setPostToDelete(postId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete || !user?.id) return;
    try {
      setDeletePostLoading(postToDelete);
      setShowDeleteConfirmModal(false);
      const { data, error } = await DatabaseService.deletePost(
        postToDelete,
        user.id
      );
      if (error) {
        Alert.alert("Error", error.message || "Failed to delete post");
        return;
      }
      setPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== postToDelete)
      );
      Alert.alert("Success", "Post deleted successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to delete post");
    } finally {
      setDeletePostLoading(null);
      setPostToDelete(null);
    }
  };

  const handleJoinSuggestedCircle = async (circleId: string) => {
    if (!user?.id) return Alert.alert("Error", "Login first");

    const circleToJoinAndDismiss = suggestedCircles.find(
      (c) => c.id === circleId
    );
    if (!circleToJoinAndDismiss) {
      console.error("Circle not found in suggestions list");
      return;
    }

    const { error } = await DatabaseService.joinCircle(user.id, circleId);
    if (error) {
      if (error.message?.includes("private")) {
      } else {
        Alert.alert("Error", error.message);
      }
      return;
    }

    Alert.alert("Success", "Joined circle");

    dismiss(circleToJoinAndDismiss);

    await loadUserCircles();
  };

  const handleEditEventStart = (event: any) => {
    setEditingEvent(event);
    setEventModalVisible(true);
  };
  const handleEventSave = (savedEvent: any) => {
    if (editingEvent) {
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === savedEvent.id ? savedEvent : event
        )
      );
    } else {
      setEvents((prevEvents) => [savedEvent, ...prevEvents]);
    }
  };

  const filteredFeed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feedItems;
    return feedItems.filter((item: any) => {
      if (item.type === "post") {
        const content = String(item.content || "").toLowerCase();
        const circle = String(item.circle?.name || "").toLowerCase();
        return content.includes(q) || circle.includes(q);
      } else if (item.type === "event") {
        const title = String(item.title || "").toLowerCase();
        const desc = String(item.description || "").toLowerCase();
        const circle = String(
          item.circle?.name || item.circleName || ""
        ).toLowerCase();
        return title.includes(q) || desc.includes(q) || circle.includes(q);
      }
      return true;
    });
  }, [feedItems, query]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <IconSymbol name="person.circle" size={64} color={SUBTLE} />
          <ThemedText style={styles.emptyText}>
            Please log in to see posts
          </ThemedText>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: tintColor }]}
            onPress={() => router.push("/login")}
          >
            <ThemedText style={styles.primaryBtnText}>
              {texts.login || "Login"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function renderSuggestedSection() {
    const H_PAD = 12;
    const CARD_GAP = 12;
    const cardW = Math.floor((width - H_PAD * 2) * 0.72);

    const items = suggestedCircles;

    return (
      <View style={[styles.card, { backgroundColor: surfaceColor }]}>
        <View
          style={{ paddingHorizontal: H_PAD, paddingTop: 10, paddingBottom: 8 }}
        >
          <ThemedText
            style={{ fontWeight: "700", fontSize: 14, color: textColor }}
          >
            Circles of Your Interest
          </ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: H_PAD,
            paddingBottom: 10,
          }}
        >
          {items.map((circle: any, idx: number) => (
            <View
              key={circle.id}
              style={{
                width: cardW,
                marginRight: idx === items.length - 1 ? 0 : CARD_GAP,
              }}
            >
              <CircleCard
                circle={circle}
                onJoin={handleJoinSuggestedCircle}
                onDismiss={dismiss}
                onSnooze={snooze}
              />
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={() => router.push("/(tabs)/circles")}
          style={{
            alignItems: "center",
            paddingVertical: 8,
            borderTopWidth: 1,
            borderColor: BORDER,
          }}
        >
          <ThemedText style={{ color: SUBTLE, fontWeight: "600" }}>
            See All
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.appHeader]}>
        <ThemedText type="title" style={[styles.brand, { color: tintColor }]}>
          Sircles
        </ThemedText>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setShowSearch((s) => !s)}>
            <IconSymbol name="magnifyingglass" size={22} color={TEXT} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(tabs)/messages")}>
            <IconSymbol name="bubble.left.fill" size={22} color={TEXT} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPostModal(true)}>
            <IconSymbol name="plus.circle" size={22} color={TEXT} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible search bar */}
      {showSearch && (
        <View style={[styles.searchWrap, { borderColor: BORDER }]}>
          <IconSymbol name="magnifyingglass" size={18} color={SUBTLE} />
          <TextInput
            style={[styles.searchInput, { color: TEXT }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search posts and events..."
            placeholderTextColor={SUBTLE}
            autoFocus
            returnKeyType="search"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <IconSymbol name="xmark.circle.fill" size={18} color={SUBTLE} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.centeredContainer}>
            <ThemedText>{texts.loading || "Loading..."}</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centeredContainer}>
            <IconSymbol
              name="exclamationmark.triangle"
              size={64}
              color="#EF5350"
            />
            <ThemedText style={styles.emptyText}>{error}</ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: tintColor }]}
              onPress={() => {
                loadPosts();
                loadEvents();
              }}
            >
              <ThemedText style={styles.primaryBtnText}>
                {texts.retry || "Retry"}
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredFeed}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={({ item }) =>
              item.type === "post"
                ? renderPost({ item })
                : item.type === "event"
                ? renderEvent({ item })
                : renderSuggestedSection()
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.centeredContainer}>
                <ThemedText style={styles.emptyText}>
                  No posts or events yet
                </ThemedText>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>

      {/* Three-dots Menu */}
      <Modal
        visible={!!menuFor}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuFor(null)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuFor(null)}
        >
          <View
            style={[
              styles.menuSheet,
              { backgroundColor: SURFACE, borderColor: BORDER },
            ]}
          >
            {menuFor?.type === "post" &&
              (() => {
                const p = posts.find((x) => x.id === menuFor.id) || null;
                const owner = isOwner(p);
                return owner ? (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        if (p) handleEditPostStart(p.id, p.content || "");
                        setMenuFor(null);
                      }}
                    >
                      <IconSymbol name="pencil" size={18} color={TEXT} />
                      <ThemedText
                        style={[styles.menuText, { color: "#000000ff" }]}
                      >
                        Edit
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        handleDeletePost(menuFor!.id);
                        setMenuFor(null);
                      }}
                    >
                      <IconSymbol name="trash" size={18} color="#EF4444" />
                      <ThemedText
                        style={[styles.menuText, { color: "#EF4444" }]}
                        onPress={confirmDeletePost}
                      >
                        Delete
                      </ThemedText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                    <ThemedText style={{ color: SUBTLE }}>
                      No actions available
                    </ThemedText>
                  </View>
                );
              })()}
            {menuFor?.type === "event" &&
              (() => {
                const event = events.find((e) => e.id === menuFor.id);
                const owner = event?.createdby === user?.id;
                return owner ? (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        handleEditEventStart(event);
                        setMenuFor(null);
                      }}
                    >
                      <IconSymbol name="pencil" size={18} color={TEXT} />
                      <ThemedText
                        style={[styles.menuText, { color: "#000000ff" }]}
                      >
                        Edit Event
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuFor(null);
                        handleDeleteEvent(String(event.id)); // ✅ يستخدم الدالة المعدّلة
                      }}
                    >
                      <IconSymbol name="trash" size={18} color="#EF4444" />
                      <ThemedText
                        style={[styles.menuText, { color: "#EF4444" }]}
                      >
                        Delete Event
                      </ThemedText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                    <ThemedText style={{ color: SUBTLE }}>
                      No actions available
                    </ThemedText>
                  </View>
                );
              })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Post Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: surfaceColor, borderBottomColor: BORDER },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setShowPostModal(false);
                setSelectedPostImage(null);
                setNewPostContent("");
                setSelectedCircle("");
              }}
            >
              <ThemedText style={[styles.cancelButton, { color: tintColor }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.modalTitle, { color: TEXT }]}>
              Create Post
            </ThemedText>
            <TouchableOpacity
              onPress={handleCreatePost}
              disabled={!newPostContent.trim() || !selectedCircle}
            >
              <ThemedText
                style={[
                  styles.saveButton,
                  {
                    color:
                      newPostContent.trim() && selectedCircle
                        ? tintColor
                        : SUBTLE,
                  },
                ]}
              >
                Post
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputSection}>
              <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
                Select Circle:
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {userCircles.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.circlePill,
                      {
                        borderColor: tintColor,
                        backgroundColor:
                          selectedCircle === c.id ? tintColor : SURFACE,
                      },
                    ]}
                    onPress={() => setSelectedCircle(c.id)}
                  >
                    <ThemedText
                      style={[
                        styles.circlePillTxt,
                        { color: selectedCircle === c.id ? "#fff" : textColor },
                      ]}
                    >
                      {c.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputSection}>
              <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
                What is on your mind?
              </ThemedText>
              <TextInput
                style={[
                  styles.postInput,
                  {
                    backgroundColor: SURFACE,
                    color: TEXT,
                    borderColor: BORDER,
                  },
                ]}
                value={newPostContent}
                onChangeText={setNewPostContent}
                placeholder="Share your thoughts..."
                placeholderTextColor={SUBTLE}
                multiline
                numberOfLines={25}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputSection}>
              <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
                Add Photo:
              </ThemedText>
              <TouchableOpacity
                onPress={pickImage}
                style={[
                  styles.imagePicker,
                  { backgroundColor: SURFACE, borderColor: tintColor },
                ]}
              >
                {selectedPostImage ? (
                  <View style={styles.imageSelected}>
                    <Image
                      source={{ uri: selectedPostImage.uri }}
                      style={styles.image}
                    />
                    <View style={styles.imageOverlay}>
                      <IconSymbol name="photo" size={22} color="#fff" />
                      <ThemedText style={styles.imageOverlayTxt}>
                        Change Photo
                      </ThemedText>
                    </View>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <IconSymbol name="photo" size={28} color={tintColor} />
                    <ThemedText
                      style={[styles.imagePickerTxt, { color: tintColor }]}
                    >
                      Tap to select a photo
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={!!editingPost}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: surfaceColor, borderBottomColor: BORDER },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setEditingPost(null);
                setEditPostContent("");
              }}
            >
              <ThemedText style={[styles.cancelButton, { color: tintColor }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.modalTitle, { color: TEXT }]}>
              Edit Post
            </ThemedText>
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={!editPostContent.trim()}
            >
              <ThemedText
                style={[
                  styles.saveButton,
                  { color: editPostContent.trim() ? tintColor : SUBTLE },
                ]}
              >
                Save
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputSection}>
              <ThemedText style={[styles.inputLabel, { color: TEXT }]}>
                Edit your post
              </ThemedText>
              <TextInput
                style={[
                  styles.postInput,
                  {
                    backgroundColor: SURFACE,
                    color: TEXT,
                    borderColor: BORDER,
                  },
                ]}
                value={editPostContent}
                onChangeText={setEditPostContent}
                placeholder="What's on your mind?"
                placeholderTextColor={SUBTLE}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoFocus
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Delete Post Confirm */}
      <Modal
        visible={showDeleteConfirmModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowDeleteConfirmModal(false);
          setPostToDelete(null);
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View
            style={[
              styles.deleteModalContent,
              { backgroundColor: surfaceColor },
            ]}
          >
            <View style={styles.deleteModalHeader}>
              <ThemedText style={[styles.deleteModalTitle, { color: "#000" }]}>
                Delete Post
              </ThemedText>
            </View>

            <View style={styles.deleteModalBody}>
              <ThemedText
                style={[styles.deleteModalMessage, { color: "#000" }]}
              >
                Are you sure you want to delete this post? This action cannot be
                undone.
              </ThemedText>
            </View>

            <View style={styles.deleteModalFooter}>
              <TouchableOpacity
                style={[
                  styles.deleteModalButton,
                  styles.cancelDeleteButton,
                  { backgroundColor: "#F9FAFB", borderColor: PALETTE.border },
                ]}
                onPress={() => {
                  setShowDeleteConfirmModal(false);
                  setPostToDelete(null);
                }}
              >
                <ThemedText style={{ color: textColor }}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteModalButton,
                  { backgroundColor: PALETTE.danger },
                ]}
                onPress={confirmDeletePost}
                disabled={deletePostLoading === postToDelete}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  {deletePostLoading === postToDelete
                    ? "Deleting..."
                    : "Delete"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EventModal
        visible={isEventModalVisible}
        onClose={() => {
          setEventModalVisible(false);
          setEditingEvent(null);
        }}
        onEventCreated={handleEventSave}
        editingEvent={editingEvent}
        circles={userCircles}
      />
    </SafeAreaView>
  );

  // --- UI: Event Card ---
  function renderEvent({ item }: { item: any }) {
    const isEventOwner = item.createdby === user?.id;

    return (
      <View style={[styles.card, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: tintColor + "26" },
              ]}
            >
              <IconSymbol name="calendar" size={18} color={tintColor} />
            </View>
            <View style={styles.headerTextWrap}>
              <ThemedText style={[styles.headerTitle, { color: TEXT }]}>
                {item.circle?.name || item.circleName || "Event"}
              </ThemedText>
              <ThemedText style={[styles.headerSub, { color: SUBTLE }]}>
                Event • {formatTimeAgo(item.creationdate)}
              </ThemedText>
            </View>
          </View>
          {isEventOwner && (
            <TouchableOpacity
              onPress={() => setMenuFor({ type: "event", id: item.id })}
              style={styles.menuBtn}
            >
              <IconSymbol name="ellipsis" size={20} color={SUBTLE} />
            </TouchableOpacity>
          )}
        </View>

        {(item.photo_url || item.image) && (
          <Image
            source={{ uri: item.photo_url || item.image }}
            style={styles.cardImage}
          />
        )}
        <View style={styles.cardBody}>
          <ThemedText
            style={[styles.eventTitle, { color: TEXT, fontWeight: "800" }]}
          >
            {item.title || "Untitled Event"}
          </ThemedText>
          <ThemedText style={[styles.eventMeta, { color: PRIMARY }]}>
            📅 {item.date ? new Date(item.date).toLocaleDateString() : "TBD"} •{" "}
            {formatTo12Hour(item.time) || "TBD"}
          </ThemedText>
          {item.description ? (
            <ThemedText style={[styles.desc, { color: TEXT }]}>
              {item.description}
            </ThemedText>
          ) : null}
          {item.location ? (
            <ThemedText style={[styles.eventLoc, { color: SUBTLE }]}>
              📍 {item.location}
            </ThemedText>
          ) : null}

          {item.event_interests?.length ? (
            <View style={styles.chipsRow}>
              {item.event_interests.map((ei: any) => (
                <View
                  key={ei.interests?.id}
                  style={[
                    styles.chip,
                    {
                      borderColor: tintColor,
                      backgroundColor: tintColor + "1A",
                    },
                  ]}
                >
                  <ThemedText style={[styles.chipText, { color: tintColor }]}>
                    {ei.interests?.title}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  function LikeButton({
    liked,
    count,
    onPress,
    disabled,
    SUBTLE,
  }: {
    liked: boolean;
    count: number;
    onPress: () => void;
    disabled?: boolean;
    SUBTLE: string;
  }) {
    const scale = React.useRef(new Animated.Value(1)).current;
    const opacity = React.useRef(new Animated.Value(0)).current;

    const run = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.25,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 160,
            delay: 80,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    const handlePress = () => {
      run();
      onPress();
    };

    return (
      <TouchableOpacity
        style={[styles.actionBtn, { position: "relative" }]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <IconSymbol
            name={liked ? "heart.fill" : "heart"}
            size={20}
            color={liked ? "#ff4444" : SUBTLE}
          />
        </Animated.View>

        <ThemedText
          style={[
            styles.actionTxt,
            liked && { color: "#ff4444", fontWeight: "700" },
          ]}
        >
          {count}
        </ThemedText>

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: -6,
            right: -6,
            top: -6,
            bottom: -6,
            borderRadius: 8,
            backgroundColor: "rgba(255,68,68,0.15)",
            opacity,
          }}
        />
      </TouchableOpacity>
    );
  }

  // --- UI: Post Card ---
  function renderPost({ item }: { item: Post & { interestScore?: number } }) {
    const owner = isOwner(item);

    return (
      <View style={[styles.card, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Image
              source={{
                uri:
                  item.author?.avatar_url || "https://via.placeholder.com/40",
              }}
              style={styles.avatarImg}
            />
            <View style={styles.headerTextWrap}>
              <ThemedText style={[styles.headerTitle, { color: TEXT }]}>
                {item.author?.name || "Unknown"}
              </ThemedText>
              <View style={styles.headerMetaRow}>
                <ThemedText style={[styles.headerSub, { color: SUBTLE }]}>
                  in {item.circle?.name || "Circle"}
                </ThemedText>
                <ThemedText style={[styles.dot]}>•</ThemedText>
                <ThemedText style={[styles.headerSub, { color: SUBTLE }]}>
                  {formatTimeAgo(item.creationdate)}
                </ThemedText>
              </View>
            </View>
          </View>

          {owner && (
            <TouchableOpacity
              onPress={() => setMenuFor({ type: "post", id: item.id })}
              style={styles.menuBtn}
            >
              <IconSymbol name="ellipsis" size={20} color={SUBTLE} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardBody}>
          {!!item.content && (
            <ThemedText style={[styles.desc, { color: TEXT }]}>
              {item.content}
            </ThemedText>
          )}
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.cardImage} />
          )}

          <View style={styles.actionsRow}>
            <LikeButton
              liked={!!item.userLiked}
              count={item.likes_count || 0}
              onPress={() => handleLikePost(item.id)}
              disabled={!user}
              SUBTLE={SUBTLE}
            />

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/post/${item.id}`)}
            >
              <IconSymbol name="bubble.left" size={18} color={SUBTLE} />
              <ThemedText style={styles.actionTxt}>
                {item.comments_count || 0}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
}

/* Styles */
const styles = StyleSheet.create({
  container: { flex: 1 },

  appHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 28, fontWeight: "800" },
  headerIcons: { flexDirection: "row", gap: 16 },

  // Search bar
  searchWrap: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },

  content: { flex: 1, paddingHorizontal: 12, paddingBottom: 16 },

  /* Card */
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: "700" },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  headerSub: { fontSize: 12 },
  dot: { fontSize: 12, color: "#94A3B8" },
  menuBtn: { padding: 6 },

  cardBody: { paddingHorizontal: 12, paddingBottom: 12 },
  cardImage: { width: "100%", height: 190 },

  eventTitle: { fontSize: 16, fontWeight: "700", marginTop: 6 },
  eventMeta: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  eventLoc: { fontSize: 13, marginTop: 6 },
  desc: { fontSize: 14, lineHeight: 22, marginTop: 6 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  actionsRow: { flexDirection: "row", gap: 18, marginTop: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionTxt: { fontSize: 13, color: "#6B7280" },

  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  emptyText: { opacity: 0.6, textAlign: "center" },

  /* Menus */
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuText: { fontSize: 16, fontWeight: "600" },

  /* Modals */
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  cancelButton: { fontSize: 16, fontWeight: "700" },
  saveButton: { fontSize: 16, fontWeight: "700" },
  modalBody: { padding: 16 },
  modalContent: { flex: 1, padding: 16 },

  /* Inputs */
  inputSection: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  circlePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  circlePillTxt: { fontSize: 12, fontWeight: "700" },
  postInput: { borderRadius: 10, padding: 12, borderWidth: 1, minHeight: 100 },
  imagePicker: {
    height: 130,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  imageSelected: { width: "100%", height: "100%", position: "relative" },
  image: { width: "100%", height: "100%" },
  imageOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  imageOverlayTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imagePickerTxt: { fontSize: 13, fontWeight: "700" },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalContent: {
    width: "85%",
    maxWidth: 300,
    borderRadius: 16,
    overflow: "hidden",
  },
  deleteModalHeader: {
    padding: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  deleteModalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  deleteModalMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
  },
  deleteModalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  cancelDeleteButton: {
    borderWidth: 1,
    borderColor: "#ddd",
  },
  /* Buttons */
  primaryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
});
