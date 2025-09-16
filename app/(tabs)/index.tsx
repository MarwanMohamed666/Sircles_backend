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
import { CircleCard } from '@/components/CircleCard';
import { useCirclesStore } from '@/stores/circlesStore';

interface Post {
  id: string;
  content: string;
  image?: string;
  creationdate: string;
  author: {
    id: string; // Added id for comparison
    name: string;
    avatar_url?: string;
  } | null;
  circle: {
    name: string;
    circle_interests?: { interests: { id: string, title: string } }[]
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
  const [userInterests, setUserInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedCircle, setSelectedCircle] = useState<string>('');
  const [userCircles, setUserCircles] = useState<any[]>([]);
  const [selectedPostImage, setSelectedPostImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [editingPost, setEditingPost] = useState<{id: string, content: string} | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [deletePostLoading, setDeletePostLoading] = useState<string | null>(null);
  // Remove local suggested circles state - now managed by store
  const { suggested: suggestedCircles, loading: suggestedLoading, loadSuggested, dismiss, snooze, error: circlesError } = useCirclesStore();

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
        setError('Unable to load events. Please try again.');
      } else {
        console.log('Events loaded successfully:', data?.length);
        setEvents(data || []);
        setError(null);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Unable to load events. Please try again.');
    }
  };

  const calculateInterestScore = (item: any) => {
    if (!userInterests || userInterests.length === 0) return 0;

    let itemInterests: string[] = [];

    if (item.type === 'event') {
      // Events use their direct interests
      itemInterests = item.event_interests?.map((ei: any) => ei.interests?.id).filter(Boolean) || [];
    } else if (item.type === 'post') {
      // Posts use their circle's interests
      itemInterests = item.circle?.circle_interests?.map((ci: any) => ci.interests?.id).filter(Boolean) || [];
    }

    if (!itemInterests.length) return 0;

    // Calculate number of matching interests
    const userInterestIds = userInterests.map(ui => ui.interests?.id || ui.interestid).filter(Boolean);
    const matchingInterests = itemInterests.filter(interestId =>
      userInterestIds.includes(interestId)
    );

    return matchingInterests.length;
  };

  const combineFeedItems = () => {
    if (!userInterests || userInterests.length === 0) {
      // If user has no interests, sort by creation date only
      const combined = [
        ...posts.map(post => ({ ...post, type: 'post', sortDate: new Date(post.creationdate) })),
        ...events.map(event => ({ ...event, type: 'event', sortDate: new Date(event.creationdate) }))
      ];

      combined.sort((a, b) => {
        return b.sortDate.getTime() - a.sortDate.getTime();
      });

      return combined;
    }

    // Get user's interest IDs for comparison
    const userInterestIds = userInterests.map(ui => ui.interests?.id || ui.interestid).filter(Boolean);

    const combined = [
      ...posts.map(post => ({
        ...post,
        type: 'post',
        sortDate: new Date(post.creationdate),
        interestScore: 0
      })),
      ...events.map(event => ({
        ...event,
        type: 'event',
        sortDate: new Date(event.creationdate),
        interestScore: 0
      }))
    ];

    // Calculate interest scores
    combined.forEach(item => {
      item.interestScore = calculateInterestScore(item);
    });

    // Sort by interest score (descending), then by creation date (newest first)
    combined.sort((a, b) => {
      // First priority: interest score (higher is better)
      if (a.interestScore !== b.interestScore) {
        return b.interestScore - a.interestScore;
      }

      // Second priority: creation date (newer is better)
      return b.sortDate.getTime() - a.sortDate.getTime();
    });

    setFeedItems(combined);
    setLoading(false);
  };

