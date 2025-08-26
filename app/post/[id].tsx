import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService } from '@/lib/database';

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
  circle?: {
    id: string;
    name: string;
  };
  userLiked?: boolean;
  likes_count?: number;
}

const formatCommentTime = (creationdate: string) => {
  const date = new Date(creationdate);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
};

export default function PostScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState('');
  const [deletePostLoading, setDeletePostLoading] = useState(false);

  const loadPost = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getPost(id as string);

      if (error) {
        console.error('Error loading post:', error);
        Alert.alert('Error', 'Failed to load post');
        return;
      }

      setPost(data);
      console.log('🗑️ POST LOADED SUCCESSFULLY:');
      console.log('🗑️ - Post ID:', data?.id);
      console.log('🗑️ - Post userid:', data?.userid);
      console.log('🗑️ - Post author exists:', !!data?.author);
      console.log('🗑️ - Post author ID:', data?.author?.id);
      console.log('🗑️ - Current user ID:', user?.id);
      console.log('🗑️ - User can delete (userid match):', user?.id === data?.userid);
      console.log('🗑️ - User can delete (author match):', user?.id === data?.author?.id);
      await loadComments();
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!id) return;

    try {
      const { data, error } = await DatabaseService.getPostComments(id as string);

      if (error) {
        console.error('Error loading comments:', error);
        return;
      }

      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleCreateComment = async () => {
    if (!newComment.trim() || !user?.id || !id) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      setCommentLoading(true);
      const { data, error } = await DatabaseService.createComment(
        id as string,
        user.id,
        newComment.trim()
      );

      if (error) {
        console.error('Error creating comment:', error);
        Alert.alert('Error', 'Failed to create comment');
        return;
      }

      setNewComment('');
      await loadComments(); // Reload comments
    } catch (error) {
      console.error('Error creating comment:', error);
      Alert.alert('Error', 'Failed to create comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLikePost = async () => {
    if (!user?.id || !post?.id || likeLoading) return;

    try {
      setLikeLoading(true);

      if (post.userLiked) {
        // Unlike the post
        const { error } = await DatabaseService.unlikePost(post.id, user.id);
        if (error) {
          console.error('Error unliking post:', error);
          Alert.alert('Error', 'Failed to unlike post');
          return;
        }
      } else {
        // Like the post
        const { error } = await DatabaseService.likePost(post.id, user.id);
        if (error) {
          console.error('Error liking post:', error);
          Alert.alert('Error', 'Failed to like post');
          return;
        }
      }

      // Update the post state immediately for better UX
      setPost(prevPost => {
        if (!prevPost) return prevPost;
        return {
          ...prevPost,
          userLiked: !prevPost.userLiked,
          likes_count: prevPost.userLiked
            ? (prevPost.likes_count || 1) - 1
            : (prevPost.likes_count || 0) + 1
        };
      });

    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('Error', 'Failed to update like');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) {
      console.error('🗑️ No user ID available for delete');
      return;
    }

    if (deleteLoading === commentId) {
      console.log('🗑️ Delete already in progress for this comment, ignoring duplicate call');
      return;
    }

    try {
      console.log('🗑️ Deleting comment:', commentId);
      setDeleteLoading(commentId);

      const { data, error } = await DatabaseService.deleteComment(commentId, user.id);

      if (error) {
        console.error('🗑️ Delete failed with error:', error);
        setDeleteLoading(null);
        return;
      }

      console.log('🗑️ Comment deleted successfully, reloading comments...');
      await loadComments();
      setDeleteLoading(null);
    } catch (error) {
      console.error('🗑️ Exception during delete process:', error);
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
    setEditPostContent('');
  };

  const handleSaveEditPost = async () => {
    if (!user?.id || !post?.id || !editPostContent.trim()) {
      Alert.alert('Error', 'Please enter post content');
      return;
    }

    try {
      const { error } = await DatabaseService.updatePost(
        post.id,
        { content: editPostContent.trim() },
        user.id
      );

      if (error) {
        console.error('Error updating post:', error);
        Alert.alert('Error', 'Failed to update post');
        return;
      }

      // Update the local post state
      setPost(prevPost => 
        prevPost ? { ...prevPost, content: editPostContent.trim() } : prevPost
      );

      setIsEditingPost(false);
      setEditPostContent('');
      Alert.alert('Success', 'Post updated successfully');
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post');
    }
  };

  const handleDeletePost = async () => {
    console.log('🗑️ ═══════════════════════════════════════════════════════════');
    console.log('🗑️ DELETE POST BUTTON PRESSED - COMPREHENSIVE DEBUG');
    console.log('🗑️ ═══════════════════════════════════════════════════════════');
    console.log('🗑️ Button press detected - starting delete process');
    
    // Log current user data
    console.log('🗑️ CURRENT USER DATA:');
    console.log('🗑️ - user object exists:', !!user);
    console.log('🗑️ - user.id:', user?.id);
    console.log('🗑️ - user.id type:', typeof user?.id);
    console.log('🗑️ - full user object:', JSON.stringify(user, null, 2));
    
    // Log current post data
    console.log('🗑️ CURRENT POST DATA:');
    console.log('🗑️ - post object exists:', !!post);
    console.log('🗑️ - post.id:', post?.id);
    console.log('🗑️ - post.userid:', post?.userid);
    console.log('🗑️ - post.author exists:', !!post?.author);
    console.log('🗑️ - post.author.id:', post?.author?.id);
    console.log('🗑️ - full post object:', JSON.stringify(post, null, 2));
    
    // Log permission check results
    console.log('🗑️ PERMISSION CHECKS:');
    console.log('🗑️ - user?.id === post?.userid:', user?.id === post?.userid);
    console.log('🗑️ - user?.id === post?.author?.id:', user?.id === post?.author?.id);
    console.log('🗑️ - ID comparison details:', {
      userId: user?.id,
      postUserId: post?.userid,
      postAuthorId: post?.author?.id,
      userIdType: typeof user?.id,
      postUserIdType: typeof post?.userid,
      postAuthorIdType: typeof post?.author?.id
    });

    if (!user?.id || !post?.id) {
      console.log('🗑️ DELETE POST: Missing user or post ID');
      console.log('🗑️ - Missing user ID:', !user?.id);
      console.log('🗑️ - Missing post ID:', !post?.id);
      Alert.alert('Error', 'Cannot delete post - missing required data');
      return;
    }

    if (deletePostLoading) {
      console.log('🗑️ DELETE POST: Already deleting, ignoring');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletePostLoading(true);
              console.log('🗑️ DELETE POST: User confirmed, calling DatabaseService.deletePost');

              const { data, error } = await DatabaseService.deletePost(post.id, user.id);

              if (error) {
                console.error('🗑️ DELETE POST: Error returned:', error);
                Alert.alert('Error', error.message || 'Failed to delete post');
                return;
              }

              console.log('🗑️ DELETE POST: Success, navigating back');
              Alert.alert('Success', 'Post deleted successfully');
              router.back();

            } catch (error) {
              console.error('🗑️ DELETE POST: Exception caught:', error);
              Alert.alert('Error', 'Failed to delete post');
            } finally {
              setDeletePostLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadPost();

    // Comprehensive database service testing
    console.log('🗑️ ═══════════════════════════════════════════════════════════');
    console.log('🗑️ COMPREHENSIVE DATABASE SERVICE TESTING ON COMPONENT MOUNT');
    console.log('🗑️ ═══════════════════════════════════════════════════════════');
    console.log('🗑️ TEST 1: DatabaseService availability');
    console.log('🗑️ - DatabaseService type:', typeof DatabaseService);
    console.log('🗑️ - DatabaseService object keys:', Object.keys(DatabaseService));
    console.log('🗑️ - DatabaseService.deleteComment type:', typeof DatabaseService.deleteComment);
    console.log('🗑️ - DatabaseService.deleteComment defined:', DatabaseService.deleteComment !== undefined);

    if (DatabaseService.deleteComment) {
      console.log('🗑️ - deleteComment function length:', DatabaseService.deleteComment.length);
      console.log('🗑️ - deleteComment function name:', DatabaseService.deleteComment.name);
      console.log('🗑️ - deleteComment function preview:', DatabaseService.deleteComment.toString().substring(0, 200) + '...');
    }

    console.log('🗑️ TEST 2: Available DatabaseService functions:');
    Object.getOwnPropertyNames(DatabaseService)
      .filter(prop => typeof DatabaseService[prop] === 'function')
      .forEach(funcName => {
        console.log('🗑️ -', funcName, '(type:', typeof DatabaseService[funcName], ')');
      });

    // Test if we can make database calls
    const runDatabaseTests = async () => {
      console.log('🗑️ TEST 3: Testing database connectivity...');

      try {
        console.log('🗑️ TEST 3A: Calling getPost...');
        const testResult = await DatabaseService.getPost(id as string);
        console.log('🗑️ TEST 3A SUCCESS: getPost returned result type:', typeof testResult);
        console.log('🗑️ TEST 3A SUCCESS: getPost result structure:', Object.keys(testResult || {}));
      } catch (testError) {
        console.error('🗑️ TEST 3A FAILED: getPost error:', testError);
      }

      try {
        console.log('🗑️ TEST 3B: Testing deleteComment function directly...');
        console.log('🗑️ TEST 3B: Function exists:', typeof DatabaseService.deleteComment === 'function');

        // Don't actually call delete, just verify we can reference it
        const deleteFunc = DatabaseService.deleteComment;
        console.log('🗑️ TEST 3B SUCCESS: deleteComment function accessible');
        console.log('🗑️ TEST 3B: Function object:', {
          name: deleteFunc.name,
          length: deleteFunc.length,
          constructor: deleteFunc.constructor.name
        });
      } catch (testError) {
        console.error('🗑️ TEST 3B FAILED: deleteComment access error:', testError);
      }

      console.log('🗑️ ═══════════════════════════════════════════════════════════');
      console.log('🗑️ DATABASE SERVICE TESTING COMPLETED');
      console.log('🗑️ ═══════════════════════════════════════════════════════════');
    };

    runDatabaseTests();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>{texts.loading || 'Loading...'}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>Post not found</ThemedText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: tintColor }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: surfaceColor }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={textColor} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Post
          </ThemedText>
          {(() => {
            const canEdit = user?.id === post?.userid;
            console.log('🗑️ BUTTON VISIBILITY CHECK:');
            console.log('🗑️ - user?.id:', user?.id);
            console.log('🗑️ - post?.userid:', post?.userid);
            console.log('🗑️ - post?.author?.id:', post?.author?.id);
            console.log('🗑️ - canEdit (user?.id === post?.userid):', canEdit);
            console.log('🗑️ - isEditingPost:', isEditingPost);
            console.log('🗑️ - showButtons:', canEdit && !isEditingPost);
            
            return canEdit && !isEditingPost ? (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleEditPost} style={styles.headerActionButton}>
                  <IconSymbol name="pencil" size={24} color={textColor} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('🗑️ ======================== BUTTON CLICK DETECTED ========================');
                    console.log('🗑️ DELETE BUTTON CLICKED - About to call handleDeletePost');
                    console.log('🗑️ Click event fired at:', new Date().toISOString());
                    handleDeletePost();
                  }}
                  onPressIn={() => {
                    console.log('🗑️ BUTTON PRESS IN DETECTED');
                  }}
                  onPressOut={() => {
                    console.log('🗑️ BUTTON PRESS OUT DETECTED');
                  }}
                  style={[
                    styles.deletePostButton,
                    __DEV__ && { 
                      borderWidth: 3, 
                      borderColor: 'red',
                      backgroundColor: 'rgba(255, 0, 0, 0.3)' // More visible debug background
                    }
                  ]}
                  disabled={deletePostLoading}
                  testID="delete-post-button"
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol 
                    name="trash" 
                    size={16} 
                    color={deletePostLoading ? "#BDBDBD" : "#EF5350"} 
                  />
                  {__DEV__ && (
                    <ThemedText style={{ fontSize: 10, color: 'red', fontWeight: 'bold' }}>
                      DELETE
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            ) : null;
          })()}
          {isEditingPost && (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancelEditPost} style={styles.editActionButton}>
                <ThemedText style={[styles.editActionText, { color: textColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEditPost} style={styles.editActionButton}>
                <ThemedText style={[styles.editActionText, { color: tintColor }]}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          )}
          {user?.id !== post?.author?.id && !isEditingPost && <View style={{ width: 24 }} />}
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.postCard, { backgroundColor: surfaceColor }]}>
            {/* Post Header */}
            <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
              <View style={[styles.authorInfo, isRTL && styles.authorInfoRTL]}>
                <Image
                  source={{ uri: post.author?.avatar_url || 'https://via.placeholder.com/40' }}
                  style={styles.authorAvatar}
                />
                <View style={styles.authorDetails}>
                  <ThemedText type="defaultSemiBold">{post.author?.name || 'Unknown User'}</ThemedText>
                  <ThemedText style={styles.postTime}>
                    {new Date(post.creationdate).toLocaleDateString()}
                  </ThemedText>
                  {post.circle && (
                    <TouchableOpacity
                      onPress={() => router.push(`/circle/${post.circle!.id}`)}
                    >
                      <ThemedText style={[styles.circleLink, { color: tintColor }]}>
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
                  style={[styles.postContentInput, { backgroundColor: backgroundColor, color: textColor }]}
                  value={editPostContent}
                  onChangeText={setEditPostContent}
                  placeholder="What's on your mind?"
                  placeholderTextColor={textColor + '60'}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              ) : (
                <ThemedText style={styles.postContent}>{post.content}</ThemedText>
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
                  color={post.userLiked ? "#ff4444" : textColor}
                />
                <ThemedText style={[
                  styles.statText,
                  post.userLiked && { color: "#ff4444" }
                ]}>
                  {post.likes_count || 0} likes
                </ThemedText>
              </TouchableOpacity>
              <View style={styles.statItem}>
                <IconSymbol name="bubble.left" size={16} color={textColor} />
                <ThemedText style={styles.statText}>
                  {comments.length} comments
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Comments Section */}
          <View style={[styles.commentsSection, { backgroundColor: surfaceColor }]}>
            <ThemedText style={styles.sectionTitle}>Comments ({comments.length})</ThemedText>

            {/* Add Comment Input */}
            {user && (
              <View style={[styles.addCommentSection, { backgroundColor: backgroundColor }]}>
                <Image
                  source={{ uri: user.avatar_url || 'https://via.placeholder.com/32' }}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={[styles.commentInput, { backgroundColor: surfaceColor, color: textColor }]}
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Write a comment..."
                    placeholderTextColor={textColor + '60'}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[
                      styles.commentSubmitButton,
                      {
                        backgroundColor: newComment.trim() ? tintColor : 'transparent',
                        opacity: commentLoading ? 0.6 : 1,
                        transform: [{ scale: newComment.trim() ? 1 : 0.8 }]
                      }
                    ]}
                    onPress={handleCreateComment}
                    disabled={!newComment.trim() || commentLoading}
                    activeOpacity={newComment.trim() ? 0.8 : 1}
                  >
                    <IconSymbol
                      name={newComment.trim() ? "paperplane.fill" : "paperplane.fill"}
                      size={16}
                      color={newComment.trim() ? '#fff' : textColor + '40'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Comments List */}
            {comments.length > 0 ? (
              comments.map((comment: any) => {
                const canDelete = user?.id === comment.userid;
                console.log('🗑️ DETAILED Comment check:', {
                  commentId: comment.id,
                  commentText: comment.text?.substring(0, 20) + '...',
                  commentUserId: comment.userid,
                  currentUserId: user?.id,
                  canDelete: canDelete,
                  userIdType: typeof user?.id,
                  commentUserIdType: typeof comment.userid,
                  userIdMatch: user?.id === comment.userid,
                  authorName: comment.author?.name
                });

                return (
                  <View key={comment.id} style={styles.commentItem}>
                    <Image
                      source={{ uri: comment.author?.avatar_url || 'https://via.placeholder.com/32' }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <ThemedText style={styles.commentAuthor}>
                          {comment.author?.name || 'Unknown User'}
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
                          deleteLoading === comment.id && styles.deleteCommentButtonDisabled
                        ]}
                        onPress={() => {
                          if (deleteLoading === comment.id) return;

                          console.log('🗑️ Delete button pressed for comment:', comment.id);
                          console.log('🗑️ Button press context:', {
                            userId: user?.id,
                            commentUserId: comment.userid,
                            canDelete
                          });
                          handleDeleteComment(comment.id);
                        }}
                        disabled={deleteLoading === comment.id}
                        testID={`delete-comment-${comment.id}`}
                      >
                        <IconSymbol
                          name="trash"
                          size={16}
                          color={deleteLoading === comment.id ? "#BDBDBD" : "#EF5350"}
                        />
                      </TouchableOpacity>
                    )}
                    {/* Temporary debug indicator */}
                    {__DEV__ && (
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: canDelete ? 'green' : 'red',
                        width: 10,
                        height: 10,
                        borderRadius: 5
                      }} />
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCommentsContainer}>
                <IconSymbol name="bubble.left" size={48} color={textColor + '30'} />
                <ThemedText style={styles.emptyText}>No comments yet</ThemedText>
                <ThemedText style={styles.emptySubText}>Be the first to share your thoughts!</ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  postCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorInfoRTL: {
    flexDirection: 'row-reverse',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorDetails: {
    flex: 1,
  },
  postTime: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  circleLink: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  postContentContainer: {
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    opacity: 0.7,
  },
  commentsSection: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 11,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptySubText: {
    textAlign: 'center',
    opacity: 0.4,
    fontSize: 12,
    marginTop: 4,
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  addCommentSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    maxHeight: 100,
    fontSize: 14,
    textAlignVertical: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  commentSubmitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deleteCommentButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    minHeight: 28,
  },
  deleteCommentButtonDisabled: {
    backgroundColor: 'rgba(189, 189, 189, 0.1)',
    opacity: 0.6,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  postContentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    padding: 4,
  },
  deletePostButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
});