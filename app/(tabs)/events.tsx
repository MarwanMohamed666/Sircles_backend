import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  date: string;
  time: string;
  location: string;
  description: string;
  circleid?: string;
  circleName?: string;
  createdby: string;
  event_interests?: Array<{
    interests: {
      id: string;
      title: string;
      category: string;
    }
  }>;
}

export default function EventsScreen() {
  const { texts, isRTL } = useLanguage();
  const { user } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');
  const successColor = useThemeColor({}, 'success');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    circleId: '',
    interests: [] as string[]
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [interests, setInterests] = useState<{[category: string]: any[]}>({});
  const [loading, setLoading] = useState(true);
  const [circles, setCircles] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchInterests();
      fetchUserCircles();
    }
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await DatabaseService.getEvents();
      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterests = async () => {
    try {
      const { data, error } = await DatabaseService.getInterestsByCategory();
      if (error) {
        console.error('Error fetching interests:', error);
      } else if (data) {
        setInterests(data);
      }
    } catch (error) {
      console.error('Error fetching interests:', error);
    }
  };

  const fetchUserCircles = async () => {
    if (!user) return;

    try {
      const { data, error } = await DatabaseService.getUserCircles(user.id);
      if (error) {
        console.error('Error fetching user circles:', error);
      } else if (data) {
        setCircles(data.map(uc => ({
          id: uc.circleid,
          name: uc.circles?.name || 'Unknown Circle'
        })));
      }
    } catch (error) {
      console.error('Error fetching user circles:', error);
    }
  };

  const handleCreateEvent = async () => {
    if (newEvent.title.trim() && newEvent.date && newEvent.time && newEvent.location.trim()) {
      try {
        const eventData = {
          title: newEvent.title.trim(),
          date: newEvent.date,
          time: newEvent.time,
          location: newEvent.location.trim(),
          description: newEvent.description.trim(),
          circleid: newEvent.circleId || null, // Set to null for general events
          interests: newEvent.interests
        };

        const { data, error } = await DatabaseService.createEvent(eventData);

        if (error) {
          console.error('Error creating event:', error);
          Alert.alert(texts.error || 'Error', 'Failed to create event. Please try again.');
          return;
        }

        // Refresh events list
        await fetchEvents();

        setNewEvent({
          title: '',
          date: '',
          time: '',
          location: '',
          description: '',
          circleId: '',
          interests: []
        });
        setShowCreateModal(false);
        Alert.alert(texts.success || 'Success', texts.eventCreated || 'Event created successfully!');
      } catch (error) {
        console.error('Unexpected error creating event:', error);
        Alert.alert(texts.error || 'Error', 'Failed to create event. Please try again.');
      }
    } else {
      Alert.alert(texts.error || 'Error', texts.fillAllFields || 'Please fill in all required fields.');
    }
  };

  const toggleInterest = (interestId: string) => {
    setNewEvent(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const loadEvents = fetchEvents; // Alias for clarity in handleDeleteEvent

  const handleDeleteEvent = async (eventId: string) => {
    console.log('🗑️ EVENTS PAGE: Delete event button pressed for eventId:', eventId);

    if (!eventId) {
      console.error('🗑️ EVENTS PAGE: No eventId provided');
      Alert.alert('Error', 'Invalid event ID');
      return;
    }

    try {
      console.log('🗑️ EVENTS PAGE: About to call DatabaseService.deleteEvent');
      const { data, error } = await DatabaseService.deleteEvent(eventId);

      console.log('🗑️ EVENTS PAGE: Delete event result:', { 
        hasData: !!data, 
        hasError: !!error,
        errorMessage: error?.message,
        data 
      });

      if (error) {
        console.error('🗑️ EVENTS PAGE: Error deleting event:', error);
        Alert.alert('Error', 'Failed to delete event: ' + error.message);
        return;
      }

      console.log('🗑️ EVENTS PAGE: Event deleted successfully, reloading events...');
      Alert.alert('Success', 'Event deleted successfully');

      // Reload events
      await loadEvents();
      console.log('🗑️ EVENTS PAGE: Events reloaded');

    } catch (error) {
      console.error('🗑️ EVENTS PAGE: Unexpected error deleting event:', error);
      Alert.alert('Error', 'An unexpected error occurred: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const checkIfCircleAdmin = async (circleId: string, userId: string) => {
    try {
      const { data } = await DatabaseService.isCircleAdmin(circleId, userId);
      return data?.isAdmin || false;
    } catch (error) {
      return false;
    }
  };

  const getInterestColor = (category: string) => {
    const colors = {
      'Technology': tintColor,
      'Sports': '#4CAF50',
      'Arts': '#9C27B0',
      'Food': '#FF9800',
      'Music': '#E91E63',
      'Travel': accentColor,
      'Education': '#2196F3',
      'Health': '#009688',
      'Business': '#795548',
      'Entertainment': '#FF5722'
    };
    return colors[category as keyof typeof colors] || tintColor;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {texts.events || 'Events'}
        </ThemedText>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: tintColor }]}
          onPress={() => setShowCreateModal(true)}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>{texts.loading || 'Loading...'}</ThemedText>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>{texts.noEventsYet || 'No events yet'}</ThemedText>
          </View>
        ) : (
          events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={[styles.eventCard, { backgroundColor: surfaceColor }]}
            onPress={() => setSelectedEvent(event)}
          >
            <View style={[styles.eventHeader, isRTL && styles.eventHeaderRTL]}>
              <View style={styles.eventInfo}>
                <View style={styles.eventInterests}>
                  {event.event_interests?.slice(0, 2).map((ei, index) => (
                    <View 
                      key={index}
                      style={[
                        styles.interestTag, 
                        { backgroundColor: getInterestColor(ei.interests.category) }
                      ]}
                    >
                      <ThemedText style={styles.interestTagText}>
                        {ei.interests.title}
                      </ThemedText>
                    </View>
                  ))}
                  {(event.event_interests?.length || 0) > 2 && (
                    <ThemedText style={styles.moreInterests}>
                      +{(event.event_interests?.length || 0) - 2} more
                    </ThemedText>
                  )}
                </View>
                {event.circleid ? (
                  event.circleName && (
                    <ThemedText style={styles.circleTag}>• {event.circleName}</ThemedText>
                  )
                ) : (
                  <ThemedText style={styles.generalTag}>• General</ThemedText>
                )}
              </View>
              {(event.createdby === user?.id) && (
                <TouchableOpacity
                  style={styles.deleteEventButton}
                  onPress={() => handleDeleteEvent(event.id)}
                >
                  <IconSymbol name="trash" size={18} color="#ff4444" />
                </TouchableOpacity>
              )}
            </View>

            <ThemedText type="defaultSemiBold" style={[styles.eventTitle, isRTL && styles.rtlText]}>
              {event.title}
            </ThemedText>

            <View style={[styles.eventDetails, isRTL && styles.eventDetailsRTL]}>
              <View style={styles.eventDateTime}>
                <View style={styles.detailRow}>
                  <IconSymbol name="calendar" size={16} color={textColor} />
                  <ThemedText style={styles.detailText}>{event.date}</ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <IconSymbol name="clock" size={16} color={textColor} />
                  <ThemedText style={styles.detailText}>{event.time}</ThemedText>
                </View>
              </View>
              <View style={styles.detailRow}>
                <IconSymbol name="location" size={16} color={textColor} />
                <ThemedText style={styles.detailText}>{event.location}</ThemedText>
              </View>
            </View>
          </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Event Details Modal */}
      <Modal
        visible={selectedEvent !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
              <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                <ThemedText type="subtitle" style={styles.modalTitle}>
                  {selectedEvent.title}
                </ThemedText>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedEvent(null)}
                >
                  <IconSymbol name="xmark" size={24} color={textColor} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.eventInterestsModal}>
                  {selectedEvent.event_interests?.map((ei, index) => (
                    <View 
                      key={index}
                      style={[
                        styles.interestTag, 
                        { backgroundColor: getInterestColor(ei.interests.category) }
                      ]}
                    >
                      <ThemedText style={styles.interestTagText}>
                        {ei.interests.title}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                <ThemedText style={[styles.eventDescription, isRTL && styles.rtlText]}>
                  {selectedEvent.description}
                </ThemedText>

                <View style={styles.eventMetaInfo}>
                  <View style={styles.metaRow}>
                    <IconSymbol name="calendar" size={20} color={textColor} />
                    <ThemedText style={styles.metaText}>
                      {selectedEvent.date} at {selectedEvent.time}
                    </ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <IconSymbol name="location" size={20} color={textColor} />
                    <ThemedText style={styles.metaText}>{selectedEvent.location}</ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <IconSymbol name="person" size={20} color={textColor} />
                    <ThemedText style={styles.metaText}>
                      {texts.organizedBy || 'Organized by'} {selectedEvent.createdby}
                    </ThemedText>
                  </View>
                  {selectedEvent.circleid ? (
                    selectedEvent.circleName && (
                      <View style={styles.metaRow}>
                        <IconSymbol name="people" size={20} color={textColor} />
                        <ThemedText style={styles.metaText}>
                          Circle: {selectedEvent.circleName}
                        </ThemedText>
                      </View>
                    )
                  ) : (
                    <View style={styles.metaRow}>
                      <IconSymbol name="globe" size={20} color={textColor} />
                      <ThemedText style={styles.metaText}>General Event</ThemedText>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* Create Event Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {texts.createEvent || 'Create Event'}
              </ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateModal(false)}
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

              <View style={styles.formField}>
                <ThemedText style={styles.fieldLabel}>{texts.circle || 'Circle'} (Optional)</ThemedText>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tagButton,
                      {
                        backgroundColor: newEvent.circleId === '' ? tintColor : backgroundColor,
                        borderColor: tintColor,
                      }
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, circleId: '' })}
                  >
                    <ThemedText style={[
                      styles.tagButtonText,
                      { color: newEvent.circleId === '' ? '#fff' : textColor }
                    ]}>
                      {texts.general || 'General'}
                    </ThemedText>
                  </TouchableOpacity>
                  {circles.map((circle) => (
                    <TouchableOpacity
                      key={circle.id}
                      style={[
                        styles.tagButton,
                        {
                          backgroundColor: newEvent.circleId === circle.id ? tintColor : backgroundColor,
                          borderColor: tintColor,
                        }
                      ]}
                      onPress={() => setNewEvent({ ...newEvent, circleId: circle.id })}
                    >
                      <ThemedText style={[
                        styles.tagButtonText,
                        { color: newEvent.circleId === circle.id ? '#fff' : textColor }
                      ]}>
                        {circle.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.fieldLabel}>
                  {texts.interests || 'Interests'} (Optional)
                </ThemedText>
                <ScrollView style={styles.interestsScrollView} showsVerticalScrollIndicator={false}>
                  {Object.entries(interests).map(([category, categoryInterests]) => (
                    <View key={category} style={styles.interestCategory}>
                      <ThemedText style={styles.categoryTitle}>{category}</ThemedText>
                      <View style={styles.pickerContainer}>
                        {categoryInterests.map((interest) => (
                          <TouchableOpacity
                            key={interest.id}
                            style={[
                              styles.interestChip,
                              {
                                backgroundColor: newEvent.interests.includes(interest.id) 
                                  ? getInterestColor(category) 
                                  : backgroundColor,
                                borderColor: getInterestColor(category),
                              }
                            ]}
                            onPress={() => toggleInterest(interest.id)}
                          >
                            <ThemedText style={[
                              styles.interestChipText,
                              { 
                                color: newEvent.interests.includes(interest.id) 
                                  ? '#fff' 
                                  : textColor 
                              }
                            ]}>
                              {interest.title}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.cancelButton, { backgroundColor }]}
                  onPress={() => setShowCreateModal(false)}
                >
                  <ThemedText>{texts.cancel || 'Cancel'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: tintColor }]}
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsList: {
    flex: 1,
    padding: 16,
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  eventInfo: {
    flex: 1,
  },
  eventInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  eventInterestsModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  interestTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  moreInterests: {
    fontSize: 12,
    opacity: 0.7,
  },
  circleTag: {
    fontSize: 12,
    opacity: 0.7,
  },
  generalTag: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  eventTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  eventDetails: {
    gap: 4,
  },
  eventDetailsRTL: {
    alignItems: 'flex-end',
  },
  eventDateTime: {
    flexDirection: 'row',
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    borderRadius: 12,
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
  modalTitle: {
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  eventDescription: {
    lineHeight: 20,
    marginBottom: 16,
  },
  eventMetaInfo: {
    gap: 8,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
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
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalActionButton: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  deleteEventButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  interestsScrollView: {
    maxHeight: 200,
  },
  interestCategory: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    margin: 2,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});