  const loadUserInterests = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await DatabaseService.getUserInterests(user.id);
      if (error) {
        console.error('Error loading user interests:', error);
        setError('Unable to load user interests.');
      } else {
        setUserInterests(data || []);
        setError(null);
      }
    } catch (error) {
      console.error('Error loading user interests:', error);
      setError('Unable to load user interests.');
    }
  };

  // Suggested circles now handled by store

  const loadUserCircles = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await DatabaseService.getUserJoinedCircles(user.id);
      if (error) {
        console.error('Error loading user circles:', error);
        setError('Unable to load user circles.');
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
      setError(null);
    } catch (error) {
      console.error('Error loading user circles:', error);
      setError('Unable to load user circles.');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPosts(), loadEvents(), loadUserCircles(), loadUserInterests()]);
    // Also explicitly reload suggested circles
    await loadSuggested();
    setRefreshing(false);
  }, [user, loadSuggested]);

  useEffect(() => {
    if (user) {
      Promise.all([loadPosts(), loadEvents(), loadUserCircles(), loadUserInterests()]);
    } else {
      setPosts([]);
      setEvents([]);
      setFeedItems([]);
      setUserInterests([]);
      setSuggestedCircles([]);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (posts.length > 0 || events.length > 0 || userInterests.length > 0) {
      combineFeedItems();
    } else if (!loading && user) {
      // If still loading and no data, show empty state
      setFeedItems([]);
      setLoading(false);
    }
  }, [posts, events, userInterests, loading, user]);

  useEffect(() => {
    if (user && userInterests.length >= 0) { // Load even if user has no interests
      console.log('Loading suggested circles for user with interests:', userInterests.length);
      loadSuggested();
    }
  }, [userInterests.length, user?.id, loadSuggested]);

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown time';
    
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
      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex === -1) return;

      const post = posts[postIndex];
      const isCurrentlyLiked = post.userLiked;
      const originalPosts = [...posts];

      const updatedPosts = [...posts];
      updatedPosts[postIndex] = {
        ...post,
        userLiked: !isCurrentlyLiked,
        likes_count: isCurrentlyLiked ? Math.max(0, (post.likes_count || 1) - 1) : (post.likes_count || 0) + 1
      };
      setPosts(updatedPosts);

      const { error } = isCurrentlyLiked
        ? await DatabaseService.unlikePost(postId, user.id)
        : await DatabaseService.likePost(postId, user.id);

      if (error) {
        console.error('Error toggling like:', error);
        setPosts(originalPosts);
        Alert.alert('Error', 'Failed to update like');
      }
    } catch (error) {
      console.error('Error handling like:', error);
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

  const handleEditPost = (postId: string, currentContent: string) => {
    setEditingPost(postId);
    setEditPostContent(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditPostContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !editPostContent.trim() || !user?.id) return;

    try {
      const { error } = await DatabaseService.updatePost(
        editingPost.id,
        { content: editPostContent.trim() },
        user.id
      );
      if (error) {
        Alert.alert('Error', 'Failed to update post');
        return;
      }

      Alert.alert('Success', 'Post updated successfully!');
      setEditingPost(null);
      setEditPostContent('');
      await loadPosts();
    } catch (error) {
      Alert.alert('Error', 'Failed to update post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user?.id || deletePostLoading === postId) return;

    console.log('🗑️ HOME PAGE: Delete post requested for:', postId);
    console.log('🗑️ HOME PAGE: User ID:', user.id);
    console.log('🗑️ HOME PAGE: Current deletePostLoading state:', deletePostLoading);

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('🗑️ HOME PAGE: Delete cancelled by user');
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ HOME PAGE: Starting delete process...');
              setDeletePostLoading(postId);

              console.log('🗑️ HOME PAGE: Calling DatabaseService.deletePost...');
              const { data, error } = await DatabaseService.deletePost(postId, user.id);

              console.log('🗑️ HOME PAGE: Delete result:', {
                hasData: !!data,
                hasError: !!error,
                errorMessage: error?.message,
                data: data
              });

              if (error) {
                console.error('🗑️ HOME PAGE: Error deleting post:', error);
                Alert.alert('Error', error.message || 'Failed to delete post');
                setDeletePostLoading(null);
                return;
              }

              console.log('🗑️ HOME PAGE: Post deleted successfully, updating UI...');

              // Remove the post from both posts and feedItems state
              setPosts(prevPosts => {
                const filtered = prevPosts.filter(post => post.id !== postId);
                console.log('🗑️ HOME PAGE: Updated posts count:', filtered.length);
                return filtered;
              });
              
              setFeedItems(prevItems => {
                const filtered = prevItems.filter(item => 
                  !(item.type === 'post' && item.id === postId)
                );
                console.log('🗑️ HOME PAGE: Updated feedItems count:', filtered.length);
                return filtered;
              });
              
              console.log('🗑️ HOME PAGE: UI updated, showing success message');
              Alert.alert('Success', 'Post deleted successfully');
              
            } catch (error) {
              console.error('🗑️ HOME PAGE: Unexpected error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post: ' + (error instanceof Error ? error.message : String(error)));
            } finally {
              console.log('🗑️ HOME PAGE: Clearing delete loading state');
              setDeletePostLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleJoinSuggestedCircle = async (circleId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to join circles');
      return;
    }

    try {
      const { error } = await DatabaseService.joinCircle(user.id, circleId);
      
      if (error) {
        if (error.message.includes('private circle')) {
          // Handle private circle - request to join instead
          const { error: requestError } = await DatabaseService.requestToJoinCircle(user.id, circleId);
          if (requestError) {
            Alert.alert('Error', requestError.message);
          } else {
            Alert.alert('Request Sent', 'Your request to join this private circle has been sent to the admins.');
            // Remove the circle from suggestions since user has requested to join
            setSuggestedCircles(prev => prev.filter(c => c.id !== circleId));
          }
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

      Alert.alert('Success', 'You have successfully joined the circle!');
      // Remove the joined circle from suggestions
      setSuggestedCircles(prev => prev.filter(c => c.id !== circleId));
      // Refresh user circles and suggested circles
      await loadUserCircles();
    } catch (error) {
      console.error('Error joining circle:', error);
      Alert.alert('Error', 'Failed to join circle. Please try again.');
    }
  };

  const renderEvent = ({ item }: { item: any }) => (
    <View style={[
      styles.postCard,
      { backgroundColor: surfaceColor },
      item.interestScore > 0 && { borderLeftWidth: 4, borderLeftColor: tintColor }
    ]}>
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
            <View style={styles.timeAndInterest}>
              <ThemedText style={styles.postTime}>
                Event • {formatTimeAgo(item.creationdate)}
              </ThemedText>
              {item.interestScore > 0 && typeof item.interestScore === 'number' && (
                <ThemedText style={[styles.interestIndicator, { color: tintColor }]}>
                  ⭐ {item.interestScore} match{item.interestScore > 1 ? 'es' : ''}
                </ThemedText>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.postContent}>
        <ThemedText style={styles.eventTitle}>{item.title || 'Untitled Event'}</ThemedText>
        <ThemedText style={styles.eventDateTime}>
          📅 {item.date ? new Date(item.date).toLocaleDateString() : 'TBD'} at {item.time || 'TBD'}
        </ThemedText>
        {item.description && (
          <ThemedText style={styles.postText}>{item.description}</ThemedText>
        )}
        {item.location && (
          <ThemedText style={styles.eventLocation}>📍 {item.location}</ThemedText>
        )}

        {/* Event Interests */}
        {item.event_interests && item.event_interests.length > 0 && (
          <View style={styles.eventInterests}>
            {item.event_interests.map((ei: any) => {
              if (!ei.interests || !ei.interests.id || !ei.interests.title) return null;
              return (
                <View
                  key={ei.interests.id}
                  style={[styles.eventInterestChip, { backgroundColor: tintColor + '20', borderColor: tintColor }]}
                >
                  <ThemedText style={[styles.eventInterestText, { color: tintColor }]}>
                    {ei.interests.title}
                  </ThemedText>
                </View>
              );
            }).filter(Boolean)}
          </View>
        )}
      </View>
    </View>
  );

  const renderPost = ({ item }: { item: Post & { interestScore?: number } }) => (
    <View key={item.id} style={[
      styles.postCard,
      { backgroundColor: surfaceColor },
      item.interestScore && item.interestScore > 0 && { borderLeftWidth: 4, borderLeftColor: tintColor }
    ]}>
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
              {item.interestScore > 0 && typeof item.interestScore === 'number' && (
                <ThemedText style={[styles.interestIndicator, { color: tintColor }]}>
                  • ⭐ {item.interestScore}
                </ThemedText>
              )}
            </View>
          </View>
        </View>
        <View style={styles.postActions}>
          {/* Edit button - only show for post owner */}
          {user?.id === item.author?.id && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditPost(item.id, item.content)}
            >
              <IconSymbol name="pencil" size={20} color={textColor} />
            </TouchableOpacity>
          )}
          {/* Delete button - show for post owner or admin */}
          {(user?.id === item.author?.id || (item.circle && userCircles.some(c => c.id === item.circle.id && c.role === 'admin'))) && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeletePost(item.id)}
              disabled={deletePostLoading === item.id}
            >
              {deletePostLoading === item.id ? (
                <ThemedText style={{color: 'red'}}>Deleting...</ThemedText>
              ) : (
                <IconSymbol name="trash" size={20} color="#EF5350" />
              )}
            </TouchableOpacity>
          )}
        </View>
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
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLikePost(item.id)}
          disabled={!user}
        >
          <IconSymbol
            name={item.userLiked ? "heart.fill" : "heart"}
            size={20}
            color={item.userLiked ? "#ff4444" : textColor}
          />
          <ThemedText style={[
            styles.actionText,
            item.userLiked && { color: "#ff4444" }
          ]}>
            {item.likes_count || 0}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/post/${item.id}`)}
        >
          <IconSymbol name="bubble.left" size={20} color={textColor} />
          <ThemedText style={styles.actionText}>
            {item.comments_count || item.comments?.length || 0}
          </ThemedText>
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
            onPress={() => router.push('/places')}
          >
            <IconSymbol name="building.2" size={24} color={textColor} />
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
        {/* Suggested Circles Section */}
        {user && !loading && (
          <>
            {suggestedLoading && (
              <View style={[styles.suggestedSection, { backgroundColor: surfaceColor }]}>
                <ThemedText type="defaultSemiBold" style={styles.suggestedTitle}>
                  Loading Suggested Circles...
                </ThemedText>
              </View>
            )}
            
            {!suggestedLoading && suggestedCircles.length > 0 && (
              <View style={[styles.suggestedSection, { backgroundColor: surfaceColor }]}>
                <ThemedText type="defaultSemiBold" style={styles.suggestedTitle}>
                  Suggested Circles ({suggestedCircles.length})
                </ThemedText>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestedScrollView}
                  contentContainerStyle={styles.suggestedContent}
                >
                  {suggestedCircles.map((circle) => (
                    <CircleCard
                      key={circle.id}
                      circle={circle}
                      onJoin={handleJoinSuggestedCircle}
                      onDismiss={dismiss}
                      onSnooze={snooze}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
            
            {!suggestedLoading && suggestedCircles.length === 0 && userInterests.length > 0 && (
              <View style={[styles.suggestedSection, { backgroundColor: surfaceColor }]}>
                <ThemedText type="defaultSemiBold" style={styles.suggestedTitle}>
                  No Suggested Circles
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  No circles match your interests at the moment
                </ThemedText>
              </View>
            )}
            
            {circlesError && (
              <View style={[styles.suggestedSection, { backgroundColor: surfaceColor }]}>
                <ThemedText type="defaultSemiBold" style={[styles.suggestedTitle, { color: '#EF5350' }]}>
                  Error Loading Suggestions
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  {circlesError}
                </ThemedText>
              </View>
            )}
          </>
        )}

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
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor }]}>
            <TouchableOpacity onPress={() => {
              setShowPostModal(false);
              setSelectedPostImage(null);
              setNewPostContent('');
              setSelectedCircle('');
            }}>
              <ThemedText style={[styles.cancelButton, { color: tintColor }]}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Create Post</ThemedText>
            <TouchableOpacity onPress={handleCreatePost} disabled={!newPostContent.trim() || !selectedCircle}>
              <ThemedText style={[
                styles.saveButton,
                { color: newPostContent.trim() && selectedCircle ? tintColor : textColor + '50' }
              ]}>
                Post
              </ThemedText>
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
        </SafeAreaView>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={!!editingPost}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.modalHeader, { backgroundColor: surfaceColor }]}>
            <TouchableOpacity onPress={handleCancelEdit}>
              <ThemedText style={[styles.cancelButton, { color: tintColor }]}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Edit Post</ThemedText>
            <TouchableOpacity onPress={handleSaveEdit} disabled={!editPostContent.trim()}>
              <ThemedText style={[
                styles.saveButton,
                { color: editPostContent.trim() ? tintColor : textColor + '50' }
              ]}>
                Save
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputSection}>
              <ThemedText style={styles.inputLabel}>Edit your post</ThemedText>
              <TextInput
                style={[styles.postInput, { backgroundColor: surfaceColor, color: textColor }]}
                value={editPostContent}
                onChangeText={setEditPostContent}
                placeholder="What's on your mind?"
                placeholderTextColor={textColor + '60'}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoFocus
              />
            </View>
          </View>
        </SafeAreaView>
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
  timeAndInterest: {
    flexDirection: 'column',
    gap: 2,
  },
  interestIndicator: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
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
  eventDateTime: {
    fontSize: 14,
    opacity: 0.8,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FF9800',
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
  modalContainer: {
    flex: 1,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
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
  suggestedSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
  },
  suggestedTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  suggestedScrollView: {
    flexDirection: 'row',
  },
  suggestedContent: {
    paddingRight: 16,
  },
  suggestedCircleCard: {
    width: 140,
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  suggestedCircleImageContainer: {
    marginBottom: 8,
  },
  suggestedCircleImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  suggestedCircleImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedCircleName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 36,
  },
  suggestedCircleMatches: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 'auto',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});