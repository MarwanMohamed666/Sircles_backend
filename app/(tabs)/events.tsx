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
  tag: string;
  description: string;
  circleId?: string;
  circleName?: string;
  createdBy: string;
  rsvp?: 'yes' | 'maybe' | 'no';
  attendees: { yes: number; maybe: number; no: number };
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
    tag: 'Social',
    circleId: '',
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [interests, setInterests] = useState<{[category: string]: any[]}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    fetchInterests();
    fetchUserCircles();
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await DatabaseService.getEvents();
      if (error) {
        console.error('Error fetching events:', error);
      } else {
        // Ensure all events have default attendees structure
        const eventsWithDefaults = (data || []).map(event => ({
          ...event,
          attendees: event.attendees || { yes: 0, maybe: 0, no: 0 }
        }));
        setEvents(eventsWithDefaults);
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

  const eventTags = ['Social', 'Education', 'Workshop', 'Fitness', 'Entertainment', 'Community'];
  const [circles, setCircles] = useState<{id: string, name: string}[]>([]);

  const handleRSVP = async (eventId: string, response: 'yes' | 'maybe' | 'no') => {
    try {
      // Update local state immediately for better UX
      setEvents(events.map(event => {
        if (event.id === eventId) {
          const updatedAttendees = { 
            yes: 0, 
            maybe: 0, 
            no: 0, 
            ...(event.attendees || {}) 
          };

          // Remove from previous RSVP if exists
          if (event.rsvp) {
            updatedAttendees[event.rsvp] = Math.max(0, updatedAttendees[event.rsvp] - 1);
          }

          // Add to new RSVP
          updatedAttendees[response] = (updatedAttendees[response] || 0) + 1;

          return {
            ...event,
            rsvp: response,
            attendees: updatedAttendees,
          };
        }
        return event;
      }));

      if (selectedEvent && selectedEvent.id === eventId) {
        const updatedEvent = events.find(e => e.id === eventId);
        if (updatedEvent) {
          setSelectedEvent({ ...updatedEvent, rsvp: response });
        }
      }

      // Here you could add database call to save RSVP
      // await DatabaseService.updateEventRSVP(eventId, user?.id, response);
      
    } catch (error) {
      console.error('Error updating RSVP:', error);
      // Revert changes on error
      await fetchEvents();
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
          tag: newEvent.tag,
          circleId: newEvent.circleId || null,
          createdBy: user?.id || '',
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
          tag: 'Social',
          circleId: '',
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

  const getTagColor = (tag: string) => {
    const colors = {
      Social: tintColor,
      Education: '#9C27B0',
      Workshop: '#FF9800',
      Fitness: successColor,
      Entertainment: '#E91E63',
      Community: accentColor,
    };
    return colors[tag as keyof typeof colors] || tintColor;
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
                <View style={[styles.eventTag, { backgroundColor: getTagColor(event.tag) }]}>
                  <ThemedText style={styles.eventTagText}>{event.tag}</ThemedText>
                </View>
                {event.circleName && (
                  <ThemedText style={styles.circleTag}>• {event.circleName}</ThemedText>
                )}
              </View>
              <View style={[styles.rsvpStatus, event.rsvp && styles.rsvpSelected]}>
                {event.rsvp && (
                  <IconSymbol
                    name={event.rsvp === 'yes' ? 'checkmark' : event.rsvp === 'maybe' ? 'questionmark' : 'xmark'}
                    size={16}
                    color={event.rsvp === 'yes' ? successColor : event.rsvp === 'maybe' ? '#FFB74D' : '#EF5350'}
                  />
                )}
              </View>
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

            <View style={[styles.attendeesInfo, isRTL && styles.attendeesInfoRTL]}>
              <View style={styles.attendeeCount}>
                <View style={[styles.attendeeDot, { backgroundColor: successColor }]} />
                <ThemedText style={styles.attendeeText}>{event.attendees?.yes || 0} {texts.going || 'Going'}</ThemedText>
              </View>
              <View style={styles.attendeeCount}>
                <View style={[styles.attendeeDot, { backgroundColor: '#FFB74D' }]} />
                <ThemedText style={styles.attendeeText}>{event.attendees?.maybe || 0} {texts.maybe || 'Maybe'}</ThemedText>
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
                <View style={[styles.eventTag, { backgroundColor: getTagColor(selectedEvent.tag) }]}>
                  <ThemedText style={styles.eventTagText}>{selectedEvent.tag}</ThemedText>
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
                      {texts.organizedBy || 'Organized by'} {selectedEvent.createdBy}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.attendeesSection}>
                  <ThemedText type="defaultSemiBold" style={styles.attendeesTitle}>
                    {texts.attendees || 'Attendees'}
                  </ThemedText>
                  <View style={styles.attendeesStats}>
                    <View style={styles.statItem}>
                      <ThemedText style={styles.statNumber}>{selectedEvent.attendees?.yes || 0}</ThemedText>
                      <ThemedText style={styles.statLabel}>{texts.going || 'Going'}</ThemedText>
                    </View>
                    <View style={styles.statItem}>
                      <ThemedText style={styles.statNumber}>{selectedEvent.attendees?.maybe || 0}</ThemedText>
                      <ThemedText style={styles.statLabel}>{texts.maybe || 'Maybe'}</ThemedText>
                    </View>
                    <View style={styles.statItem}>
                      <ThemedText style={styles.statNumber}>{selectedEvent.attendees?.no || 0}</ThemedText>
                      <ThemedText style={styles.statLabel}>{texts.cantGo || "Can't Go"}</ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.rsvpSection}>
                  <ThemedText type="defaultSemiBold" style={styles.rsvpTitle}>
                    {texts.yourResponse || 'Your Response'}
                  </ThemedText>
                  <View style={[styles.rsvpButtons, isRTL && styles.rsvpButtonsRTL]}>
                    {(['yes', 'maybe', 'no'] as const).map((response) => (
                      <TouchableOpacity
                        key={response}
                        style={[
                          styles.rsvpButton,
                          {
                            backgroundColor: selectedEvent.rsvp === response ? 
                              (response === 'yes' ? successColor : response === 'maybe' ? '#FFB74D' : '#EF5350') : 
                              backgroundColor,
                            borderColor: response === 'yes' ? successColor : response === 'maybe' ? '#FFB74D' : '#EF5350',
                          }
                        ]}
                        onPress={() => handleRSVP(selectedEvent.id, response)}
                      >
                        <ThemedText style={[
                          styles.rsvpButtonText,
                          { color: selectedEvent.rsvp === response ? '#fff' : textColor }
                        ]}>
                          {response === 'yes' ? texts.going || 'Going' : 
                           response === 'maybe' ? texts.maybe || 'Maybe' : 
                           texts.cantGo || "Can't Go"}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
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
                <ThemedText style={styles.fieldLabel}>{texts.tag || 'Tag'}</ThemedText>
                <View style={styles.pickerContainer}>
                  {eventTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagButton,
                        {
                          backgroundColor: newEvent.tag === tag ? tintColor : backgroundColor,
                          borderColor: tintColor,
                        }
                      ]}
                      onPress={() => setNewEvent({ ...newEvent, tag })}
                    >
                      <ThemedText style={[
                        styles.tagButtonText,
                        { color: newEvent.tag === tag ? '#fff' : textColor }
                      ]}>
                        {tag}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {circles.length > 0 && (
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
              )}

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
    alignItems: 'center',
    marginBottom: 8,
  },
  eventHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  eventTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  circleTag: {
    marginLeft: 8,
    fontSize: 12,
    opacity: 0.7,
  },
  rsvpStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  eventTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  eventDetails: {
    gap: 4,
    marginBottom: 12,
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
  attendeesInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  attendeesInfoRTL: {
    flexDirection: 'row-reverse',
  },
  attendeeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  attendeeText: {
    fontSize: 12,
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
  attendeesSection: {
    marginBottom: 16,
  },
  attendeesTitle: {
    marginBottom: 8,
  },
  attendeesStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  rsvpSection: {
    marginBottom: 16,
  },
  rsvpTitle: {
    marginBottom: 12,
  },
  rsvpButtons: {
    gap: 8,
  },
  rsvpButtonsRTL: {
    flexDirection: 'column-reverse',
  },
  rsvpButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  rsvpButtonText: {
    fontWeight: '600',
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
});