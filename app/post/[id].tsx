import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { DatabaseService } from "@/lib/database";

/* =========================
   DESIGN TOKENS (edit here)
   ========================= */
const UI = {
  colors: {
    // Base
    background: "#FFFFFF",
    surface: "#FFFFFF",
    text: "#0F172A", // slate-900
    textMuted: "rgba(15,23,42,0.6)",
    border: "#E5E7EB", // gray-200
    // Brand
    primary: "#16A34A", // green-600
    primaryTextOn: "#FFFFFF",
    danger: "#EF4444",
    dangerBg: "rgba(239,68,68,0.08)",
    mutedIcon: "rgba(15,23,42,0.4)",

    like: "#EF4444", // أحمر للايك
    likeBg: "rgba(239,68,68,0.08)",
    inputMintBg: "#EAF7EF", // خلفية الانبوت
    inputMintBorder: "#CFE9DB", // حافة خفيفة
    inputMintPlaceholder: "rgba(22,163,74,0.7)", // أخضر باهت للplaceholder
    inputMintBtn: "#22C55E", // زر الإرسال
    inputMintBtnDim: "rgba(34,197,94,0.25)",
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  },
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
};

interface Post {
  id: string;
  content: string;
  image?: string;
  creationdate: string;
  author: {
    name: string;
    avatar_url?: string;
  };
  likes: any[];
  comments: any[];
  circle?: { id: string; name: string };
  userLiked?: boolean;
  likes_count?: number;
  userid?: string;
}

