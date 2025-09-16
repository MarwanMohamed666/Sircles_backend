import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPlaces } from '@/lib/services/places';
import { getSpacesByPlace } from '@/lib/services/spaces';
import type { Place, Space } from '@/types/database';

export default function PlacesScreen() {
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [places, setPlaces] = useState<Place[]>([]);
  const [placesWithSpaces, setPlacesWithSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const placesData = await getPlaces();
      setPlaces(placesData);
      
      // Load spaces for each place
      const placesWithSpacesData = await Promise.all(
        placesData.map(async (place) => {
          const spaces = await getSpacesByPlace(place.id);
          return {
            ...place,
            spaces,
            spacesCount: spaces.length
          };
        })
      );
      
      setPlacesWithSpaces(placesWithSpacesData);
    } catch (error) {
      console.error('Error loading places:', error);
      setError('Failed to load places');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlaces();
    setRefreshing(false);
  };

  useEffect(() => {
    loadPlaces();
  }, []);

  const handlePlacePress = (place: any) => {
    // Navigate to place details or booking screen
    Alert.alert(
      place.name,
      `${place.description || 'No description'}\n\nSpaces available: ${place.spacesCount}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Spaces', 
          onPress: () => {
            // TODO: Navigate to individual place booking screen
            console.log('Navigate to place booking:', place.id);
          }
        }
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={tintColor} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Places
          </ThemedText>
        </View>
        
        <View style={styles.centeredContainer}>
          <IconSymbol name="building.2" size={64} color={textColor + '40'} />
          <ThemedText style={styles.emptyText}>
            Please log in to view and book places
          </ThemedText>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: tintColor }]}
            onPress={() => router.push('/login')}
          >
            <ThemedText style={styles.loginButtonText}>
              Login
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={tintColor} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Places
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading places...</ThemedText>
          </View>
        )}

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: surfaceColor }]}>
            <IconSymbol name="exclamationmark.triangle" size={32} color="#EF5350" />
            <ThemedText style={[styles.errorText, { color: '#EF5350' }]}>
              {error}
            </ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: tintColor }]}
              onPress={loadPlaces}
            >
              <ThemedText style={styles.retryButtonText}>
                Retry
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && placesWithSpaces.length === 0 && (
          <View style={styles.emptyContainer}>
            <IconSymbol name="building.2" size={64} color={textColor + '40'} />
            <ThemedText style={styles.emptyText}>
              No places available yet
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Check back later for available venues
            </ThemedText>
          </View>
        )}

        {!loading && !error && placesWithSpaces.length > 0 && (
          <View style={styles.placesContainer}>
            {placesWithSpaces.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={[styles.placeCard, { backgroundColor: surfaceColor }]}
                onPress={() => handlePlacePress(place)}
              >
                <View style={styles.placeHeader}>
                  <View style={styles.placeIcon}>
                    <IconSymbol name="building.2" size={32} color={tintColor} />
                  </View>
                  <View style={styles.placeInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.placeName}>
                      {place.name}
                    </ThemedText>
                    <ThemedText style={styles.placeDescription}>
                      {place.description || 'No description'}
                    </ThemedText>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={textColor + '60'} />
                </View>
                
                <View style={styles.placeDetails}>
                  <View style={styles.detailItem}>
                    <IconSymbol name="door.left.hand.open" size={16} color={textColor + '80'} />
                    <ThemedText style={styles.detailText}>
                      {place.spacesCount} {place.spacesCount === 1 ? 'space' : 'spaces'}
                    </ThemedText>
                  </View>
                  
                  {place.capacity && (
                    <View style={styles.detailItem}>
                      <IconSymbol name="person.2" size={16} color={textColor + '80'} />
                      <ThemedText style={styles.detailText}>
                        Up to {place.capacity} people
                      </ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.detailItem}>
                    <IconSymbol name="clock" size={16} color={textColor + '80'} />
                    <ThemedText style={styles.detailText}>
                      {place.timezone || 'UTC'}
                    </ThemedText>
                  </View>
                </View>

                {place.location && (
                  <View style={styles.locationContainer}>
                    <IconSymbol name="location" size={16} color={textColor + '80'} />
                    <ThemedText style={styles.locationText}>
                      {place.location.address || place.location.city || 'Location available'}
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Balance the back button
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    margin: 16,
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  placesContainer: {
    gap: 16,
  },
  placeCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 18,
    marginBottom: 4,
  },
  placeDescription: {
    opacity: 0.7,
    fontSize: 14,
  },
  placeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    opacity: 0.8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  locationText: {
    fontSize: 14,
    opacity: 0.8,
  },
});