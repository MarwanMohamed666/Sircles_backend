import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';

interface Circle {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'invite-only';
  agePreference: { min: number; max: number };
  genderPreference: 'Male' | 'Female' | 'Any';
  memberCount: number;
  isJoined: boolean;
  tags: string[];
}

interface Post {
  id: string;
  userName: string;
  content: string;
  likes: number;
  comments: number;
  liked: boolean;
  timestamp: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  tag: string;
  description: string;
  rsvp?: 'yes' | 'maybe' | 'no';
  attendees: { yes: number; maybe: number; no: number };
}

export default function CircleScreen() {
  const { id } = useLocalSearchParams();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');

  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'chat'>('feed');
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');

  // Mock circle data
  const [circle] = useState<Circle>({
    id: id as string,
    name: 'Tech Enthusiasts',
    description: 'A community for technology lovers to share ideas, discuss latest trends, and collaborate on projects.',
    privacy: 'public',
    agePreference: { min: 18, max: 65 },
    genderPreference: 'Any',
    memberCount: 24,
    isJoined: false,
    tags: ['Technology', 'Programming', 'Innovation'],
  });

  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      userName: 'Ahmed Ali',
      content: 'Just discovered this amazing new JavaScript framework! Has anyone tried it yet?',
      likes: 8,
      comments: 3,
      liked: false,
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      userName: 'Sara Mohamed',
      content: 'Great meetup yesterday! Thanks everyone for the insightful discussions about AI.',
      likes: 15,
      comments: 7,
      liked: true,
      timestamp: '1 day ago',
    },
  ]);

  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      title: 'Tech Talk: Future of AI',
      date: '2024-01-20',
      time: '7:00 PM',
      location: 'Community Center',
      tag: 'Workshop',
      description: 'Join us for an engaging discussion about the future of artificial intelligence.',
      attendees: { yes: 12, maybe: 5, no: 1 },
    },
  ]);

  const handleJoinCircle = () => {
    Alert.alert(
      texts.success || 'Success',
      `Successfully joined ${circle.name}!`
    );
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1,
          }
        : post
    ));
  };

  const handleRSVP = (eventId: string, response: 'yes' | 'maybe' | 'no') => {
    setEvents(events.map(event =>
      event.id === eventId ? { ...event, rsvp: response } : event
    ));
  };

  const renderFeed = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.feedHeader, isRTL && styles.feedHeaderRTL]}>
        <ThemedText type="defaultSemiBold" style={styles.feedTitle}>
          {texts.circlePosts || 'Circle Posts'}
        </ThemedText>
        <TouchableOpacity
          style={[styles.addPostButton, { backgroundColor: tintColor }]}
          onPress={() => setShowPostModal(true)}
        >
          <IconSymbol name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {posts.map((post) => (
        <View key={post.id} style={[styles.postCard, { backgroundColor: surfaceColor }]}>
          <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
            <ThemedText type="defaultSemiBold">{post.userName}</ThemedText>
            <ThemedText style={styles.timestamp}>{post.timestamp}</ThemedText>
          </View>
          <ThemedText style={[styles.postContent, isRTL && styles.rtlText]}>
            {post.content}
          </ThemedText>
          <View style={[styles.postActions, isRTL && styles.postActionsRTL]}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleLike(post.id)}
            >
              <IconSymbol
                name={post.liked ? "heart.fill" : "heart"}
                size={20}
                color={post.liked ? '#EF5350' : textColor}
              />
              <ThemedText style={styles.actionText}>{post.likes}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <IconSymbol name="message" size={20} color={textColor} />
              <ThemedText style={styles.actionText}>{post.comments}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderEvents = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {events.map((event) => (
        <View key={event.id} style={[styles.eventCard, { backgroundColor: surfaceColor }]}>
          <View style={[styles.eventTag, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.eventTagText, { color: '#fff' }]}>
              {event.tag}
            </ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.eventTitle}>
            {event.title}
          </ThemedText>
          <ThemedText style={styles.eventDetails}>
            {event.date} • {event.time}
          </ThemedText>
          <ThemedText style={styles.eventLocation}>
            📍 {event.location}
          </ThemedText>
          <ThemedText style={[styles.eventDescription, isRTL && styles.rtlText]}>
            {event.description}
          </ThemedText>
          <View style={styles.rsvpButtons}>
            {(['yes', 'maybe', 'no'] as const).map((response) => (
              <TouchableOpacity
                key={response}
                style={[
                  styles.rsvpButton,
                  {
                    backgroundColor: event.rsvp === response ? tintColor : backgroundColor,
                    borderColor: tintColor,
                  }
                ]}
                onPress={() => handleRSVP(event.id, response)}
              >
                <ThemedText style={[
                  styles.rsvpButtonText,
                  { color: event.rsvp === response ? '#fff' : textColor }
                ]}>
                  {response === 'yes' ? texts.yes || 'Yes' : 
                   response === 'maybe' ? texts.maybe || 'Maybe' : 
                   texts.no || 'No'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderChat = () => (
    <View style={styles.tabContent}>
      <ThemedText style={styles.comingSoon}>
        {texts.chatComingSoon || 'Group chat coming soon...'}
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol 
            name={isRTL ? "chevron.right" : "chevron.left"} 
            size={24} 
            color={textColor} 
          />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          {circle.name}
        </ThemedText>
        <View style={styles.headerActions} />
      </View>

      {/* Circle Info */}
      <View style={[styles.circleInfo, { backgroundColor: surfaceColor }]}>
        <ThemedText style={[styles.circleDescription, isRTL && styles.rtlText]}>
          {circle.description}
        </ThemedText>
        <View style={styles.circleStats}>
          <ThemedText style={styles.memberCount}>
            {circle.memberCount} {texts.members || 'members'}
          </ThemedText>
          <View style={styles.circleTags}>
            {circle.tags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: tintColor + '20' }]}>
                <ThemedText style={[styles.tagText, { color: tintColor }]}>
                  {tag}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
        {!circle.isJoined && (
          <View style={styles.circleActions}>
                <TouchableOpacity
                  style={[styles.chatNavButton, { backgroundColor: surfaceColor, borderColor: tintColor }]}
                  onPress={() => router.push('/(tabs)/messages')}
                >
                  <IconSymbol name="message" size={16} color={tintColor} />
                  <ThemedText style={[styles.chatNavButtonText, { color: tintColor }]}>
                    {texts.chat || 'Chat'}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: tintColor }]}
                  onPress={handleJoinCircle}
                >
                  <ThemedText style={[styles.joinButtonText, { color: '#fff' }]}>
                    {texts.joinCircle || 'Join Circle'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: surfaceColor }]}>
        {(['feed', 'events', 'chat'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && { backgroundColor: tintColor + '20' }
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText
              style={[
                styles.tabButtonText,
                { color: activeTab === tab ? tintColor : textColor }
              ]}
            >
              {tab === 'feed' ? texts.feed || 'Feed' :
               tab === 'events' ? texts.events || 'Events' :
               texts.chat || 'Chat'}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'feed' && renderFeed()}
      {activeTab === 'events' && renderEvents()}
      {activeTab === 'chat' && renderChat()}

      {/* Add Post Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {texts.addPost || 'Add Post'}
            </ThemedText>

            <TextInput
              style={[
                styles.postInput,
                { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
              ]}
              placeholder={texts.whatsOnYourMind || "What's on your mind?"}
              placeholderTextColor={textColor + '80'}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor }]}
                onPress={() => setShowPostModal(false)}
              >
                <ThemedText>{texts.cancel || 'Cancel'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={() => {
                  // Add post logic here
                  setShowPostModal(false);
                  setNewPostContent('');
                }}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {texts.post || 'Post'}
                </ThemedText>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
  },
  headerActions: {
    width: 40,
  },
  circleInfo: {
    padding: 16,
    elevation: 1,
  },
  circleDescription: {
    marginBottom: 12,
    lineHeight: 20,
  },
  circleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  memberCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  circleTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  circleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  chatNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  chatNavButtonText: {
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#00B2A9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  joinButtonText: {
    fontWeight: '600',
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feedHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  feedTitle: {
    fontSize: 16,
  },
  addPostButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  postContent: {
    marginBottom: 12,
    lineHeight: 20,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  postActionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  eventTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  eventTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventTitle: {
    marginBottom: 8,
  },
  eventDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    marginBottom: 8,
  },
  eventDescription: {
    marginBottom: 12,
    lineHeight: 18,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  rsvpButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  comingSoon: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.6,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  postInput: {
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
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
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  rtlText: {
    textAlign: 'right',
  },
});