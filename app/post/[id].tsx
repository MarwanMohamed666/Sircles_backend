
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
    if (!user?.id) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await DatabaseService.deleteComment(commentId, user.id);
              
              if (error) {
                console.error('Error deleting comment:', error);
                Alert.alert('Error', 'Failed to delete comment');
                return;
              }

              await loadComments(); // Reload comments
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
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
                        backgroundColor: newComment.trim() ? tintColor : textColor + '20',
                        opacity: commentLoading ? 0.6 : 1
                      }
                    ]}
                    onPress={handleCreateComment}
                    disabled={!newComment.trim() || commentLoading}
                  >
                    <IconSymbol 
                      name="paperplane.fill" 
                      size={16} 
                      color={newComment.trim() ? '#fff' : textColor + '60'} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Comments List */}
            {comments.length > 0 ? (
              comments.map((comment: any) => (
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
                        {new Date(comment.creationdate).toLocaleDateString()}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.commentText}>
                      {comment.text}
                    </ThemedText>
                  </View>
                  {user?.id === comment.userid && (
                    <TouchableOpacity
                      style={styles.deleteCommentButton}
                      onPress={() => handleDeleteComment(comment.id)}
                    >
                      <IconSymbol name="trash" size={14} color="#EF5350" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
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
  },
  commentSubmitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deleteCommentButton: {
    padding: 4,
    marginLeft: 8,
  },
});
