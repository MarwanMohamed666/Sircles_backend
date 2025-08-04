import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

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
  circle: {
    name: string;
  };
  likes: any[];
  comments: any[];
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setPosts(data || []);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

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

  useEffect(() => {
    loadPosts();
  }, [user]);

  const renderPost = (post: Post) => (
    <View key={post.id} style={[styles.postCard, { backgroundColor: surfaceColor }]}>
      {/* Post Header */}
      <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
        <View style={[styles.authorInfo, isRTL && styles.authorInfoRTL]}>
          <Image
            source={{ uri: post.author.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.authorAvatar}
          />
          <View style={styles.authorDetails}>
            <ThemedText type="defaultSemiBold" style={styles.authorName}>
              {post.author.name}
            </ThemedText>
            <View style={[styles.postMeta, isRTL && styles.postMetaRTL]}>
              <ThemedText style={styles.circleName}>
                in {post.circle.name}
              </ThemedText>
              <ThemedText style={styles.postTime}>
                • {formatTimeAgo(post.creationdate)}
              </ThemedText>
            </View>
          </View>
        </View>
        <TouchableOpacity>
          <IconSymbol name="ellipsis" size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <ThemedText style={[styles.postContent, isRTL && styles.rtlText]}>
        {post.content}
      </ThemedText>

      {/* Post Image */}
      {post.image && (
        <Image source={{ uri: post.image }} style={styles.postImage} />
      )}

      {/* Post Actions */}
      <View style={[styles.postActions, isRTL && styles.postActionsRTL]}>
        <TouchableOpacity style={[styles.actionButton, isRTL && styles.actionButtonRTL]}>
          <IconSymbol name="heart" size={20} color={textColor} />
          <ThemedText style={styles.actionText}>
            {post.likes?.length || 0}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, isRTL && styles.actionButtonRTL]}>
          <IconSymbol name="message" size={20} color={textColor} />
          <ThemedText style={styles.actionText}>
            {post.comments?.length || 0}
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
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <IconSymbol name="bell" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
        ) : posts.length === 0 ? (
          <View style={styles.centeredContainer}>
            <IconSymbol name="doc.text" size={64} color={textColor + '40'} />
            <ThemedText style={styles.emptyText}>
              No posts from your circles yet
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Join some circles to see posts here!
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
          <View style={styles.postsList}>
            {posts.map(renderPost)}
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
  content: {
    flex: 1,
  },
  postsList: {
    padding: 16,
    gap: 16,
  },
  postCard: {
    padding: 16,
    borderRadius: 12,
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
  authorName: {
    fontSize: 16,
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
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
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
});