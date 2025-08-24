
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/lib/database';

interface Interest {
  id: string;
  title: string;
  category: string;
}

export default function FirstTimeSetupScreen() {
  const { user } = useAuth();
  const [availableInterests, setAvailableInterests] = useState<{ [key: string]: Interest[] }>({});
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedLookFor, setSelectedLookFor] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 = interests, 2 = looking for

  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getInterestsByCategory();
      
      if (error) {
        console.error('Error fetching interests:', error);
        Alert.alert('Error', 'Failed to load interests');
        return;
      }

      setAvailableInterests(data || {});
    } catch (error) {
      console.error('Error in fetchInterests:', error);
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
  };

  const toggleLookFor = (interestId: string) => {
    setSelectedLookFor(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (selectedInterests.length === 0) {
        Alert.alert('Please select at least one interest');
        return;
      }
      setCurrentStep(2);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      // Save interests
      if (selectedInterests.length > 0) {
        const interestPromises = selectedInterests.map(interestId =>
          supabase
            .from('user_interests')
            .insert({
              userid: user.id,
              interestid: interestId
            })
        );
        await Promise.all(interestPromises);
      }

      // Save looking for
      if (selectedLookFor.length > 0) {
        const lookForPromises = selectedLookFor.map(interestId =>
          supabase
            .from('user_look_for')
            .insert({
              userid: user.id,
              interestid: interestId
            })
        );
        await Promise.all(lookForPromises);
      }

      // Update first_login to false
      await DatabaseService.updateFirstLogin(user.id);

      Alert.alert('Welcome!', 'Your preferences have been saved successfully!', [
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else {
      handleFinish();
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.logoText, { color: '#fff' }]}>S</ThemedText>
          </View>
          
          <ThemedText type="title" style={styles.title}>
            {currentStep === 1 ? 'What are your interests?' : 'What are you looking for?'}
          </ThemedText>
          
          <ThemedText type="subtitle" style={styles.subtitle}>
            {currentStep === 1 
              ? 'Select topics that interest you to personalize your experience'
              : 'Select what you\'re looking for in circles and events'
            }
          </ThemedText>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, { backgroundColor: tintColor }]} />
            <View style={[styles.stepDot, { backgroundColor: currentStep === 2 ? tintColor : surfaceColor }]} />
          </View>
        </View>

        <View style={[styles.content, { backgroundColor: surfaceColor }]}>
          {Object.entries(availableInterests).map(([category, interests]) => (
            <View key={category} style={styles.categorySection}>
              <ThemedText style={styles.categoryTitle}>{category}</ThemedText>
              <View style={styles.interestsGrid}>
                {interests.map((interest) => {
                  const isSelected = currentStep === 1 
                    ? selectedInterests.includes(interest.id)
                    : selectedLookFor.includes(interest.id);
                  
                  return (
                    <TouchableOpacity
                      key={interest.id}
                      style={[
                        styles.interestChip,
                        {
                          backgroundColor: isSelected ? tintColor : backgroundColor,
                          borderColor: tintColor,
                        }
                      ]}
                      onPress={() => currentStep === 1 ? toggleInterest(interest.id) : toggleLookFor(interest.id)}
                    >
                      <ThemedText style={[
                        styles.interestChipText,
                        { color: isSelected ? '#fff' : textColor }
                      ]}>
                        {interest.title}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={[styles.skipButton]}
          onPress={handleSkip}
          disabled={saving}
        >
          <ThemedText style={[styles.skipButtonText, { color: textColor }]}>
            Skip
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.continueButton,
            { 
              backgroundColor: tintColor,
              opacity: saving ? 0.7 : 1
            }
          ]}
          onPress={handleContinue}
          disabled={saving}
        >
          <ThemedText style={[styles.continueButtonText, { color: '#fff' }]}>
            {saving ? 'Saving...' : currentStep === 1 ? 'Continue' : 'Finish'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    marginBottom: 100,
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
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
