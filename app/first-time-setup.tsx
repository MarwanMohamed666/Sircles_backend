import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/supabase';

interface Interest {
  id: string;
  title: string;
  category: string;
}

export default function FirstTimeSetupScreen() {
  const { user, updateUserProfile } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'textColor');

  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedLookingFor, setSelectedLookingFor] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 = interests, 2 = looking for

  // Use interests for looking for section too
  const [lookingForInterests, setLookingForInterests] = useState<{[category: string]: Interest[]}>({});

  useEffect(() => {
    loadInterests();
  }, []);

  const loadInterests = async () => {
    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getInterests();
      if (error) {
        console.error('Error loading interests:', error);
        Alert.alert('Error', 'Failed to load interests');
      } else {
        setInterests(data || []);
        // Use same interests for looking for section
        const grouped = groupInterestsByCategory(data || []);
        setLookingForInterests(grouped);
      }
    } catch (error) {
      console.error('Error loading interests:', error);
      Alert.alert('Error', 'Failed to load interests');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
    // Don't save to database immediately - wait for complete setup
  };

  const toggleLookingFor = (lookingForId: string) => {
    setSelectedLookingFor(prev => 
      prev.includes(lookingForId) 
        ? prev.filter(id => id !== lookingForId)
        : [...prev, lookingForId]
    );
    // Don't save to database immediately - wait for complete setup
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (selectedInterests.length === 0) {
        Alert.alert('Selection Required', 'Please select at least one interest to continue.');
        return;
      }
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleFinishSetup = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (selectedInterests.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one interest.');
      return;
    }

    if (selectedLookingFor.length === 0) {
      Alert.alert('Selection Required', 'Please select what you\'re looking for.');
      return;
    }

    try {
      setSaving(true);

      console.log('Starting setup completion...');
      console.log('Selected interests:', selectedInterests.length);
      console.log('Selected looking for:', selectedLookingFor.length);

      // Clear any existing preferences first to avoid duplicates
      try {
        await supabase
          .from('user_interests')
          .delete()
          .eq('userid', user.id);
        
        await supabase
          .from('user_look_for')
          .delete()
          .eq('userid', user.id);
      } catch (cleanupError) {
        console.log('Cleanup error (non-critical):', cleanupError);
      }

      // Save user interests
      if (selectedInterests.length > 0) {
        const interestInserts = selectedInterests.map(interestId => ({
          userid: user.id,
          interestid: interestId
        }));

        const { error: interestsError } = await supabase
          .from('user_interests')
          .insert(interestInserts);

        if (interestsError) {
          console.error('Error saving interests:', interestsError);
          Alert.alert('Error', 'Failed to save interests. Please try again.');
          return;
        }
        console.log('Interests saved successfully');
      }

      // Save user looking for preferences
      if (selectedLookingFor.length > 0) {
        const lookingForInserts = selectedLookingFor.map(lookingForId => ({
          userid: user.id,
          interestid: lookingForId
        }));

        const { error: lookingForError } = await supabase
          .from('user_look_for')
          .insert(lookingForInserts);

        if (lookingForError) {
          console.error('Error saving looking for:', lookingForError);
          Alert.alert('Error', 'Failed to save looking for preferences. Please try again.');
          return;
        }
        console.log('Looking for preferences saved successfully');
      }

      // Update user's first_login status to false - do this last
      const { error: updateError } = await updateUserProfile({
        first_login: false
      });

      if (updateError) {
        console.error('Error updating first login status:', updateError);
        Alert.alert('Error', 'Failed to complete setup. Please try again.');
        return;
      }

      console.log('Setup completed successfully, navigating to home...');
      
      // Small delay to ensure state updates are processed
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);

    } catch (error) {
      console.error('Error finishing setup:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const groupInterestsByCategory = (interestsList?: Interest[]) => {
    const grouped: { [key: string]: Interest[] } = {};
    (interestsList || interests).forEach(interest => {
      if (!grouped[interest.category]) {
        grouped[interest.category] = [];
      }
      grouped[interest.category].push(interest);
    });
    return grouped;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centeredContainer}>
          <ThemedText>Loading interests...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={styles.headerTitle}>
          Welcome! Let's Set Up Your Profile
        </ThemedText>
        <ThemedText style={styles.stepIndicator}>
          Step {currentStep} of 2
        </ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 ? (
          // Step 1: Interests Selection
          <View style={styles.stepContainer}>
            <ThemedText type="subtitle" style={styles.stepTitle}>
              What are you interested in?
            </ThemedText>
            <ThemedText style={styles.stepDescription}>
              Select your interests to help us connect you with relevant circles and events.
            </ThemedText>

            {Object.entries(groupInterestsByCategory()).map(([category, categoryInterests]) => (
              <View key={category} style={styles.categorySection}>
                <ThemedText style={[styles.categoryTitle, { color: tintColor }]}>
                  {category}
                </ThemedText>
                <View style={styles.interestsGrid}>
                  {categoryInterests.map((interest) => (
                    <TouchableOpacity
                      key={interest.id}
                      style={[
                        styles.interestChip,
                        {
                          backgroundColor: selectedInterests.includes(interest.id) 
                            ? tintColor 
                            : surfaceColor,
                          borderColor: tintColor,
                        }
                      ]}
                      onPress={() => toggleInterest(interest.id)}
                    >
                      <ThemedText style={[
                        styles.interestText,
                        {
                          color: selectedInterests.includes(interest.id) 
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

            <View style={styles.selectionInfo}>
              <ThemedText style={styles.selectionCount}>
                {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''} selected
              </ThemedText>
            </View>
          </View>
        ) : (
          // Step 2: Looking For Selection
          <View style={styles.stepContainer}>
            <ThemedText type="subtitle" style={styles.stepTitle}>
              What are you looking for?
            </ThemedText>
            <ThemedText style={styles.stepDescription}>
              Help others understand what kind of connections you're seeking.
            </ThemedText>

            {Object.entries(lookingForInterests).map(([category, categoryInterests]) => (
              <View key={category} style={styles.categorySection}>
                <ThemedText style={[styles.categoryTitle, { color: tintColor }]}>
                  {category}
                </ThemedText>
                <View style={styles.interestsGrid}>
                  {categoryInterests.map((interest) => (
                    <TouchableOpacity
                      key={interest.id}
                      style={[
                        styles.interestChip,
                        {
                          backgroundColor: selectedLookingFor.includes(interest.id) 
                            ? tintColor 
                            : surfaceColor,
                          borderColor: tintColor,
                        }
                      ]}
                      onPress={() => toggleLookingFor(interest.id)}
                    >
                      <ThemedText style={[
                        styles.interestText,
                        {
                          color: selectedLookingFor.includes(interest.id) 
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

            <View style={styles.selectionInfo}>
              <ThemedText style={styles.selectionCount}>
                {selectedLookingFor.length} option{selectedLookingFor.length !== 1 ? 's' : ''} selected
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: surfaceColor }]}>
        {currentStep === 2 && (
          <TouchableOpacity
            style={[styles.backButton, { borderColor: tintColor }]}
            onPress={handlePrevStep}
          >
            <ThemedText style={[styles.backButtonText, { color: tintColor }]}>
              Back
            </ThemedText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: tintColor,
              opacity: saving ? 0.7 : 1,
              flex: currentStep === 1 ? 1 : 0.7
            }
          ]}
          onPress={currentStep === 1 ? handleNextStep : handleFinishSetup}
          disabled={saving || (currentStep === 1 && selectedInterests.length === 0) || (currentStep === 2 && selectedLookingFor.length === 0)}
        >
          <ThemedText style={styles.nextButtonText}>
            {saving 
              ? 'Saving...' 
              : currentStep === 1 
                ? 'Next' 
                : 'Complete Setup'
            }
          </ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContainer: {
    paddingBottom: 100, // Space for bottom actions
  },
  stepTitle: {
    fontSize: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  selectionInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: 14,
    opacity: 0.6,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
    elevation: 8,
  },
  backButton: {
    flex: 0.3,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});