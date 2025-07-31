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
import { getCircles, createCircle, joinCircle, leaveCircle, getCirclesByUser } from '@/lib/database';

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
  const { user } = useAuth();
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
  });

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
      if (user?.id) {
        const { data: userCirclesResult, error: joinedError } = await getCirclesByUser(user.id);
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
      const { error } = await createCircle({
        name: newCircle.name.trim(),
        description: newCircle.description.trim(),
        privacy: newCircle.privacy,
      });

      if (error) {
        Alert.alert('Error', 'Failed to create circle');
        return;
      }

      setShowCreateModal(false);
      setNewCircle({ name: '', description: '', privacy: 'public' });
      await loadCircles();
      Alert.alert('Success', 'Circle created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create circle');
    }
  };

  const handleJoinLeave = async (circleId: string, isJoined: boolean) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    try {
      const { error } = isJoined 
        ? await leaveCircle(user.id, circleId)
        : await joinCircle(user.id, circleId);

      if (error) {
         console.error('Error joining circle:', error);

        // Show user-friendly error messages
        if (error.message.includes('permission')) {
          Alert.alert(texts.error || 'Error', 'This circle is invite-only. Please contact an admin for access.');
        } else if (error.message.includes('already a member')) {
          Alert.alert(texts.info || 'Info', 'You are already a member of this circle!');
          // Update local state to reflect this
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
      Alert.alert('Error', `Failed to ${isJoined ? 'leave' : 'join'} circle`);
    }
  };

  useEffect(() => {
    loadCircles();
  }, [user]);

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
          onPress={() => handleJoinLeave(circle.id, circle.isJoined || false)}
        >
          <ThemedText style={styles.joinButtonText}>
            {circle.isJoined ? texts.leave || 'Leave' : texts.join || 'Join'}
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
          onPress={() => setShowCreateModal(true)}
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

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor }]}
                onPress={() => setShowCreateModal(false)}
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
    maxHeight: '80%',
    padding: 20,
    borderRadius: 12,
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
});