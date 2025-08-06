import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService } from '@/lib/database';

interface Circle {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  createdby: string;
  memberCount: number;
  isJoined: boolean;
  isAdmin: boolean;
  isMainAdmin: boolean;
  interests?: string[];
  creator?: string; // Added creator field
}

interface Post {
  id: string;
  content: string;
  image?: string;
  creationdate: string;
  author: {
    name: string;
    avatar_url?: string; // Ensure avatar_url is present
  };
  likes: any[];
  comments: any[];
}

interface Member {
  id: string;
  name: string;
  avatar_url?: string;
  isAdmin: boolean;
}

interface JoinRequest {
  id: string;
  message: string;
  creationdate: string;
  users: {
    name: string;
    avatar?: string;
  };
}

export default function CircleScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'admin'>('feed');
  const [circle, setCircle] = useState<Circle | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const [newPostContent, setNewPostContent] = useState('');

  


  const loadCircleData = async () => {
    if (!id) return;

    try {
      // Load circle details
      const { data: circleDataFromDb, error: circleError } = await DatabaseService.getCircles();
      const currentCircle = circleDataFromDb?.find(c => c.id === id);

      if (!currentCircle) {
        Alert.alert('Error', 'Circle not found');
        router.back();
        return;
      }

      // Check membership and admin status
      let isJoined = false;
      let isAdmin = false;
      let isMainAdmin = false;

      if (user?.id) {
        const { data: joinedCircles } = await DatabaseService.getUserJoinedCircles(user.id);
        isJoined = joinedCircles?.some(jc => jc.circleid === id) || false;

        if (isJoined) {
          const { data: adminData } = await DatabaseService.isCircleAdmin(id as string, user.id);
          isAdmin = adminData?.isAdmin || false;
          isMainAdmin = adminData?.isMainAdmin || false;
        }
      }

      // Get circle interests
      const interests = currentCircle.circle_interests?.map((ci: any) => ci.interests?.title).filter(Boolean) || [];

      setCircle({
        ...currentCircle,
        isJoined,
        isAdmin,
        isMainAdmin,
        memberCount: currentCircle.member_count || 0,
        interests,
        creator: currentCircle.createdby // Assign creator
      });

      // Load posts if user is member or circle is public
      if (isJoined || currentCircle.privacy === 'public') {
        const { data: postsData } = await DatabaseService.getPosts(id as string);
        setPosts(postsData || []);
      }

      // Load full member details if user is member
      if (isJoined) {
        const { data: membersData } = await DatabaseService.getCircleMembers(id as string);
        setMembers(membersData || []);
      }

      // Load join requests if user is admin
      if (isAdmin) {
        const { data: requestsData } = await DatabaseService.getCircleJoinRequests(id as string);
        setJoinRequests(requestsData || []);
      }

    } catch (error) {
      console.error('Error loading circle data:', error);
      Alert.alert('Error', 'Failed to load circle data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCircleData();
    setRefreshing(false);
  };

  const handleJoinRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await DatabaseService.handleJoinRequest(requestId, action);
      if (error) {
        Alert.alert('Error', `Failed to ${action} request`);
        return;
      }

      Alert.alert('Success', `Request ${action}ed successfully`);
      await loadCircleData();
    } catch (error) {
      Alert.alert('Error', `Failed to ${action} request`);
    }
  };

  const handleDeleteCircle = async () => {
    if (!user?.id || !id) {
      Alert.alert('Error', 'Unable to delete circle. Please try again.');
      return;
    }

    Alert.alert(
      'Delete Circle',
      `Are you sure you want to delete "${circle?.name}"? This will permanently remove all posts, messages, and events in this circle. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await DatabaseService.deleteCircle(id, user.id);

              if (error) {
                console.error('Delete error:', error);
                Alert.alert('Error', error.message || 'Failed to delete circle');
                return;
              }

              Alert.alert(
                'Success',
                'Circle deleted successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/(tabs)/circles');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete circle');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!circle?.isAdmin) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await DatabaseService.removeMemberFromCircle(
                id as string,
                memberId,
                user!.id
              );
              if (error) {
                Alert.alert('Error', 'Failed to remove member');
                return;
              }
              await loadCircleData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  const handleRemoveMemberAsAdmin = (memberId: string, memberName: string) => {
    if (!circle?.isAdmin) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this circle? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await DatabaseService.removeMemberFromCircle(
                id as string,
                memberId,
                user!.id
              );
              if (error) {
                Alert.alert('Error', 'Failed to remove member');
                return;
              }

              Alert.alert('Success', `${memberName} has been removed from the circle`);
              await loadCircleData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  const handleToggleAdmin = (memberId: string, memberName: string, isCurrentlyAdmin: boolean) => {
    if (!circle?.isMainAdmin) return;

    const action = isCurrentlyAdmin ? 'remove admin privileges from' : 'make admin';

    Alert.alert(
      isCurrentlyAdmin ? 'Remove Admin' : 'Make Admin',
      `Are you sure you want to ${action} ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              let error;
              if (isCurrentlyAdmin) {
                ({ error } = await DatabaseService.removeCircleAdmin(id as string, memberId, user!.id));
              } else {
                ({ error } = await DatabaseService.addCircleAdmin(id as string, memberId, user!.id));
              }

              if (error) {
                Alert.alert('Error', `Failed to ${action} ${memberName}`);
                return;
              }

              Alert.alert('Success', `${memberName} ${isCurrentlyAdmin ? 'is no longer an admin' : 'is now an admin'}`);
              await loadCircleData();
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} ${memberName}`);
            }
          }
        }
      ]
    );
  };

  const handleLeaveCircle = async () => {
    if (!user?.id || !id) return;

    Alert.alert(
      'Leave Circle',
      'Are you sure you want to leave this circle?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await DatabaseService.leaveCircle(user.id, id);
              if (error) {
                Alert.alert('Error', error.message || 'Failed to leave circle');
                return;
              }

              Alert.alert('Success', 'You have left the circle');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave circle');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  useEffect(() => {
    loadCircleData();
  }, [id, user]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>{texts.loading || 'Loading...'}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!circle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>Circle not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const renderPost = (post: Post) => (
    <View key={post.id} style={[styles.postCard, { backgroundColor: surfaceColor }]}>
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
          </View>
        </View>
        {circle.isAdmin && (
          <TouchableOpacity>
            <IconSymbol name="ellipsis" size={20} color={textColor} />
          </TouchableOpacity>
        )}
      </View>
      <ThemedText style={styles.postContent}>{post.content}</ThemedText>
      {post.image && (
        <Image source={{ uri: post.image }} style={styles.postImage} />
      )}
    </View>
  );

  const renderMember = (member: Member) => (
    <View key={member.id} style={[styles.memberCard, { backgroundColor: surfaceColor }]}>
      <View style={[styles.memberInfo, isRTL && styles.memberInfoRTL]}>
        <Image
          source={{ uri: member.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberDetails}>
          <ThemedText type="defaultSemiBold">{member.name}</ThemedText>
          {member.isAdmin && (
            <ThemedText style={styles.adminBadge}>Admin</ThemedText>
          )}
        </View>
      </View>
      {circle.isAdmin && member.id !== circle.createdby && member.id !== user?.id && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMember(member.id, member.name)}
        >
          <IconSymbol name="minus.circle" size={20} color="#EF5350" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderJoinRequest = (request: JoinRequest) => (
    <View key={request.id} style={[styles.requestCard, { backgroundColor: surfaceColor }]}>
      <View style={[styles.requestInfo, isRTL && styles.requestInfoRTL]}>
        <Image
          source={{ uri: request.users.avatar || 'https://via.placeholder.com/40' }}
          style={styles.requestAvatar}
        />
        <View style={styles.requestDetails}>
          <ThemedText type="defaultSemiBold">{request.users.name}</ThemedText>
          {request.message && (
            <ThemedText style={styles.requestMessage}>{request.message}</ThemedText>
          )}
          <ThemedText style={styles.requestTime}>
            {new Date(request.creationdate).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.requestButton, { backgroundColor: tintColor }]}
          onPress={() => handleJoinRequest(request.id, 'accept')}
        >
          <ThemedText style={styles.requestButtonText}>Accept</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.requestButton, { backgroundColor: '#EF5350' }]}
          onPress={() => handleJoinRequest(request.id, 'reject')}
        >
          <ThemedText style={styles.requestButtonText}>Reject</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAdminMember = (member: Member) => (
    <View key={member.id} style={[styles.adminMemberCard, { backgroundColor: surfaceColor }]}>
      <View style={[styles.adminMemberInfo, isRTL && styles.adminMemberInfoRTL]}>
        <Image
          source={{ uri: member.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.adminMemberAvatar}
        />
        <View style={styles.adminMemberDetails}>
          <ThemedText type="defaultSemiBold">{member.name}</ThemedText>
          <View style={styles.memberBadges}>
            {member.isAdmin && (
              <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
                <ThemedText style={styles.badgeText}>Admin</ThemedText>
              </View>
            )}
            {member.id === circle.createdby && (
              <View style={[styles.badge, { backgroundColor: tintColor }]}>
                <ThemedText style={styles.badgeText}>Creator</ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.adminMemberActions}>
        {/* Only show remove button if not the creator and not the current user */}
        {member.id !== circle.createdby && member.id !== user?.id && (
          <TouchableOpacity
            style={[styles.adminActionButton, { backgroundColor: '#EF5350' }]}
            onPress={() => handleRemoveMemberAsAdmin(member.id, member.name)}
          >
            <IconSymbol name="person.fill.xmark" size={16} color="#fff" />
            <ThemedText style={styles.adminActionButtonText}>Remove</ThemedText>
          </TouchableOpacity>
        )}

        {/* Show promote/demote admin button for non-creators */}
        {member.id !== circle.createdby && member.id !== user?.id && circle.isMainAdmin && (
          <TouchableOpacity
            style={[styles.adminActionButton, { backgroundColor: member.isAdmin ? '#FF9800' : '#2196F3' }]}
            onPress={() => handleToggleAdmin(member.id, member.name, member.isAdmin)}
          >
            <IconSymbol name={member.isAdmin ? "star.slash" : "star.fill"} size={16} color="#fff" />
            <ThemedText style={styles.adminActionButtonText}>
              {member.isAdmin ? 'Remove Admin' : 'Make Admin'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {circle.name}
        </ThemedText>
        {/* Only show delete button if user is the circle creator */}
        {circle?.creator === user?.id && (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#EF5350' }]}
            onPress={handleDeleteCircle}
            disabled={loading}
          >
            <IconSymbol name="trash" size={16} color="#fff" />
            <ThemedText style={styles.deleteButtonText}>
              {texts.deleteCircle || 'Delete Circle'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Circle Info */}
      <View style={[styles.circleInfo, { backgroundColor: surfaceColor }]}>
        <ThemedText style={styles.circleDescription}>{circle.description}</ThemedText>
        <View style={styles.circleStats}>
          <View style={styles.statItem}>
            <IconSymbol name="person.3" size={16} color={textColor} />
            <ThemedText style={styles.statText}>{circle.memberCount} members</ThemedText>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              name={circle.privacy === 'private' ? "lock.fill" : "globe"}
              size={16}
              color={textColor}
            />
            <ThemedText style={styles.statText}>
              {circle.privacy === 'private' ? 'Private' : 'Public'}
            </ThemedText>
          </View>
        </View>

        {/* Circle Interests */}
        {circle.interests && circle.interests.length > 0 && (
          <View style={styles.circleInterests}>
            <ThemedText style={styles.interestsTitle}>Interests:</ThemedText>
            <View style={styles.interestTags}>
              {circle.interests.map((interest, index) => (
                <View key={index} style={[styles.interestTag, { backgroundColor: tintColor + '20' }]}>
                  <ThemedText style={[styles.interestTagText, { color: tintColor }]}>
                    {interest}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && { backgroundColor: tintColor }]}
          onPress={() => setActiveTab('feed')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'feed' && { color: '#fff' }]}>
            Feed
          </ThemedText>
        </TouchableOpacity>
        {circle.isJoined && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && { backgroundColor: tintColor }]}
            onPress={() => setActiveTab('members')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'members' && { color: '#fff' }]}>
              Members
            </ThemedText>
          </TouchableOpacity>
        )}
        {circle.isAdmin && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'admin' && { backgroundColor: tintColor }]}
            onPress={() => setActiveTab('admin')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'admin' && { color: '#fff' }]}>
              Admin
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'feed' && (
          <View style={styles.feedContainer}>
            {(circle.isJoined || circle.privacy === 'public') ? (
              posts.length > 0 ? (
                posts.map(renderPost)
              ) : (
                <View style={styles.emptyContainer}>
                  <ThemedText>No posts yet</ThemedText>
                </View>
              )
            ) : (
              <View style={styles.emptyContainer}>
                <IconSymbol name="lock.fill" size={48} color={textColor + '40'} />
                <ThemedText>This is a private circle. Join to view posts.</ThemedText>
              </View>
            )}
          </View>
        )}

        {activeTab === 'members' && circle.isJoined && (
          <View style={styles.membersContainer}>
            {members.map(renderMember)}
          </View>
        )}

        {activeTab === 'admin' && circle.isAdmin && (
          <View style={styles.adminContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Join Requests ({joinRequests.length})
            </ThemedText>
            {joinRequests.length > 0 ? (
              joinRequests.map(renderJoinRequest)
            ) : (
              <ThemedText style={styles.emptyText}>No pending join requests</ThemedText>
            )}

            <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 24 }]}>
              Circle Members ({members.length})
            </ThemedText>
            <View style={styles.adminMembersContainer}>
              {members.map(renderAdminMember)}
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  circleInfo: {
    padding: 16,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  circleDescription: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.8,
  },
  circleStats: {
    flexDirection: 'row',
    gap: 16,
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
  circleInterests: {
    marginTop: 12,
  },
  interestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  feedContainer: {
    gap: 16,
  },
  postCard: {
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
  },
  membersContainer: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberInfoRTL: {
    flexDirection: 'row-reverse',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  adminBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  adminContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  adminMembersContainer: {
    gap: 12,
  },
  adminMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  adminMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminMemberInfoRTL: {
    flexDirection: 'row-reverse',
  },
  adminMemberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  adminMemberDetails: {
    flex: 1,
  },
  memberBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  adminMemberActions: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-end',
  },
  adminActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  adminActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestInfoRTL: {
    flexDirection: 'row-reverse',
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  requestDetails: {
    flex: 1,
  },
  requestMessage: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  requestTime: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalText: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  passwordInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  // Added styles for delete button in header
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});