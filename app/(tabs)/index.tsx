import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, RefreshControl, Alert, Modal, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

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
  } | null;
  circle: {
    name: string;
  } | null;
  likes: any[];
  comments: any[];
  likes_count?: number;
  userLiked?: boolean;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'textColor');

  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedCircle, setSelectedCircle] = useState<string>('');
  const [userCircles, setUserCircles] = useState<any[]>([]);
  const [selectedPostImage, setSelectedPostImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

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
        console.error('Error loading posts:', error);
        setError('Unable to load posts. Please try again.');
        setPosts([]);
      } else {
        // Ensure data is of type Post[] and add userLiked and likes_count if not present
        const postsWithLikes = (data || []).map((post: any) => ({
          ...post,
          likes_count: post.likes?.length || 0,
          userLiked: post.likes?.some((like: any) => like.userid === user.id) || false,
        }));
        setPosts(postsWithLikes);
        setError(null);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Unable to load posts. Please try again.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      console.log('Loading events for home feed...');
      const { data, error } = await DatabaseService.getEvents();
      if (error) {
        console.error('Error loading events:', error);
      } else {
        console.log('Events loaded successfully:', data?.length);
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const combineFeedItems = () => {
    const combined = [
      ...posts.map(post => ({ ...post, type: 'post', sortDate: new Date(post.createdat || post.creationdate) })),
      ...events.map(event => ({ ...event, type: 'event', sortDate: new Date(event.date) }))
    ];

    // Sort by date (newest first for posts, upcoming first for events)
    combined.sort((a, b) => {
      if (a.type === 'event' && b.type === 'post') {
        // Show upcoming events before posts
        if (new Date(a.date) > new Date()) return -1;
        return 1;
      }
      if (a.type === 'post' && b.type === 'event') {
        // Show upcoming events before posts
        if (new Date(b.date) > new Date()) return 1;
        return -1;
      }
      // Same type sorting
      return b.sortDate.getTime() - a.sortDate.getTime();
    });

    setFeedItems(combined);
    setLoading(false);
  };

  const loadUserCircles = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await DatabaseService.getUserJoinedCircles(user.id);
      if (error) {
        console.error('Error loading user circles:', error);
        return;
      }

      const circleDetails = await Promise.all(
        (data || []).map(async (uc) => {
          const { data: circles } = await DatabaseService.getCircles();
          const circle = circles?.find(c => c.id === uc.circleid);
          return circle;
        })
      );

      setUserCircles(circleDetails.filter(Boolean));
    } catch (error) {
      console.error('Error loading user circles:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPosts(), loadEvents(), loadUserCircles()]);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      Promise.all([loadPosts(), loadEvents(), loadUserCircles()]);
    }
  }, [user]);

  useEffect(() => {
    combineFeedItems();
  }, [posts, events]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedPostImage(result.assets[0]);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    try {
      // Find the post in our current posts array
      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex === -1) return;

      const post = posts[postIndex];
      const isCurrentlyLiked = post.userLiked;
      const originalPosts = [...posts]; // Store original state for rollback

      // Optimistically update UI
      const updatedPosts = [...posts];
      updatedPosts[postIndex] = {
        ...post,
        userLiked: !isCurrentlyLiked,
        likes_count: isCurrentlyLiked ? Math.max(0, (post.likes_count || 1) - 1) : (post.likes_count || 0) + 1
      };
      setPosts(updatedPosts);

      // Make API call
      const { error } = isCurrentlyLiked
        ? await DatabaseService.unlikePost(postId, user.id)
        : await DatabaseService.likePost(postId, user.id);

      if (error) {
        console.error('Error toggling like:', error);
        // Revert to original state on error
        setPosts(originalPosts);
        Alert.alert('Error', 'Failed to update like');
      }
    } catch (error) {
      console.error('Error handling like:', error);
      // Revert to original state on error
      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex !== -1) {
        const originalPosts = [...posts];
        originalPosts[postIndex] = {
          ...originalPosts[postIndex],
          userLiked: originalPosts[postIndex].userLiked,
          likes_count: originalPosts[postIndex].likes_count
        };
        setPosts(originalPosts);
      }
      Alert.alert('Error', 'Failed to update like');
    }
  };


  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !selectedCircle) {
      Alert.alert('Error', 'Please enter post content and select a circle');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create posts');
      return;
    }

    try {
      let imageUrl = undefined;
      if (selectedPostImage) {
        const uploadResponse = await DatabaseService.uploadImage(selectedPostImage);
        if (uploadResponse.error) {
          Alert.alert('Error', 'Failed to upload image');
          return;
        }
        imageUrl = uploadResponse.url;
      }

      const { error } = await DatabaseService.createPost({
        userid: user.id,
        content: newPostContent.trim(),
        circleid: selectedCircle,
        image: imageUrl,
      });

      if (error) {
        Alert.alert('Error', 'Failed to create post');
        return;
      }

      Alert.alert('Success', 'Post created successfully!');
      setNewPostContent('');
      setSelectedCircle('');
      setSelectedPostImage(null);
      setShowPostModal(false);
      await loadPosts();
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
    }
  };

  const renderEvent = ({ item }: { item: any }) => (
    <View style={[styles.postCard, { backgroundColor: surfaceColor }]}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: tintColor }]}>
            <ThemedText style={styles.avatarText}>
              📅
            </ThemedText>
          </View>
          <View style={styles.userDetails}>
            <ThemedText style={styles.userName}>
              {item.circle?.name || 'Unknown Circle'}
            </ThemedText>
            <ThemedText style={styles.postTime}>
              Event • {new Date(item.date).toLocaleDateString()} at {item.time}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.postContent}>
        <ThemedText style={styles.eventTitle}>{item.title}</ThemedText>
        {item.description && (
          <ThemedText style={styles.postText}>{item.description}</ThemedText>
        )}
        {item.location && (
          <ThemedText style={styles.eventLocation}>📍 {item.location}</ThemedText>
        )}

        {/* Event Interests */}
        {item.event_interests && item.event_interests.length > 0 && (
          <View style={styles.eventInterests}>
            {item.event_interests.map((ei: any) => (
              <View
                key={ei.interests.id}
                style={[styles.eventInterestChip, { backgroundColor: tintColor + '20', borderColor: tintColor }]}
              >
                <ThemedText style={[styles.eventInterestText, { color: tintColor }]}>
                  {ei.interests.title}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <View key={item.id} style={[styles.postCard, { backgroundColor: surfaceColor }]}>
      {/* Post Header */}
      <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
        <View style={[styles.authorInfo, isRTL && styles.authorInfoRTL]}>
          <Image
            source={{ uri: item.author?.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.authorAvatar}
          />
          <View style={styles.authorDetails}>
            <ThemedText type="defaultSemiBold" style={styles.authorName}>
              {item.author?.name || 'Unknown User'}
            </ThemedText>
            <View style={[styles.postMeta, isRTL && styles.postMetaRTL]}>
              <ThemedText style={styles.circleName}>
                in {item.circle?.name || 'Unknown Circle'}
              </ThemedText>
              <ThemedText style={styles.postTime}>
                • {formatTimeAgo(item.creationdate)}
              </ThemedText>
            </View>
          </View>
        </View>
        <TouchableOpacity>
          <IconSymbol name="ellipsis" size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <View style={styles.postContentContainer}>
        <ThemedText style={[styles.postContent, isRTL && styles.rtlText]}>
          {item.content}
        </ThemedText>
      </View>

      {/* Post Image */}
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} />
      )}

      {/* Post Actions */}
      <View style={[styles.postActions, isRTL && styles.postActionsRTL]}>
        <TouchableOpacity style={[styles.actionButton, isRTL && styles.actionButtonRTL]} onPress={() => handleLikePost(item.id)}>
          <IconSymbol 
            name={item.userLiked ? "heart.fill" : "heart"} 
            size={20} 
            color={item.userLiked ? "#ff4444" : textColor} 
          />
          <ThemedText style={[styles.actionText, item.userLiked && { color: "#ff4444" }]}>
            {item.likes_count || 0}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, isRTL && styles.actionButtonRTL]}
          onPress={() => router.push(`/post/${item.id}`)}
        >
          <IconSymbol name="message" size={20} color={textColor} />
          <ThemedText style={styles.actionText}>
            {item.comments?.length || 0}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, isRTL && styles.actionButtonRTL]}>
          <IconSymbol name="square.and.arrow.up" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <IconSymbol name="person.circle" size={64} color={textColor + '40'} />
          <ThemedText style={styles.emptyText}>
            Please log in to see posts from your circles
          </ThemedText>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: tintColor }]}
            onPress={() => router.push('/login')}
          >
            <ThemedText style={styles.loginButtonText}>
              {texts.login || 'Login'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {texts.home || 'Home'}
        </ThemedText>
        <View style={[styles.headerButtons, isRTL && styles.headerButtonsRTL]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <IconSymbol name="message" size={24} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <IconSymbol name="bell" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.centeredContainer}>
            <ThemedText>{texts.loading || 'Loading...'}</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centeredContainer}>
            <IconSymbol name="exclamationmark.triangle" size={64} color="#EF5350" />
            <ThemedText style={styles.emptyText}>{error}</ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: tintColor }]}
              onPress={loadPosts}
            >
              <ThemedText style={styles.retryButtonText}>
                {texts.retry || 'Retry'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : feedItems.length === 0 ? (
          <View style={styles.centeredContainer}>
            <IconSymbol name="doc.text" size={64} color={textColor + '40'} />
            <ThemedText style={styles.emptyText}>
              No posts or events yet
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Join some circles or check for events!
            </ThemedText>
            <TouchableOpacity
              style={[styles.exploreButton, { backgroundColor: tintColor }]}
              onPress={() => router.push('/circles')}
            >
              <ThemedText style={styles.exploreButtonText}>
                Explore Circles
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={feedItems}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={({ item }) => {
              if (item.type === 'post') {
                return renderPost({ item });
              } else {
                return renderEvent({ item });
              }
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>No posts or events yet</ThemedText>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {user && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: tintColor }]}
          onPress={() => setShowPostModal(true)}
        >
          <IconSymbol name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Post Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create Post</ThemedText>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <IconSymbol name="xmark" size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Circle Selection */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.inputLabel}>Select Circle:</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.circleSelector}>
                  {userCircles.map((circle) => (
                    <TouchableOpacity
                      key={circle.id}
                      style={[
                        styles.circleOption,
                        {
                          backgroundColor: selectedCircle === circle.id ? tintColor : backgroundColor,
                          borderColor: tintColor
                        }
                      ]}
                      onPress={() => setSelectedCircle(circle.id)}
                    >
                      <ThemedText style={[
                        styles.circleOptionText,
                        { color: selectedCircle === circle.id ? '#fff' : textColor }
                      ]}>
                        {circle.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Post Content Input */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.inputLabel}>What's on your mind?</ThemedText>
                <TextInput
                  style={[styles.postInput, { backgroundColor: backgroundColor, color: textColor }]}
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                  placeholder="Share your thoughts..."
                  placeholderTextColor={textColor + '60'}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Image Picker */}
              <View style={styles.inputSection}>
                <ThemedText style={styles.inputLabel}>Add Photo:</ThemedText>
                <TouchableOpacity onPress={pickImage} style={[styles.imagePickerButton, { backgroundColor: backgroundColor, borderColor: tintColor }]}>
                  {selectedPostImage ? (
                    <View style={styles.selectedImageContainer}>
                      <Image source={{ uri: selectedPostImage.uri }} style={styles.selectedPostImage} />
                      <View style={styles.imageOverlay}>
                        <IconSymbol name="photo" size={24} color="#fff" />
                        <ThemedText style={styles.changeImageText}>Change Photo</ThemedText>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <IconSymbol name="photo" size={32} color={tintColor} />
                      <ThemedText style={[styles.imagePickerText, { color: tintColor }]}>Tap to select a photo</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: backgroundColor }]}
                onPress={() => {
                  setShowPostModal(false);
                  setSelectedPostImage(null);
                }}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handleCreatePost}
              >
                <ThemedText style={{ color: '#fff' }}>Post</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  postsList: {
    padding: 16,
    gap: 16,
  },
  postCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 16,
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  userDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postMetaRTL: {
    flexDirection: 'row-reverse',
  },
  circleName: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 12,
    opacity: 0.5,
    marginLeft: 4,
  },
  postContentContainer: {
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  postText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventLocation: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 8,
  },
  eventInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  eventInterestChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  eventInterestText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  postActionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonRTL: {
    flexDirection: 'row-reverse',
  },
  actionText: {
    fontSize: 14,
    opacity: 0.7,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    opacity: 0.6,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
  },
  loginButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rtlText: {
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  circleSelector: {
    flexDirection: 'row',
  },
  circleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  circleOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  postInput: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
    maxHeight: 200,
  },
  imagePickerButton: {
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  selectedImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  selectedPostImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.5,
  },
});