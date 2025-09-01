
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService } from '@/lib/database';

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location?: string;
  location_url?: string;
  photo_url?: string;
  createdby: string;
  circleid?: string;
  creator?: {
    name: string;
    avatar_url?: string;
  };
  circle?: {
    id: string;
    name: string;
  };
  event_interests?: Array<{
    interests: {
      id: string;
      title: string;
    };
  }>;
  user_rsvp?: Array<{
    status: 'going' | 'maybe' | 'no_going';
  }>;
  going_count?: number;
  maybe_count?: number;
  no_going_count?: number;
}

export default function EventScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const successColor = useThemeColor({}, 'success');

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEvent = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getEvent(id as string);
      
      if (error) {
        console.error('Error loading event:', error);
        Alert.alert('Error', 'Failed to load event');
        return;
      }

      setEvent(data);
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleEventRsvp = async (status: 'going' | 'maybe' | 'no_going') => {
    if (!user || !event) return;

    try {
      const hasExistingRsvp = event.user_rsvp && event.user_rsvp.length > 0;

      if (hasExistingRsvp) {
        const currentStatus = event.user_rsvp[0].status;
        if (currentStatus === status) {
          // Same status clicked - remove RSVP
          const { error } = await DatabaseService.deleteEventRsvp(event.id);
          if (error) {
            Alert.alert('Error', 'Failed to remove RSVP');
            return;
          }
        } else {
          // Different status - update RSVP
          const { error } = await DatabaseService.updateEventRsvp(event.id, status);
          if (error) {
            Alert.alert('Error', 'Failed to update RSVP');
            return;
          }
        }
      } else {
        // No existing RSVP - create new one
        const { error } = await DatabaseService.createEventRsvp(event.id, status);
        if (error) {
          Alert.alert('Error', 'Failed to create RSVP');
          return;
        }
      }

      // Refresh event data
      await loadEvent();
    } catch (error) {
      console.error('Error handling event RSVP:', error);
      Alert.alert('Error', 'Failed to update RSVP');
    }
  };

  useEffect(() => {
    loadEvent();
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

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>Event not found</ThemedText>
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
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          Event Details
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.eventCard, { backgroundColor: surfaceColor }]}>
          {/* Event Photo */}
          {event.photo_url && (
            <Image
              source={{ uri: event.photo_url }}
              style={styles.eventPhoto}
              resizeMode="cover"
            />
          )}

          {/* Event Header */}
          <View style={styles.eventHeader}>
            <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
            <View style={styles.eventMeta}>
              <View style={styles.metaItem}>
                <IconSymbol name="calendar" size={16} color={textColor} />
                <ThemedText style={styles.metaText}>
                  {new Date(event.date).toLocaleDateString()} at {event.time}
                </ThemedText>
              </View>
              {event.location && (
                <View style={styles.metaItem}>
                  <IconSymbol name="location" size={16} color={textColor} />
                  {event.location_url ? (
                    <TouchableOpacity onPress={() => {
                      // Open URL in browser
                      import('expo-linking').then(({ default: Linking }) => {
                        Linking.openURL(event.location_url!);
                      });
                    }}>
                      <ThemedText style={[styles.metaText, { color: tintColor, textDecorationLine: 'underline' }]}>
                        {event.location}
                      </ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <ThemedText style={styles.metaText}>{event.location}</ThemedText>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Event Description */}
          {event.description && (
            <View style={styles.descriptionSection}>
              <ThemedText style={styles.sectionTitle}>Description</ThemedText>
              <ThemedText style={styles.eventDescription}>{event.description}</ThemedText>
            </View>
          )}

          {/* Event Interests */}
          {event.event_interests && event.event_interests.length > 0 && (
            <View style={styles.interestsSection}>
              <ThemedText style={styles.sectionTitle}>Interests</ThemedText>
              <View style={styles.interestTags}>
                {event.event_interests.map((ei) => (
                  <View
                    key={ei.interests.id}
                    style={[styles.interestTag, { backgroundColor: tintColor + '20', borderColor: tintColor }]}
                  >
                    <ThemedText style={[styles.interestText, { color: tintColor }]}>
                      {ei.interests.title}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Creator Info */}
          <View style={styles.creatorSection}>
            <ThemedText style={styles.sectionTitle}>Organized by</ThemedText>
            <View style={styles.creatorInfo}>
              <Image
                source={{ uri: event.creator?.avatar_url || 'https://via.placeholder.com/40' }}
                style={styles.creatorAvatar}
              />
              <View style={styles.creatorDetails}>
                <ThemedText style={styles.creatorName}>
                  {event.creator?.name || 'Unknown'}
                </ThemedText>
                {event.circle && (
                  <TouchableOpacity
                    onPress={() => router.push(`/circle/${event.circle!.id}`)}
                  >
                    <ThemedText style={[styles.circleLink, { color: tintColor }]}>
                      in {event.circle.name}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* RSVP Section */}
          <View style={styles.rsvpSection}>
            <ThemedText style={styles.sectionTitle}>Will you attend?</ThemedText>
            <View style={styles.rsvpButtons}>
              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  { 
                    backgroundColor: event.user_rsvp?.[0]?.status === 'going' ? successColor : backgroundColor,
                    borderColor: successColor 
                  }
                ]}
                onPress={() => handleEventRsvp('going')}
              >
                <IconSymbol 
                  name="checkmark.circle.fill" 
                  size={16} 
                  color={event.user_rsvp?.[0]?.status === 'going' ? '#fff' : successColor} 
                />
                <ThemedText style={[
                  styles.rsvpButtonText,
                  { color: event.user_rsvp?.[0]?.status === 'going' ? '#fff' : successColor }
                ]}>
                  Going ({event.going_count || 0})
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  { 
                    backgroundColor: event.user_rsvp?.[0]?.status === 'maybe' ? '#FF9800' : backgroundColor,
                    borderColor: '#FF9800' 
                  }
                ]}
                onPress={() => handleEventRsvp('maybe')}
              >
                <IconSymbol 
                  name="star.fill" 
                  size={16} 
                  color={event.user_rsvp?.[0]?.status === 'maybe' ? '#fff' : '#FF9800'} 
                />
                <ThemedText style={[
                  styles.rsvpButtonText,
                  { color: event.user_rsvp?.[0]?.status === 'maybe' ? '#fff' : '#FF9800' }
                ]}>
                  Maybe ({event.maybe_count || 0})
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  { 
                    backgroundColor: event.user_rsvp?.[0]?.status === 'no_going' ? '#f44336' : backgroundColor,
                    borderColor: '#f44336' 
                  }
                ]}
                onPress={() => handleEventRsvp('no_going')}
              >
                <IconSymbol 
                  name="xmark.circle.fill" 
                  size={16} 
                  color={event.user_rsvp?.[0]?.status === 'no_going' ? '#fff' : '#f44336'} 
                />
                <ThemedText style={[
                  styles.rsvpButtonText,
                  { color: event.user_rsvp?.[0]?.status === 'no_going' ? '#fff' : '#f44336' }
                ]}>
                  Can't Go ({event.no_going_count || 0})
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  eventCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  eventPhoto: {
    width: '100%',
    height: 200,
  },
  eventHeader: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  eventMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 16,
    opacity: 0.8,
  },
  descriptionSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  interestsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  interestText: {
    fontSize: 12,
    fontWeight: '600',
  },
  creatorSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  circleLink: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  rsvpSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  rsvpButtons: {
    gap: 12,
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    gap: 8,
  },
  rsvpButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
