
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
    console.log('🗑️ ═══════════════════════════════════════════════════════════');
    console.log('🗑️ UI FUNCTION ENTRY: handleDeleteComment called');
    console.log('🗑️ Parameters:', { commentId, hasUserId: !!user?.id, userId: user?.id });
    console.log('🗑️ Current loading state:', deleteLoading);
    console.log('🗑️ ═══════════════════════════════════════════════════════════');

    if (!user?.id) {
      console.error('🗑️ UI VALIDATION FAILED: No user ID available for delete');
      console.log('🗑️ User object:', user);
      return;
    }

    if (deleteLoading === commentId) {
      console.log('🗑️ UI DUPLICATE CALL: Delete already in progress for this comment, ignoring duplicate call');
      return;
    }

    console.log('🗑️ UI VALIDATION PASSED: All checks passed, showing alert dialog');

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {
            console.log('🗑️ UI USER ACTION: User cancelled deletion via dialog');
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ ─────────────────────────────────────────────────────────────');
            console.log('🗑️ UI DELETE CONFIRMED: User pressed Delete button');
            console.log('🗑️ About to start async delete operation...');
            console.log('🗑️ ─────────────────────────────────────────────────────────────');
            
            try {
              console.log('🗑️ UI STEP 1: Setting loading state to prevent duplicate calls');
              console.log('🗑️ Setting deleteLoading from', deleteLoading, 'to', commentId);
              setDeleteLoading(commentId);
              console.log('🗑️ UI STEP 1 COMPLETE: Loading state set');
              
              console.log('🗑️ UI STEP 2: About to call DatabaseService.deleteComment');
              console.log('🗑️ Call parameters:', { 
                commentId: commentId, 
                userId: user.id,
                userIdType: typeof user.id,
                commentIdType: typeof commentId 
              });
              
              const startTime = Date.now();
              console.log('🗑️ UI: Making database call at timestamp:', startTime);
              
              const result = await DatabaseService.deleteComment(commentId, user.id);
              
              const endTime = Date.now();
              const duration = endTime - startTime;
              console.log('🗑️ UI STEP 2 COMPLETE: DatabaseService call returned after', duration, 'ms');
              console.log('🗑️ UI: Raw result object:', result);
              console.log('🗑️ UI: Result data:', result?.data);
              console.log('🗑️ UI: Result error:', result?.error);
              
              const { data, error } = result;
              
              console.log('🗑️ UI STEP 3: Processing database result');
              console.log('🗑️ Result analysis:', { 
                hasData: !!data, 
                hasError: !!error,
                errorType: typeof error,
                errorMessage: error?.message,
                errorCode: error?.code,
                dataType: typeof data,
                dataContent: data
              });
              
              if (error) {
                console.error('🗑️ UI STEP 3 ERROR: DatabaseService returned error');
                console.error('🗑️ Error object full details:', {
                  message: error.message,
                  code: error.code,
                  stack: error.stack,
                  toString: error.toString(),
                  constructor: error.constructor.name
                });
                Alert.alert('Error', error.message || 'Failed to delete comment');
                return;
              }

              if (!data) {
                console.error('🗑️ UI STEP 3 ERROR: No data returned from delete operation');
                console.error('🗑️ This suggests the delete operation did not complete successfully');
                Alert.alert('Error', 'Delete operation failed - no data returned');
                return;
              }

              console.log('🗑️ UI STEP 3 SUCCESS: Delete operation completed successfully');
              console.log('🗑️ Returned data:', data);
              
              console.log('🗑️ UI STEP 4: Starting comment refresh');
              const refreshStartTime = Date.now();
              await loadComments();
              const refreshEndTime = Date.now();
              const refreshDuration = refreshEndTime - refreshStartTime;
              console.log('🗑️ UI STEP 4 COMPLETE: Comments refreshed in', refreshDuration, 'ms');
              
              console.log('🗑️ UI SUCCESS: Entire delete operation completed successfully');
              
            } catch (error) {
              console.error('🗑️ ═══════════════════════════════════════════════════════════');
              console.error('🗑️ UI UNEXPECTED ERROR: Caught exception in delete handler');
              console.error('🗑️ Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack',
                type: typeof error,
                constructor: error?.constructor?.name,
                stringified: String(error)
              });
              console.error('🗑️ ═══════════════════════════════════════════════════════════');
              Alert.alert('Error', `Failed to delete comment: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
              console.log('🗑️ UI CLEANUP: Clearing loading state in finally block');
              console.log('🗑️ Clearing deleteLoading from', deleteLoading, 'to null');
              setDeleteLoading(null);
              console.log('🗑️ UI CLEANUP COMPLETE: Loading state cleared');
              console.log('🗑️ ═══════════════════════════════════════════════════════════');
            }
          }
        }
      ]
    );
    
    console.log('🗑️ UI FUNCTION EXIT: handleDeleteComment alert dialog displayed');
  };

  useEffect(() => {
    loadPost();
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
          <View style={{ width: 24 }} />
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
              <ThemedText style={styles.postContent}>{post.content}</ThemedText>
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
});
