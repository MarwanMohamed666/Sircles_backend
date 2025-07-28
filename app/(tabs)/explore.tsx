
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { DatabaseService } from '@/lib/database';

interface Circle {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'invite-only';
  agePreference: { min: number; max: number };
  genderPreference: 'Male' | 'Female' | 'Any';
  memberCount: number;
  tags: string[];
  isJoined: boolean;
}

interface SearchFilters {
  interestTag: string;
  ageRange: string;
  gender: string;
}

export default function ExploreScreen() {
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    interestTag: '',
    ageRange: '',
    gender: '',
  });

  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCircles();
  }, []);

  const fetchCircles = async () => {
    setLoading(true);
    try {
      const { data, error } = await DatabaseService.getCircles();
      if (error) {
        console.error('Error fetching circles:', error);
      } else if (data) {
        // Transform data to match our interface
        const transformedCircles = data.map((circle: any) => ({
          ...circle,
          privacy: circle.privacy || 'public',
          agePreference: { min: 18, max: 65 }, // Default values since not in DB
          genderPreference: 'Any', // Default value since not in DB
          memberCount: Math.floor(Math.random() * 50) + 1, // Mock data for now
          tags: ['General'], // Mock data for now
          isJoined: false, // You can implement this based on user_circles table
        }));
        setCircles(transformedCircles);
      }
    } catch (error) {
      console.error('Error fetching circles:', error);
    } finally {
      setLoading(false);
    }
  };

  const interestTags = ['Technology', 'Programming', 'Reading', 'Photography', 'Fitness', 'Arts', 'Sports', 'Health'];
  const ageRanges = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];
  const genderOptions = ['Any', 'Male', 'Female'];

  const filteredCircles = circles.filter(circle => {
    const matchesSearch = circle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         circle.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesInterest = !filters.interestTag || 
                           circle.tags.some(tag => tag.toLowerCase().includes(filters.interestTag.toLowerCase()));
    
    const matchesGender = !filters.gender || filters.gender === 'Any' || 
                         circle.genderPreference === 'Any' || circle.genderPreference === filters.gender;
    
    // Age range matching would require user's age context
    const matchesAge = !filters.ageRange; // Simplified for now
    
    return matchesSearch && matchesInterest && matchesGender && matchesAge;
  });

  const handleCirclePress = (circleId: string) => {
    router.push(`/circle/${circleId}`);
  };

  const clearFilters = () => {
    setFilters({
      interestTag: '',
      ageRange: '',
      gender: '',
    });
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {texts.searchCircles || 'Search Circles'}
        </ThemedText>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchSection, { backgroundColor: surfaceColor }]}>
        <View style={[styles.searchBar, { backgroundColor }]}>
          <IconSymbol name="magnifyingglass" size={20} color={textColor} />
          <TextInput
            style={[
              styles.searchInput,
              { color: textColor, textAlign: isRTL ? 'right' : 'left' }
            ]}
            placeholder={texts.searchCircles || 'Search circles...'}
            placeholderTextColor={textColor + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: tintColor }]}
          onPress={() => setShowFilters(true)}
        >
          <IconSymbol name="slider.horizontal.3" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(filters.interestTag || filters.ageRange || filters.gender) && (
        <View style={[styles.activeFilters, { backgroundColor: surfaceColor }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.interestTag && (
              <View style={[styles.filterChip, { backgroundColor: tintColor + '20' }]}>
                <ThemedText style={[styles.filterChipText, { color: tintColor }]}>
                  {filters.interestTag}
                </ThemedText>
                <TouchableOpacity onPress={() => setFilters({...filters, interestTag: ''})}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={tintColor} />
                </TouchableOpacity>
              </View>
            )}
            {filters.ageRange && (
              <View style={[styles.filterChip, { backgroundColor: tintColor + '20' }]}>
                <ThemedText style={[styles.filterChipText, { color: tintColor }]}>
                  {filters.ageRange}
                </ThemedText>
                <TouchableOpacity onPress={() => setFilters({...filters, ageRange: ''})}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={tintColor} />
                </TouchableOpacity>
              </View>
            )}
            {filters.gender && filters.gender !== 'Any' && (
              <View style={[styles.filterChip, { backgroundColor: tintColor + '20' }]}>
                <ThemedText style={[styles.filterChipText, { color: tintColor }]}>
                  {filters.gender}
                </ThemedText>
                <TouchableOpacity onPress={() => setFilters({...filters, gender: ''})}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={tintColor} />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={[styles.clearFiltersButton, { backgroundColor: accentColor }]}
              onPress={clearFilters}
            >
              <ThemedText style={[styles.clearFiltersText, { color: '#fff' }]}>
                {texts.clearAll || 'Clear All'}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Search Results */}
      <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
        {filteredCircles.map((circle) => (
          <TouchableOpacity
            key={circle.id}
            style={[styles.circleCard, { backgroundColor: surfaceColor }]}
            onPress={() => handleCirclePress(circle.id)}
          >
            <View style={[styles.circleHeader, isRTL && styles.circleHeaderRTL]}>
              <View style={styles.circleInfo}>
                <ThemedText type="defaultSemiBold" style={[styles.circleName, isRTL && styles.rtlText]}>
                  {circle.name}
                </ThemedText>
                <View style={styles.circleStats}>
                  <ThemedText style={styles.memberCount}>
                    {circle.memberCount} {texts.members || 'members'}
                  </ThemedText>
                  <View style={[styles.privacyBadge, { 
                    backgroundColor: circle.privacy === 'public' ? '#66BB6A' + '20' : '#FFB74D' + '20' 
                  }]}>
                    <ThemedText style={[styles.privacyText, { 
                      color: circle.privacy === 'public' ? '#66BB6A' : '#FFB74D' 
                    }]}>
                      {circle.privacy === 'public' ? texts.public || 'Public' : texts.inviteOnly || 'Invite Only'}
                    </ThemedText>
                  </View>
                </View>
              </View>
              {circle.isJoined && (
                <View style={[styles.joinedBadge, { backgroundColor: tintColor }]}>
                  <IconSymbol name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </View>
            
            <ThemedText style={[styles.circleDescription, isRTL && styles.rtlText]}>
              {circle.description}
            </ThemedText>
            
            <View style={styles.circleTags}>
              {circle.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: tintColor + '15' }]}>
                  <ThemedText style={[styles.tagText, { color: tintColor }]}>
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
            
            <View style={[styles.circlePreferences, isRTL && styles.circlePreferencesRTL]}>
              <ThemedText style={styles.preferenceText}>
                {texts.age || 'Age'}: {circle.agePreference.min}-{circle.agePreference.max}
              </ThemedText>
              <ThemedText style={styles.preferenceText}>
                {texts.gender || 'Gender'}: {circle.genderPreference}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}

        {filteredCircles.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="magnifyingglass" size={48} color={textColor + '40'} />
            <ThemedText style={[styles.emptyStateText, isRTL && styles.rtlText]}>
              {texts.noCirclesFound || 'No circles found'}
            </ThemedText>
            <ThemedText style={[styles.emptyStateSubtext, isRTL && styles.rtlText]}>
              {texts.tryDifferentSearch || 'Try adjusting your search or filters'}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {texts.filters || 'Filters'}
            </ThemedText>

            {/* Interest Tag Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterLabel}>
                {texts.interestTag || 'Interest Tag'}
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {interestTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.filterOption,
                        {
                          backgroundColor: filters.interestTag === tag ? tintColor : backgroundColor,
                          borderColor: tintColor,
                        }
                      ]}
                      onPress={() => setFilters({...filters, interestTag: filters.interestTag === tag ? '' : tag})}
                    >
                      <ThemedText style={[
                        styles.filterOptionText,
                        { color: filters.interestTag === tag ? '#fff' : textColor }
                      ]}>
                        {tag}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Age Range Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterLabel}>
                {texts.ageRange || 'Age Range'}
              </ThemedText>
              <View style={styles.filterOptions}>
                {ageRanges.map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor: filters.ageRange === range ? tintColor : backgroundColor,
                        borderColor: tintColor,
                      }
                    ]}
                    onPress={() => setFilters({...filters, ageRange: filters.ageRange === range ? '' : range})}
                  >
                    <ThemedText style={[
                      styles.filterOptionText,
                      { color: filters.ageRange === range ? '#fff' : textColor }
                    ]}>
                      {range}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Gender Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterLabel}>
                {texts.gender || 'Gender'}
              </ThemedText>
              <View style={styles.filterOptions}>
                {genderOptions.map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor: filters.gender === gender ? tintColor : backgroundColor,
                        borderColor: tintColor,
                      }
                    ]}
                    onPress={() => setFilters({...filters, gender: filters.gender === gender ? '' : gender})}
                  >
                    <ThemedText style={[
                      styles.filterOptionText,
                      { color: filters.gender === gender ? '#fff' : textColor }
                    ]}>
                      {gender}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor }]}
                onPress={() => setShowFilters(false)}
              >
                <ThemedText>{texts.cancel || 'Cancel'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={applyFilters}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {texts.applyFilters || 'Apply Filters'}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilters: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchResults: {
    flex: 1,
    padding: 16,
  },
  circleCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 1,
  },
  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  circleHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    fontSize: 16,
    marginBottom: 4,
  },
  circleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  privacyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  privacyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  joinedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDescription: {
    marginBottom: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
  circleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  circlePreferences: {
    flexDirection: 'row',
    gap: 16,
  },
  circlePreferencesRTL: {
    flexDirection: 'row-reverse',
  },
  preferenceText: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
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
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 12,
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
});
