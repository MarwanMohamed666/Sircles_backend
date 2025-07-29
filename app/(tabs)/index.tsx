import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { DatabaseService } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  id: string;
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  tag?: string;
  circleId?: string;
  visibility?: string;
  description?: string;
  createdBy?: string;
  rsvp?: 'yes' | 'maybe' | 'no';
}

interface Post {
  id: string;
  userId?: string;
  content?: string;
  circleId?: string;
  createdAt?: string;
  userName?: string;
  circleName?: string;
  likes?: number;
  comments?: number;
  liked?: boolean;
  timestamp?: string;
}

export default function HomeScreen() {
  const { texts, isRTL } = useLanguage();
  const { user } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');

  const [loading, setLoading] = useState(true);

  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    tag: 'Social',
    circleId: '',
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch events
      const { data: eventsData, error: eventsError } = await DatabaseService.getEvents();
      if (eventsError) {
        console.error('Error fetching events:', eventsError);
      } else if (eventsData) {
        setEvents(eventsData);
      }

      // Fetch posts
      const { data: postsData, error: postsError } = await DatabaseService.getPosts();
      if (postsError) {
        console.error('Error fetching posts:', postsError);
      } else if (postsData) {
        // Transform the data to match our interface
        const transformedPosts = postsData.map((post: any) => ({
          ...post,
          userName: post.author?.name || 'Unknown User',
          circleName: post.circle?.name,
          likes: post.likes?.length || 0,
          comments: post.comments?.count || 0,
          liked: false, // You can implement this based on user likes
          timestamp: formatTimestamp(post.createdAt),
        }));
        setPosts(transformedPosts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const circles = ['Tech Enthusiasts', 'Book Club', 'Fitness Group', 'Photography Club'];
  const eventTags = ['Social', 'Education', 'Workshop', 'Fitness', 'Entertainment', 'Community'];

  const handleCreateEvent = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create events');
      return;
    }

    if (newEvent.title?.trim() && newEvent.date && newEvent.time && newEvent.location?.trim()) {
      try {
        const eventData = {
          title: newEvent.title,
          date: new Date(newEvent.date).toISOString(),
          time: newEvent.time,
          location: newEvent.location,
          description: newEvent.description,
          visibility: 'public',
          createdBy: user.id,
          circleId: newEvent.circleId || null,
        };

        const { data, error } = await DatabaseService.createEvent(eventData);

        if (error) {
          Alert.alert('Error', 'Failed to create event');
          console.error('Error creating event:', error);
        } else {
          // Refresh events
          await fetchData();
          setNewEvent({
            title: '',
            date: '',
            time: '',
            location: '',
            description: '',
            tag: 'Social',
            circleId: '',
          });
          setShowCreateEventModal(false);
          Alert.alert(texts.success || 'Success', texts.eventCreated || 'Event created successfully!');
        }
      } catch (error) {
        console.error('Error creating event:', error);
        Alert.alert('Error', 'Failed to create event');
      }
    } else {
      Alert.alert(texts.error || 'Error', texts.fillAllFields || 'Please fill in all required fields.');
    }
  };

  const handleRSVP = (eventId: string, response: 'yes' | 'maybe' | 'no') => {
    setEvents(events.map(event =>
      event.id === eventId ? { ...event, rsvp: response } : event
    ));
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

  const handleAddPost = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create posts');
      return;
    }

    if (newPostContent.trim()) {
      try {
        const postData = {
          userId: user.id,
          content: newPostContent,
          circleId: selectedCircle || null,
        };

        const { data, error } = await DatabaseService.createPost(postData);

        if (error) {
          Alert.alert('Error', 'Failed to create post');
          console.error('Error creating post:', error);
        } else {
          // Refresh posts
          await fetchData();
          setNewPostContent('');
          setSelectedCircle('');
          setShowAddPostModal(false);
        }
      } catch (error) {
        console.error('Error creating post:', error);
        Alert.alert('Error', 'Failed to create post');
      }
    }
  };

  const handleComment = (post: Post) => {
    setSelectedPost(post);
    setShowCommentModal(true);
  };

  const submitComment = () => {
    if (newComment.trim() && selectedPost) {
      setPosts(posts.map(post =>
        post.id === selectedPost.id
          ? { ...post, comments: post.comments + 1 }
          : post
      ));
      setNewComment('');
      setShowCommentModal(false);
      Alert.alert(texts.success || 'Success', 'Comment added successfully!');
    }
  };

  const setShowFindCirclesModal = () => {
    router.push('/explore');
  }

  const setShowFindEventsModal = () => {
    router.push('/events');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: surfaceColor }]}>
        <ThemedText type="defaultSemiBold" style={[styles.communityName, isRTL && styles.rtlText]}>
          {texts.communityName || 'Al-Noor Community'}
        </ThemedText>
        <View style={styles.topBarIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <IconSymbol name="bell" size={24} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <IconSymbol name="person.circle" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Action Buttons */}
        <View style={[styles.actionButtons, isRTL && styles.actionButtonsRTL]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: tintColor }]}
            onPress={() => setShowFindCirclesModal()}
          >
            <IconSymbol name="magnifyingglass" size={18} color="#fff" />
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              {texts.findCircles || 'Find Circles'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: accentColor }]}
            onPress={() => setShowFindEventsModal()}
          >
            <IconSymbol name="calendar" size={18} color="#fff" />
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              {texts.findEvents || 'Find Events'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: surfaceColor }]}
            onPress={() => setShowCreateEventModal(true)}
          >
            <IconSymbol name="plus.circle" size={18} color={textColor} />
            <ThemedText style={[styles.actionButtonText, { color: textColor }]}>
              {texts.createEvent || 'Create Event'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {texts.upcomingEvents || 'Upcoming Events'}
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
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
                <View style={styles.rsvpButtons}>
                  {(['yes', 'maybe', 'no'] as const).map((response) => (
                    <TouchableOpacity
                      key={response}
                      style={[
                        styles.rsvpButton,
                        {
                          backgroundColor: event.rsvp === response ? tintColor : surfaceColor,
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
        </View>

        {/* Community Feed */}
        <View style={styles.section}>
          <View style={[styles.feedHeader, isRTL && styles.feedHeaderRTL]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {texts.feed || 'Feed'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.addPostButton, { backgroundColor: tintColor }]}
              onPress={() => setShowAddPostModal(true)}
            >
              <ThemedText style={[styles.addPostButtonText, { color: '#fff' }]}>
                + {texts.addPost || 'Add Post'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {posts.map((post) => (
            <View key={post.id} style={[styles.postCard, { backgroundColor: surfaceColor }]}>
              <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
                <View style={styles.postUserInfo}>
                  <ThemedText type="defaultSemiBold">{post.userName}</ThemedText>
                  {post.circleName && (
                    <ThemedText style={styles.circleTag}>• {post.circleName}</ThemedText>
                  )}
                </View>
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
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleComment(post)}
                >
                  <IconSymbol name="message" size={20} color={textColor} />
                  <ThemedText style={styles.actionText}>{post.comments}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Post Modal */}
      <Modal
        visible={showAddPostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPostModal(false)}
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
                onPress={() => setShowAddPostModal(false)}
              >
                <ThemedText>{texts.cancel || 'Cancel'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handleAddPost}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {texts.post || 'Post'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {texts.addComment || 'Add Comment'}
            </ThemedText>

            <TextInput
              style={[
                styles.commentInput,
                { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
              ]}
              placeholder={texts.writeComment || "Write a comment..."}
              placeholderTextColor={textColor + '80'}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor }]}
                onPress={() => {
                  setShowCommentModal(false);
                  setNewComment('');
                }}
              >
                <ThemedText>{texts.cancel || 'Cancel'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={submitComment}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {texts.submit || 'Submit'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Event Modal */}
      <Modal
        visible={showCreateEventModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {texts.createEvent || 'Create Event'}
              </ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateEventModal(false)}
              >
                <IconSymbol name="xmark" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formField}>
                <ThemedText style={styles.fieldLabel}>{texts.title || 'Title'} *</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                  ]}
                  placeholder={texts.enterEventTitle || 'Enter event title'}
                  placeholderTextColor={textColor + '80'}
                  value={newEvent.title}
                  onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
                />
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.fieldLabel}>{texts.circle || 'Circle'}</ThemedText>
                <View style={[styles.dropdownContainer, { backgroundColor }]}>
                  <TouchableOpacity style={styles.dropdown}>
                    <ThemedText style={styles.dropdownText}>
                      {newEvent.circleId || texts.selectCircleOrGeneral || 'Select Circle or General Event'}
                    </ThemedText>
                    <IconSymbol name="chevron.down" size={16} color={textColor} />
                  </TouchableOpacity>
                  <View style={styles.dropdownOptions}>
                    <TouchableOpacity
                      style={styles.dropdownOption}
                      onPress={() => setNewEvent({ ...newEvent, circleId: '' })}
                    >
                      <ThemedText>{texts.generalEvent || 'General Event'}</ThemedText>
                    </TouchableOpacity>
                    {circles.map((circle) => (
                      <TouchableOpacity
                        key={circle}
                        style={styles.dropdownOption}
                        onPress={() => setNewEvent({ ...newEvent, circleId: circle })}
                      >
                        <ThemedText>{circle}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.fieldLabel}>{texts.eventTag || 'Event Tag'}</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.tagOptions}>
                    {eventTags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.tagOption,
                          {
                            backgroundColor: newEvent.tag === tag ? tintColor : backgroundColor,
                            borderColor: tintColor,
                          }
                        ]}
                        onPress={() => setNewEvent({ ...newEvent, tag })}
                      >
                        <ThemedText style={[
                          styles.tagOptionText,
                          { color: newEvent.tag === tag ? '#fff' : textColor }
                        ]}>
                          {tag}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.fieldLabel}>{texts.date || 'Date'} *</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={textColor + '80'}
                  value={newEvent.date}
                  onChangeText={(text) => setNewEvent({ ...newEvent, date: text })}
                />
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.fieldLabel}>{texts.time || 'Time'} *</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                  ]}
                  placeholder="HH:MM AM/PM"
                  placeholderTextColor={textColor + '80'}
                  value={newEvent.time}
                  onChangeText={(text) => setNewEvent({ ...newEvent, time: text })}
                />
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.fieldLabel}>{texts.location || 'Location'} *</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                  ]}
                  placeholder={texts.enterLocation || 'Enter location'}
                  placeholderTextColor={textColor + '80'}
                  value={newEvent.location}
                  onChangeText={(text) => setNewEvent({ ...newEvent, location: text })}
                />
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.fieldLabel}>{texts.description || 'Description'}</ThemedText>
                <TextInput
                  style={[
                    styles.textArea,
                    { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                  ]}
                  placeholder={texts.enterDescription || 'Enter event description'}
                  placeholderTextColor={textColor + '80'}
                  value={newEvent.description}
                  onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
                  multiline
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor }]}
                  onPress={() => setShowCreateEventModal(false)}
                >
                  <ThemedText>{texts.cancel || 'Cancel'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: tintColor }]}
                  onPress={handleCreateEvent}
                >
                  <ThemedText style={{ color: '#fff' }}>
                    {texts.create || 'Create'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  communityName: {
    fontSize: 18,
  },
  topBarIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  actionButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  eventsScroll: {
    flexDirection: 'row',
  },
  eventCard: {
    width: 280,
    padding: 16,
    borderRadius: 12,
    marginRight: 16,
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
    marginBottom: 12,
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
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feedHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  addPostButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPostButtonText: {
    fontWeight: '600',
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
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleTag: {
    marginLeft: 8,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
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
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  commentInput: {
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  closeButton: {
    padding: 4,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textArea: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdownContainer: {
    borderRadius: 8,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dropdownText: {
    flex: 1,
  },
  dropdownOptions: {
    marginTop: 4,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tagOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rtlText: {
    textAlign: 'right',
  },
});