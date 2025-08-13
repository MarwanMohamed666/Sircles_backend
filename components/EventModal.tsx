
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService } from '@/lib/database';

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  preSelectedCircleId?: string; // If provided, circle selection is disabled
  circles?: Array<{ id: string; name: string }>; // Only needed when circle selection is enabled
}

interface NewEvent {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  circleId: string;
  interests: string[];
}

export default function EventModal({ 
  visible, 
  onClose, 
  onEventCreated, 
  preSelectedCircleId,
  circles = []
}: EventModalProps) {
  const { user } = useAuth();
  const { texts } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [newEvent, setNewEvent] = useState<NewEvent>({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    circleId: preSelectedCircleId || '',
    interests: []
  });

  const [interests, setInterests] = useState<{[category: string]: any[]}>({});
  const [uploading, setUploading] = useState(false);

  // Update circleId when preSelectedCircleId changes
  useEffect(() => {
    if (preSelectedCircleId) {
      setNewEvent(prev => ({ ...prev, circleId: preSelectedCircleId }));
    }
  }, [preSelectedCircleId]);

  useEffect(() => {
    if (visible) {
      loadInterests();
    }
  }, [visible]);

  const loadInterests = async () => {
    try {
      console.log('EventModal: Loading interests from database...');
      const { data, error } = await DatabaseService.getInterestsByCategory();
      if (error) {
        console.error('EventModal: Error loading interests:', error);
        return;
      }
      console.log('EventModal: Interests loaded successfully:', data);
      setInterests(data || {});
    } catch (error) {
      console.error('EventModal: Error loading interests:', error);
    }
  };

  const createEvent = async () => {
    if (!user?.id) return;

    if (!newEvent.title.trim() || !newEvent.date || !newEvent.time) {
      Alert.alert('Error', 'Please fill in all required fields (title, date, time).');
      return;
    }

    setUploading(true);
    try {
      const eventData = {
        title: newEvent.title.trim(),
        date: newEvent.date,
        time: newEvent.time,
        location: newEvent.location.trim(),
        description: newEvent.description.trim(),
        circleid: newEvent.circleId || null,
        createdby: user.id,
        interests: newEvent.interests.map(interestid => ({ 
          interestid, 
          circleid: newEvent.circleId || null 
        }))
      };

      console.log('EventModal: Creating event with data:', eventData);
      console.log('EventModal: Interest IDs being used:', newEvent.interests);

      const { error } = await DatabaseService.createEvent(eventData);

      if (error) {
        console.error('Error creating event:', error);
        Alert.alert('Error', error.message || 'Failed to create event.');
      } else {
        Alert.alert('Success', 'Event created successfully!');
        handleClose();
        onEventCreated();
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event.');
    } finally {
      setUploading(false);
    }
  };

  const toggleEventInterest = (interestId: string) => {
    console.log('EventModal: Toggling interest:', interestId);
    setNewEvent(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const handleClose = () => {
    setNewEvent({
      title: '',
      date: '',
      time: '',
      location: '',
      description: '',
      circleId: preSelectedCircleId || '',
      interests: []
    });
    onClose();
  };

  const getCircleName = () => {
    if (preSelectedCircleId) {
      return circles.find(c => c.id === preSelectedCircleId)?.name || 'Current Circle';
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.modalContainer, { backgroundColor }]}>
        <View style={[styles.modalHeader, { backgroundColor: surfaceColor }]}>
          <TouchableOpacity onPress={handleClose}>
            <IconSymbol name="xmark" size={24} color={textColor} />
          </TouchableOpacity>
          <ThemedText style={styles.modalTitle}>Create Event</ThemedText>
          <TouchableOpacity
            onPress={createEvent}
            disabled={uploading || !newEvent.title || !newEvent.date || !newEvent.time}
            style={[
              styles.postButton,
              {
                backgroundColor: (!newEvent.title || !newEvent.date || !newEvent.time || uploading)
                  ? '#ccc'
                  : tintColor
              }
            ]}
          >
            <ThemedText style={styles.postButtonText}>
              {uploading ? 'Creating...' : 'Create'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <View style={styles.inputSection}>
            <ThemedText style={styles.postingInLabel}>Creating event in:</ThemedText>
            {preSelectedCircleId ? (
              <ThemedText style={[styles.circleName, { color: tintColor }]}>
                {getCircleName()}
              </ThemedText>
            ) : (
              <ThemedText style={[styles.circleName, { color: tintColor }]}>
                General Event
              </ThemedText>
            )}
          </View>

          {/* Event Title */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Event Title *</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: surfaceColor, color: textColor }]}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
              placeholder="Enter event title"
              placeholderTextColor="#999"
            />
          </View>

          {/* Event Description */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Description</ThemedText>
            <TextInput
              style={[styles.textAreaInput, { backgroundColor: surfaceColor, color: textColor }]}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
              placeholder="Event description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Date and Time */}
          <View style={styles.dateTimeRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <ThemedText style={styles.inputLabel}>Date *</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: surfaceColor, color: textColor }]}
                value={newEvent.date}
                onChangeText={(text) => setNewEvent(prev => ({ ...prev, date: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <ThemedText style={styles.inputLabel}>Time *</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: surfaceColor, color: textColor }]}
                value={newEvent.time}
                onChangeText={(text) => setNewEvent(prev => ({ ...prev, time: text }))}
                placeholder="HH:MM"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Location</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: surfaceColor, color: textColor }]}
              value={newEvent.location}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, location: text }))}
              placeholder="Event location"
              placeholderTextColor="#999"
            />
          </View>

          {/* Circle Selection - Only show if no preSelectedCircleId */}
          {!preSelectedCircleId && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Circle (Optional)</ThemedText>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[
                    styles.tagButton,
                    {
                      backgroundColor: newEvent.circleId === '' ? tintColor : backgroundColor,
                      borderColor: tintColor,
                    }
                  ]}
                  onPress={() => setNewEvent(prev => ({ ...prev, circleId: '' }))}
                >
                  <ThemedText style={[
                    styles.tagButtonText,
                    { color: newEvent.circleId === '' ? '#fff' : textColor }
                  ]}>
                    General
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
                    onPress={() => setNewEvent(prev => ({ ...prev, circleId: circle.id }))}
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

          {/* Interests */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Event Interests</ThemedText>
            <ScrollView style={styles.interestsScrollView}>
              {Object.entries(interests).map(([category, categoryInterests]) => (
                <View key={category} style={styles.interestCategory}>
                  <ThemedText style={styles.categoryTitle}>{category}</ThemedText>
                  <View style={styles.interestChips}>
                    {categoryInterests.map((interest) => (
                      <TouchableOpacity
                        key={interest.id}
                        style={[
                          styles.interestChip,
                          {
                            backgroundColor: newEvent.interests.includes(interest.id)
                              ? tintColor
                              : surfaceColor,
                            borderColor: tintColor,
                          }
                        ]}
                        onPress={() => toggleEventInterest(interest.id)}
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
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    width: '100%',
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
    fontSize: 20,
    fontWeight: '600',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  postingInLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  textAreaInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  interestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