const formatCommentTime = (creationdate: string) => {
  const date = new Date(creationdate);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

export default function PostScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState("");
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const sendPos = isRTL ? { left: 8 } : { right: 8 };
  const blockShift = isRTL ? { marginRight: -20 } : { marginLeft: -10 };
  const loadComments = async () => {
    if (!id) return;
    try {
      const { data, error } = await DatabaseService.getPostComments(
        id as string
      );
      if (error) {
        console.error("Error loading comments:", error);
        return;
      }
      setComments(data || []);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const loadPost = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getPost(id as string);
      if (error) {
        console.error("Error loading post:", error);
        Alert.alert("Error", "Failed to load post");
        return;
      }
      setPost(data);
      await loadComments();
    } catch (error) {
      console.error("Error loading post:", error);
      Alert.alert("Error", "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async () => {
    if (!newComment.trim() || !user?.id || !id) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }
    try {
      setCommentLoading(true);
      const { error } = await DatabaseService.createComment(
        id as string,
        user.id,
        newComment.trim()
      );
      if (error) {
        console.error("Error creating comment:", error);
        Alert.alert("Error", "Failed to create comment");
        return;
      }
      setNewComment("");
      await loadComments();
    } catch (error) {
      console.error("Error creating comment:", error);
      Alert.alert("Error", "Failed to create comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLikePost = async () => {
    if (!user?.id || !post?.id || likeLoading) return;
    try {
      setLikeLoading(true);
      if (post.userLiked) {
        const { error } = await DatabaseService.unlikePost(post.id, user.id);
        if (error) {
          console.error("Error unliking post:", error);
          Alert.alert("Error", "Failed to unlike post");
          return;
        }
      } else {
        const { error } = await DatabaseService.likePost(post.id, user.id);
        if (error) {
          console.error("Error liking post:", error);
          Alert.alert("Error", "Failed to like post");
          return;
        }
      }
      setPost((prev) =>
        prev
          ? {
              ...prev,
              userLiked: !prev.userLiked,
              likes_count: prev.userLiked
                ? (prev.likes_count || 1) - 1
                : (prev.likes_count || 0) + 1,
            }
          : prev
      );
    } catch (error) {
      console.error("Error handling like:", error);
      Alert.alert("Error", "Failed to update like");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) return;
    if (deleteLoading === commentId) return;
    try {
      setDeleteLoading(commentId);
      const { error } = await DatabaseService.deleteComment(commentId, user.id);
      if (error) {
        console.error("Delete comment error:", error);
        setDeleteLoading(null);
        return;
      }
      await loadComments();
      setDeleteLoading(null);
    } catch (error) {
      console.error("Exception deleting comment:", error);
      setDeleteLoading(null);
    }
  };

  const handleEditPost = () => {
    if (post?.content) {
      setEditPostContent(post.content);
      setIsEditingPost(true);
    }
  };
  const handleCancelEditPost = () => {
    setIsEditingPost(false);
    setEditPostContent("");
  };

  const handleSaveEditPost = async () => {
    if (!user?.id || !post?.id || !editPostContent.trim()) {
      Alert.alert("Error", "Please enter post content");
      return;
    }
    try {
      const { error } = await DatabaseService.updatePost(
        post.id,
        { content: editPostContent.trim() },
        user.id
      );
      if (error) {
        console.error("Update post error:", error);
        Alert.alert("Error", "Failed to update post");
        return;
      }
      setPost((prev) =>
        prev ? { ...prev, content: editPostContent.trim() } : prev
      );
      setIsEditingPost(false);
      setEditPostContent("");
      Alert.alert("Success", "Post updated successfully");
    } catch (error) {
      console.error("Error updating post:", error);
      Alert.alert("Error", "Failed to update post");
    }
  };

  const handleDeletePost = () => setIsDeletingPost(true);
  const handleCancelDeletePost = () => setIsDeletingPost(false);
  const handleConfirmDeletePost = async () => {
    if (!user?.id || !post?.id) {
      Alert.alert("Error", "Cannot delete post - missing required data");
      return;
    }
    try {
      const { error } = await DatabaseService.deletePost(post.id, user.id);
      if (error) {
        console.error("Delete post error:", error);
        Alert.alert("Error", error.message || "Failed to delete post");
        return;
      }
      router.replace("/(tabs)/");
      setTimeout(() => {
        Alert.alert("Success", "Post deleted successfully");
      }, 100);
    } catch (error) {
      console.error("Error deleting post:", error);
      Alert.alert("Error", "Failed to delete post");
    } finally {
      setIsDeletingPost(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: UI.colors.background }]}
      >
        <View style={styles.centeredContainer}>
          <ThemedText>{texts.loading || "Loading..."}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: UI.colors.background }]}
      >
        <View style={styles.centeredContainer}>
          <ThemedText>Post not found</ThemedText>
          <TouchableOpacity
            style={[styles.ctaButton]}
            onPress={() => router.back()}
            hitSlop={UI.hitSlop}
          >
            <ThemedText style={styles.ctaButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: UI.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={UI.hitSlop}>
            <IconSymbol name="chevron.left" size={24} color={UI.colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Post
          </ThemedText>

          {user?.id === post?.userid && !isEditingPost && !isDeletingPost && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleEditPost}
                style={styles.headerIconBtn}
                hitSlop={UI.hitSlop}
              >
                <IconSymbol name="pencil" size={20} color={UI.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeletePost}
                style={styles.headerIconBtn}
                hitSlop={UI.hitSlop}
              >
                <IconSymbol name="trash" size={20} color={UI.colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          {isEditingPost && (
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={handleCancelEditPost}
                style={styles.textBtn}
                hitSlop={UI.hitSlop}
              >
                <ThemedText style={[styles.textBtnLabel]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEditPost}
                style={styles.ghostPrimaryBtn}
                hitSlop={UI.hitSlop}
              >
                <ThemedText style={[styles.ghostPrimaryBtnLabel]}>
                  Save
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {isDeletingPost && (
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={handleCancelDeletePost}
                style={styles.textBtn}
                hitSlop={UI.hitSlop}
              >
                <ThemedText style={[styles.textBtnLabel]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmDeletePost}
                style={styles.dangerTextBtn}
                hitSlop={UI.hitSlop}
              >
                <ThemedText style={styles.dangerTextBtnLabel}>
                  Delete
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {user?.id !== post?.userid && !isEditingPost && !isDeletingPost && (
            <View style={{ width: 24 }} />
          )}
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.postCard]}>
            {/* Post Header */}
            <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
              <View style={[styles.authorInfo, isRTL && styles.authorInfoRTL]}>
                <Image
                  source={{
                    uri:
                      post.author?.avatar_url ||
                      "https://via.placeholder.com/40",
                  }}
                  style={styles.authorAvatar}
                />
                <View style={styles.authorDetails}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: UI.colors.text }}
                  >
                    {post.author?.name || "Unknown User"}
                  </ThemedText>
                  <ThemedText style={[styles.postTime]}>
                    {new Date(post.creationdate).toLocaleDateString()}
                  </ThemedText>
                  {post.circle && (
                    <TouchableOpacity
                      onPress={() => router.push(`/circle/${post.circle!.id}`)}
                      hitSlop={UI.hitSlop}
                    >
                      <ThemedText style={[styles.circleLink]}>
                        in {post.circle.name}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Post Content */}
            <View style={styles.postContentContainer}>
              {isEditingPost ? (
                <TextInput
                  style={[styles.postContentInput]}
                  value={editPostContent}
                  onChangeText={setEditPostContent}
                  placeholder="What's on your mind?"
                  placeholderTextColor={UI.colors.mutedIcon}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              ) : isDeletingPost ? (
                <View style={styles.deleteConfirmationContainer}>
                  <ThemedText style={styles.deleteConfirmationText}>
                    Are you sure you want to delete this post?
                  </ThemedText>
                  <ThemedText style={styles.deleteWarningText}>
                    This action cannot be undone.
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.postContent}>
                  {post.content}
                </ThemedText>
              )}
            </View>

            {/* Post Image */}
            {post.image && (
              <Image source={{ uri: post.image }} style={styles.postImage} />
            )}

            {/* Post Stats */}
            <View style={styles.postStats}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={handleLikePost}
                disabled={likeLoading}
              >
                <IconSymbol
                  name={post.userLiked ? "heart.fill" : "heart"}
                  size={16}
                  color={post.userLiked ? UI.colors.like : UI.colors.text}
                />
                <ThemedText
                  style={[
                    styles.statText,
                    post.userLiked && { color: UI.colors.like },
                  ]}
                >
                  {post.likes_count || 0} likes
                </ThemedText>
              </TouchableOpacity>

              <View style={styles.statItem}>
                <IconSymbol
                  name="bubble.left"
                  size={16}
                  color={UI.colors.mutedIcon}
                />
                <ThemedText style={styles.statText}>
                  {comments.length} comments
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <ThemedText style={styles.sectionTitle}>
              Comments ({comments.length})
            </ThemedText>

            {/* Add Comment */}
            {user && (
              <View style={[styles.addCommentMint, blockShift]}>
                <Image
                  source={{
                    uri: user.avatar_url || "https://via.placeholder.com/32",
                  }}
                  style={styles.commentAvatar}
                />

                <View style={styles.mintInputWrapper}>
                  <TextInput
                    style={styles.mintInput}
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Type a comment..."
                    placeholderTextColor={UI.colors.inputMintPlaceholder}
                    multiline
                    maxLength={500}
                  />

                  <TouchableOpacity
                    style={[
                      styles.mintSendBtn,
                      sendPos,
                      !newComment.trim() && styles.mintSendBtnDisabled,
                    ]}
                    onPress={handleCreateComment}
                    disabled={!newComment.trim() || commentLoading}
                    activeOpacity={newComment.trim() ? 0.85 : 1}
                  >
                    <IconSymbol
                      name="paperplane.fill"
                      size={16}
                      color={
                        newComment.trim()
                          ? UI.colors.primaryTextOn
                          : UI.colors.inputMintPlaceholder
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Comments List */}
            {comments.length > 0 ? (
              comments.map((comment: any) => {
                const canDelete = user?.id === comment.userid;
                return (
                  <View key={comment.id} style={styles.commentItem}>
                    <Image
                      source={{
                        uri:
                          comment.author?.avatar_url ||
                          "https://via.placeholder.com/32",
                      }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <ThemedText style={styles.commentAuthor}>
                          {comment.author?.name || "Unknown User"}
                        </ThemedText>
                        <ThemedText style={styles.commentTime}>
                          {formatCommentTime(comment.creationdate)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.commentText}>
                        {comment.text}
                      </ThemedText>
                    </View>

                    {canDelete && (
                      <TouchableOpacity
                        style={[
                          styles.deleteCommentButton,
                          deleteLoading === comment.id &&
                            styles.deleteCommentButtonDisabled,
                        ]}
                        onPress={() => {
                          if (deleteLoading !== comment.id)
                            handleDeleteComment(comment.id);
                        }}
                        disabled={deleteLoading === comment.id}
                        testID={`delete-comment-${comment.id}`}
                        hitSlop={UI.hitSlop}
                      >
                        <IconSymbol
                          name="trash"
                          size={16}
                          color={
                            deleteLoading === comment.id
                              ? "#BDBDBD"
                              : UI.colors.danger
                          }
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCommentsContainer}>
                <IconSymbol
                  name="bubble.left"
                  size={48}
                  color="rgba(15,23,42,0.2)"
                />
                <ThemedText style={styles.emptyText}>
                  No comments yet
                </ThemedText>
                <ThemedText style={styles.emptySubText}>
                  Be the first to share your thoughts!
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/* ================
   STYLES
   ================ */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: UI.spacing.lg,
    paddingVertical: UI.spacing.md,
    backgroundColor: UI.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI.colors.border,
  },
  headerTitle: { fontSize: 18, color: UI.colors.text },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.spacing.sm,
  },
  headerIconBtn: { padding: UI.spacing.xs, borderRadius: UI.radius.sm },

  content: {
    flex: 1,
    padding: UI.spacing.lg,
    backgroundColor: UI.colors.background,
  },

  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: UI.spacing.lg,
    backgroundColor: UI.colors.background,
  },

  ctaButton: {
    backgroundColor: UI.colors.primary,
    paddingHorizontal: UI.spacing.lg,
    paddingVertical: UI.spacing.sm,
    borderRadius: UI.radius.sm,
  },
  ctaButtonText: { color: UI.colors.primaryTextOn, fontWeight: "600" },

  postCard: {
    padding: UI.spacing.lg,
    borderRadius: UI.radius.md,
    marginBottom: UI.spacing.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.card,
  },

  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: UI.spacing.md,
  },
  postHeaderRTL: { flexDirection: "row-reverse" },
  authorInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  authorInfoRTL: { flexDirection: "row-reverse" },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: UI.spacing.sm,
  },
  authorDetails: { flex: 1 },
  postTime: { fontSize: 12, color: UI.colors.textMuted, marginTop: 2 },
  circleLink: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    color: UI.colors.primary,
  },

  postContentContainer: { marginBottom: UI.spacing.md },
  postContent: { fontSize: 16, lineHeight: 24, color: UI.colors.text },

  postImage: {
    width: "100%",
    height: 200,
    borderRadius: UI.radius.sm,
    marginBottom: UI.spacing.md,
  },

  postStats: {
    flexDirection: "row",
    gap: UI.spacing.lg,
    paddingTop: UI.spacing.md,
    borderTopWidth: 1,
    borderTopColor: UI.colors.border,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, color: UI.colors.textMuted },

  commentsSection: {
    padding: UI.spacing.lg,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: UI.spacing.md,
    color: UI.colors.text,
  },

  commentItem: {
    flexDirection: "row",
    marginBottom: UI.spacing.md,
    gap: UI.spacing.sm,
  },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentContent: { flex: 1 },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
    color: UI.colors.text,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    color: UI.colors.text,
  },
  commentTime: { fontSize: 11, color: UI.colors.textMuted },

  emptyText: {
    textAlign: "center",
    color: UI.colors.textMuted,
    fontStyle: "italic",
    marginTop: UI.spacing.sm,
  },
  emptySubText: {
    textAlign: "center",
    color: "rgba(15,23,42,0.4)",
    fontSize: 12,
    marginTop: 4,
  },
  emptyCommentsContainer: {
    alignItems: "center",
    paddingVertical: UI.spacing.xxl,
    gap: UI.spacing.sm,
  },

  addCommentSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: UI.spacing.md,
    borderRadius: UI.radius.sm,
    marginBottom: UI.spacing.lg,
    gap: UI.spacing.sm,
    backgroundColor: UI.colors.background,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: UI.spacing.sm,
  },
  commentInput: {
    flex: 1,
    borderRadius: UI.radius.pill,
    paddingHorizontal: UI.spacing.md,
    paddingVertical: UI.spacing.sm,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 14,
    textAlignVertical: "center",
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surface,
    color: UI.colors.text,
  },

  primaryFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.colors.primary,
  },
  primaryFabDisabled: { backgroundColor: "rgba(22,163,74,0.12)" },

  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  deleteCommentButton: {
    padding: 6,
    marginLeft: UI.spacing.sm,
    borderRadius: UI.radius.xs,
    backgroundColor: UI.colors.likeBg,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    minHeight: 28,
  },

  deleteCommentButtonDisabled: {
    backgroundColor: "rgba(189,189,189,0.1)",
    opacity: 0.6,
  },

  editActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.spacing.sm,
  },
  textBtn: { paddingHorizontal: UI.spacing.sm, paddingVertical: UI.spacing.xs },
  textBtnLabel: { fontSize: 16, fontWeight: "600", color: UI.colors.text },
  ghostPrimaryBtn: {
    paddingHorizontal: UI.spacing.sm,
    paddingVertical: UI.spacing.xs,
    borderRadius: UI.radius.xs,
  },
  ghostPrimaryBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: UI.colors.primary,
  },

  postContentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.sm,
    padding: UI.spacing.md,
    textAlignVertical: "top",
    backgroundColor: UI.colors.surface,
    color: UI.colors.text,
  },

  deleteConfirmationContainer: {
    padding: UI.spacing.lg,
    backgroundColor: UI.colors.dangerBg,
    borderRadius: UI.radius.sm,
    alignItems: "center",
  },
  deleteConfirmationText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: UI.spacing.sm,
    textAlign: "center",
    color: UI.colors.danger,
  },
  deleteWarningText: {
    fontSize: 14,
    color: UI.colors.textMuted,
    textAlign: "center",
  },

  dangerTextBtn: {
    paddingHorizontal: UI.spacing.sm,
    paddingVertical: UI.spacing.xs,
  },
  dangerTextBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: UI.colors.danger,
  },
  addCommentMint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: UI.spacing.sm,
    marginBottom: UI.spacing.lg,
  },

  mintInputWrapper: {
    flex: 1,
    position: "relative",
  },

  mintInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: UI.spacing.lg,
    paddingRight: 64, // مساحة للزر (سيتم عكسها في RTL تلقائيًا بالsendPos)
    minHeight: 48,
    maxHeight: 120,
    fontSize: 14,
    lineHeight: 20,
    borderRadius: 24,
    backgroundColor: UI.colors.inputMintBg,
    borderWidth: 1,
    borderColor: UI.colors.inputMintBorder,
    color: UI.colors.text,
    textAlignVertical: "center",
    includeFontPadding: false, // أندرويد
  },

  mintSendBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -18, // نصف ارتفاع الزر لتمركز رأسي
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.colors.inputMintBtn,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  mintSendBtnDisabled: {
    backgroundColor: UI.colors.inputMintBtnDim,
  },
});
