import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getCircles, createCircle, joinCircle, leaveCircle, getCirclesByUser, DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { StorageService } from '@/lib/storage';

interface Circle {
  id: string;
  name: string;
  description: string;
  privacy: string;
  creationDate: string;
  memberCount?: number;
  isJoined?: boolean;
}

export default function CirclesScreen() {
  const { user, userProfile } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [circles, setCircles] = useState<Circle[]>([]);
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [error, setError] = useState<string | null>(null); // Added error state

  const [newCircle, setNewCircle] = useState({
    name: '',
    description: '',
    privacy: 'public' as 'public' | 'private',
    interests: [] as string[],
    image: null as string | null,
  });
  const [interests, setInterests] = useState<{[key: string]: any[]}>({});
  const [loadingInterests, setLoadingInterests] = useState(false);

  const loadCircles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all circles
      const { data: allCircles, error: circlesError } = await getCircles();
      if (circlesError) {
        console.error('Error loading circles:', circlesError);
        setError('Unable to load circles. Please try again.');
        setCircles([]);
        return;
      }

      // Load user's joined circles if user is logged in
      let joinedCircleIds = new Set<string>();
      if (userProfile?.id) {
        const { data: userCirclesResult, error: joinedError } = await getCirclesByUser(userProfile.id);
        if (joinedError) {
          console.error('Error loading joined circles:', joinedError);
          // Don't show error for this, just continue without joined status
        } else {
          joinedCircleIds = new Set(userCirclesResult?.map(uc => uc.circleId) || []);
        }
      }

      // Format circles
      const circlesWithJoinStatus = allCircles?.map(circle => ({
        ...circle,
        isJoined: joinedCircleIds.has(circle.id),
        memberCount: 0 // You can implement actual member count if needed
      })) || [];

      setCircles(circlesWithJoinStatus);
      setMyCircles(circlesWithJoinStatus.filter(circle => circle.isJoined));
    } catch (error) {
      console.error('Error loading circles:', error);
      setError('Something went wrong. Please try again.');
      setCircles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCircles();
    setRefreshing(false);
  };

  const loadInterests = async () => {
    setLoadingInterests(true);
    try {
      const { data, error } = await DatabaseService.getInterestsByCategory();
      if (!error && data) {
        setInterests(data);
      }
    } catch (error) {
      console.error('Error loading interests:', error);
    } finally {
      setLoadingInterests(false);
    }
  };

  const handleCreateCircle = async () => {
    if (!newCircle.name.trim()) {
      Alert.alert('Error', 'Circle name is required');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a circle');
      return;
    }

    try {
      const { data, error } = await createCircle({
        name: newCircle.name.trim(),
        description: newCircle.description.trim(),
        privacy: newCircle.privacy,
        creator: user.id, // Use the authenticated user's ID from Supabase Auth
      });

      if (error) {
        console.error('Error creating circle:', error);
        Alert.alert('Error', 'Failed to create circle');
        return;
      }

      // If circle was created successfully, add interests
      if (data && newCircle.interests.length > 0) {
        try {
          // Add selected interests to the circle
          for (const interestId of newCircle.interests) {
            const { error: interestError } = await supabase
              .from('circle_interests')
              .insert({
                circleid: data.id,
                interestid: interestId
              });
            
            if (interestError) {
              console.error('Error adding interest:', interestError);
              // Continue with other interests even if one fails
            }
          }
        } catch (interestError) {
          console.error('Error adding interests to circle:', interestError);
          // Don't fail the entire operation for interests
        }
      }

      setShowCreateModal(false);
      setNewCircle({ name: '', description: '', privacy: 'public', interests: [], image: null });
      await loadCircles();
      Alert.alert('Success', 'Circle created successfully!');
    } catch (error) {
      console.error('Error creating circle:', error);
      Alert.alert('Error', 'Failed to create circle');
    }
  };

  const toggleInterest = (interestId: string) => {
    setNewCircle(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const handleJoinLeave = async (circleId: string, isJoined: boolean, circleName: string, circlePrivacy: string) => {
    if (!userProfile?.id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    if (isJoined) {
      // Show confirmation dialog for leaving
      Alert.alert(
        'Leave Circle',
        `Are you sure you want to leave "${circleName}"?`,
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
                const { error } = await leaveCircle(userProfile.id, circleId);
                if (error) {
                  Alert.alert('Error', 'Failed to leave circle');
                  return;
                }
                await loadCircles();
              } catch (error) {
                Alert.alert('Error', 'Failed to leave circle');
              }
            },
          },
        ]
      );
      return;
    }

    // Handle joining based on privacy
    if (circlePrivacy === 'private') {
      // Show request to join modal
      Alert.prompt(
        'Request to Join',
        `Send a request to join "${circleName}". You can include an optional message:`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send Request',
            onPress: async (message) => {
              try {
                const { error } = await DatabaseService.requestToJoinCircle(userProfile.id, circleId, message);
                if (error) {
                  if (error.message.includes('already requested')) {
                    Alert.alert('Info', 'You have already requested to join this circle.');
                  } else {
                    Alert.alert('Error', 'Failed to send join request');
                  }
                  return;
                }
                Alert.alert('Success', 'Join request sent! The admin will review your request.');
              } catch (error) {
                Alert.alert('Error', 'Failed to send join request');
              }
            },
          },
        ],
        'plain-text'
      );
    } else {
      // Public circle - join directly
      try {
        const { error } = await joinCircle(userProfile.id, circleId);

        if (error) {
          console.error('Error joining circle:', error);
          if (error.message.includes('already a member')) {
            Alert.alert(texts.info || 'Info', 'You are already a member of this circle!');
            setCircles(circles.map(circle => 
              circle.id === circleId 
                ? { ...circle, isJoined: true }
                : circle
            ));
          } else {
            Alert.alert(texts.error || 'Error', 'Unable to join circle. Please try again.');
          }
          return;
        }

        await loadCircles();
      } catch (error) {
        Alert.alert('Error', 'Failed to join circle');
      }
    }
  };

  useEffect(() => {
    loadCircles();
  }, [userProfile]);

  const renderCircle = (circle: Circle) => (
    <TouchableOpacity
      key={circle.id}
      style={[styles.circleCard, { backgroundColor: surfaceColor }]}
      onPress={() => router.push(`/circle/${circle.id}`)}
    >
      <View style={styles.circleHeader}>
        <View style={styles.circleInfo}>
          <ThemedText type="defaultSemiBold" style={[styles.circleName, isRTL && styles.rtlText]}>
            {circle.name}
          </ThemedText>
          <ThemedText style={[styles.circleDescription, isRTL && styles.rtlText]}>
            {circle.description || 'No description'}
          </ThemedText>
          <View style={[styles.circleDetails, isRTL && styles.circleDetailsRTL]}>
            <View style={[styles.detailItem, isRTL && styles.detailItemRTL]}>
              <IconSymbol name="person.3" size={16} color={textColor} />
              <ThemedText style={styles.detailText}>
                {circle.memberCount || 0} {texts.members || 'members'}
              </ThemedText>
            </View>
            <View style={[styles.detailItem, isRTL && styles.detailItemRTL]}>
              <IconSymbol 
                name={circle.privacy === 'private' ? "lock.fill" : "globe"} 
                size={16} 
                color={textColor} 
              />
              <ThemedText style={styles.detailText}>
                {circle.privacy === 'private' ? texts.private || 'Private' : texts.public || 'Public'}
              </ThemedText>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.joinButton,
            { backgroundColor: circle.isJoined ? '#EF5350' : tintColor }
          ]}
          onPress={() => handleJoinLeave(circle.id, circle.isJoined || false, circle.name, circle.privacy)}
        >
          <ThemedText style={styles.joinButtonText}>
            {circle.isJoined 
              ? texts.leave || 'Leave' 
              : circle.privacy === 'private' 
                ? 'Request to Join'
                : texts.join || 'Join'
            }
          </ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {texts.circles || 'Circles'}
        </ThemedText>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: tintColor }]}
          onPress={() => {
            setShowCreateModal(true);
            loadInterests();
          }}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'all' && { backgroundColor: tintColor }
          ]}
          onPress={() => setActiveTab('all')}
        >
          <ThemedText style={[
            styles.tabText,
            activeTab === 'all' && { color: '#fff' }
          ]}>
            {texts.allCircles || 'All Circles'}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'my' && { backgroundColor: tintColor }
          ]}
          onPress={() => setActiveTab('my')}
        >
          <ThemedText style={[
            styles.tabText,
            activeTab === 'my' && { color: '#fff' }
          ]}>
            {texts.myCircles || 'My Circles'}
          </ThemedText>
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
          <View style={styles.loadingContainer}>
            <ThemedText>{texts.loading || 'Loading...'}</ThemedText>
          </View>
        ) : error ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="exclamationmark.triangle" size={64} color="#EF5350" />
              <ThemedText style={styles.emptyText}>
                {error}
              </ThemedText>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: tintColor }]}
                onPress={loadCircles}
              >
                <ThemedText style={[styles.retryButtonText, { color: '#fff' }]}>
                  {texts.retry || 'Retry'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (activeTab === 'all' ? circles : myCircles).length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol name="person.3" size={64} color={textColor + '40'} />
                <ThemedText style={styles.emptyText}>
                  {activeTab === 'all' 
                    ? texts.noCircles || 'No circles available'
                    : texts.noJoinedCircles || 'You haven\'t joined any circles yet'
                  }
                </ThemedText>
              </View>
            ) : (
          <View style={styles.circlesList}>
            {(activeTab === 'all' ? circles : myCircles).map(renderCircle)}
            {(activeTab === 'all' ? circles : myCircles).length === 0 && (
              <View style={styles.emptyContainer}>
                <IconSymbol name="person.3" size={64} color={textColor + '40'} />
                <ThemedText style={styles.emptyText}>
                  {activeTab === 'all' 
                    ? texts.noCircles || 'No circles available'
                    : texts.noJoinedCircles || 'You haven\'t joined any circles yet'
                  }
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Circle Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {texts.createCircle || 'Create Circle'}
            </ThemedText>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>

            <View style={styles.formField}>
              <ThemedText style={styles.fieldLabel}>
                {texts.name || 'Name'}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                ]}
                placeholder={texts.enterCircleName || 'Enter circle name'}
                placeholderTextColor={textColor + '80'}
                value={newCircle.name}
                onChangeText={(text) => setNewCircle({ ...newCircle, name: text })}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText style={styles.fieldLabel}>
                {texts.description || 'Description'}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                ]}
                placeholder={texts.enterDescription || 'Enter description'}
                placeholderTextColor={textColor + '80'}
                value={newCircle.description}
                onChangeText={(text) => setNewCircle({ ...newCircle, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText style={styles.fieldLabel}>
                {texts.privacy || 'Privacy'}
              </ThemedText>
              <View style={styles.privacyOptions}>
                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    {
                      backgroundColor: newCircle.privacy === 'public' ? tintColor : backgroundColor,
                      borderColor: tintColor,
                    }
                  ]}
                  onPress={() => setNewCircle({ ...newCircle, privacy: 'public' })}
                >
                  <IconSymbol name="globe" size={16} color={newCircle.privacy === 'public' ? '#fff' : textColor} />
                  <ThemedText style={[
                    styles.privacyOptionText,
                    { color: newCircle.privacy === 'public' ? '#fff' : textColor }
                  ]}>
                    {texts.public || 'Public'}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    {
                      backgroundColor: newCircle.privacy === 'private' ? tintColor : backgroundColor,
                      borderColor: tintColor,
                    }
                  ]}
                  onPress={() => setNewCircle({ ...newCircle, privacy: 'private' })}
                >
                  <IconSymbol name="lock.fill" size={16} color={newCircle.privacy === 'private' ? '#fff' : textColor} />
                  <ThemedText style={[
                    styles.privacyOptionText,
                    { color: newCircle.privacy === 'private' ? '#fff' : textColor }
                  ]}>
                    {texts.private || 'Private'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formField}>
              <ThemedText style={styles.fieldLabel}>
                {texts.interests || 'Interests'} (Optional)
              </ThemedText>
              <View style={[styles.interestsContainer, { backgroundColor: backgroundColor, borderColor: textColor + '20' }]}>
                {loadingInterests ? (
                  <ThemedText style={styles.loadingText}>Loading interests...</ThemedText>
                ) : Object.keys(interests).length === 0 ? (
                  <ThemedText style={styles.loadingText}>No interests available</ThemedText>
                ) : (
                  <ScrollView 
                    style={styles.interestsScrollView}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    contentContainerStyle={{ paddingBottom: 8 }}
                  >
                    {Object.entries(interests).map(([category, categoryInterests]) => (
                      <View key={category} style={styles.interestCategory}>
                        <ThemedText style={styles.categoryTitle}>{category}</ThemedText>
                        <View style={styles.interestsList}>
                          {categoryInterests.map((interest) => (
                            <TouchableOpacity
                              key={interest.id}
                              style={[
                                styles.interestChip,
                                {
                                  backgroundColor: newCircle.interests.includes(interest.id) 
                                    ? tintColor 
                                    : surfaceColor,
                                  borderColor: tintColor,
                                }
                              ]}
                              onPress={() => toggleInterest(interest.id)}
                            >
                              <ThemedText style={[
                                styles.interestChipText,
                                { 
                                  color: newCircle.interests.includes(interest.id) 
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
                )}
              </View>
            </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor }]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewCircle({ name: '', description: '', privacy: 'public', interests: [], image: null });
                }}
              >
                <ThemedText>{texts.cancel || 'Cancel'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handleCreateCircle}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {texts.create || 'Create'}
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  circlesList: {
    gap: 12,
  },
  circleCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  circleInfo: {
    flex: 1,
    marginRight: 12,
  },
  circleName: {
    fontSize: 16,
    marginBottom: 4,
  },
  circleDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  circleDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  circleDetailsRTL: {
    flexDirection: 'row-reverse',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailItemRTL: {
    flexDirection: 'row-reverse',
  },
  detailText: {
    fontSize: 12,
    opacity: 0.8,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
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
    maxHeight: '85%',
    padding: 20,
    borderRadius: 12,
    paddingBottom: 16,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  textInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  privacyOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
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
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalScrollView: {
    flex: 1,
    marginBottom: 12,
  },
  interestsContainer: {
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
  },
  interestsScrollView: {
    flex: 1,
    padding: 8,
  },
  interestCategory: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  interestsList: {
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
  loadingText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 20,
    fontSize: 14,
  },
});