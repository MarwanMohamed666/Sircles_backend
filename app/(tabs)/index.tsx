
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  View,
  Image,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  tag: string;
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  isLiked: boolean;
}

export default function HomeScreen() {
  const { texts, isRTL } = useLanguage();
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');

  const tintColor = useThemeColor({}, 'tint');
  const surfaceColor = useThemeColor({}, 'surface');
  const successColor = useThemeColor({}, 'success');

  const mockEvents: Event[] = [
    {
      id: '1',
      title: 'Morning Yoga',
      date: '2024-01-20',
      time: '7:00 AM',
      location: 'Community Center',
      tag: 'Yoga',
    },
    {
      id: '2',
      title: 'Evening Run',
      date: '2024-01-20',
      time: '6:00 PM',
      location: 'Park Trail',
      tag: 'Running',
    },
  ];

  const mockPosts: Post[] = [
    {
      id: '1',
      userId: '1',
      userName: 'Sarah Ahmed',
      content: 'Just finished an amazing yoga session! Who wants to join tomorrow?',
      likes: 12,
      comments: 3,
      isLiked: false,
    },
    {
      id: '2',
      userId: '2',
      userName: 'Ahmed Ali',
      content: 'Looking for tennis partners this weekend. Anyone interested?',
      likes: 8,
      comments: 5,
      isLiked: true,
    },
  ];

  const handleRSVP = (eventId: string, status: 'yes' | 'maybe' | 'no') => {
    // TODO: Implement RSVP functionality with Firebase
    console.log(`RSVP for event ${eventId}: ${status}`);
  };

  const handleLike = (postId: string) => {
    // TODO: Implement like functionality with Firebase
    console.log(`Like post ${postId}`);
  };

  const handleComment = (postId: string) => {
    // TODO: Open comment modal
    console.log(`Comment on post ${postId}`);
  };

  const handleCreatePost = () => {
    // TODO: Submit post to Firebase
    setShowPostModal(false);
    setPostContent('');
    setSelectedCircle('');
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <ThemedView style={[styles.eventCard, { backgroundColor: surfaceColor }]}>
      <ThemedText style={styles.eventTag}>{item.tag}</ThemedText>
      <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
      <ThemedText style={styles.eventDetails}>
        {item.time} • {item.date}
      </ThemedText>
      <ThemedText style={styles.eventLocation}>{item.location}</ThemedText>
      
      <View style={[styles.rsvpButtons, isRTL && styles.rsvpButtonsRTL]}>
        <TouchableOpacity
          style={[styles.rsvpButton, { backgroundColor: successColor }]}
          onPress={() => handleRSVP(item.id, 'yes')}
        >
          <ThemedText style={[styles.rsvpButtonText, { color: '#fff' }]}>
            {texts.yes}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rsvpButton, { backgroundColor: '#FFB74D' }]}
          onPress={() => handleRSVP(item.id, 'maybe')}
        >
          <ThemedText style={[styles.rsvpButtonText, { color: '#fff' }]}>
            {texts.maybe}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rsvpButton, { backgroundColor: '#EF5350' }]}
          onPress={() => handleRSVP(item.id, 'no')}
        >
          <ThemedText style={[styles.rsvpButtonText, { color: '#fff' }]}>
            {texts.no}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <ThemedView style={[styles.postCard, { backgroundColor: surfaceColor }]}>
      <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
        <View style={styles.avatar} />
        <ThemedText type="defaultSemiBold">{item.userName}</ThemedText>
      </View>
      
      <ThemedText style={styles.postContent}>{item.content}</ThemedText>
      
      <View style={[styles.postActions, isRTL && styles.postActionsRTL]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <IconSymbol
            name={item.isLiked ? 'heart.fill' : 'heart'}
            size={20}
            color={item.isLiked ? '#EF5350' : '#687076'}
          />
          <ThemedText style={styles.actionText}>{item.likes}</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleComment(item.id)}
        >
          <IconSymbol name="bubble.left" size={20} color="#687076" />
          <ThemedText style={styles.actionText}>{item.comments}</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <ThemedText type="title" style={styles.communityName}>
          Sircles Community
        </ThemedText>
        <View style={[styles.headerActions, isRTL && styles.headerActionsRTL]}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
          >
            <IconSymbol name="bell" size={24} color={tintColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push('/(tabs)/profile')}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, isRTL && styles.actionButtonsRTL]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: tintColor }]}
          onPress={() => router.push('/(tabs)/search')}
        >
          <IconSymbol name="person.2" size={20} color="#fff" />
          <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
            {texts.findBuddies}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: tintColor }]}
          onPress={() => router.push('/(tabs)/search')}
        >
          <IconSymbol name="magnifyingglass" size={20} color="#fff" />
          <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
            {texts.search}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: tintColor }]}
          onPress={() => router.push('/create-event')}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
          <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
            {texts.create}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Upcoming Events */}
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {texts.upcomingEvents}
        </ThemedText>
        <FlatList
          horizontal
          data={mockEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          style={styles.eventsList}
        />
      </View>

      {/* Community Feed */}
      <View style={styles.section}>
        <View style={[styles.feedHeader, isRTL && styles.feedHeaderRTL]}>
          <ThemedText type="subtitle">{texts.feed}</ThemedText>
          <TouchableOpacity
            style={[styles.addPostButton, { backgroundColor: tintColor }]}
            onPress={() => setShowPostModal(true)}
          >
            <ThemedText style={[styles.addPostText, { color: '#fff' }]}>
              {texts.addPost}
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={mockPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </View>

      {/* Create Post Modal */}
      <Modal
        visible={showPostModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modal, { backgroundColor: surfaceColor }]}>
            <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
              <ThemedText type="subtitle">{texts.addPost}</ThemedText>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <IconSymbol name="xmark" size={24} color="#687076" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[
                styles.postInput,
                { backgroundColor: surfaceColor, textAlign: isRTL ? 'right' : 'left' }
              ]}
              placeholder="What's on your mind?"
              value={postContent}
              onChangeText={setPostContent}
              multiline
              numberOfLines={4}
            />
            
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: tintColor }]}
              onPress={handleCreatePost}
            >
              <ThemedText style={[styles.submitButtonText, { color: '#fff' }]}>
                {texts.submit}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  communityName: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionsRTL: {
    flexDirection: 'row-reverse',
  },
  iconButton: {
    padding: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B2E2DF',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  actionButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  eventsList: {
    paddingLeft: 16,
  },
  eventCard: {
    width: 200,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  eventTag: {
    fontSize: 12,
    color: '#00B2A9',
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 14,
    color: '#687076',
    marginTop: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#687076',
    marginTop: 2,
    marginBottom: 12,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  rsvpButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  feedHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  addPostButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addPostText: {
    fontSize: 14,
    fontWeight: '600',
  },
  postCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  postHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  postContent: {
    marginBottom: 12,
    lineHeight: 20,
  },
  postActions: {
    flexDirection: 'row',
    gap: 20,
  },
  postActionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionText: {
    fontSize: 14,
    color: '#687076',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modal: {
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  postInput: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
