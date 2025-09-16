
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Circle } from '@/lib/circlePrefs';
import { AppTexts } from '@/constants/AppTexts';

interface CircleCardProps {
  circle: Circle;
  onJoin: (circleId: string) => void;
  onDismiss: (circle: Circle) => void;
  onSnooze: (circle: Circle, days?: number) => void;
}

export function CircleCard({ circle, onJoin, onDismiss, onSnooze }: CircleCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const handleMenuAction = (action: 'dismiss' | 'snooze') => {
    setShowMenu(false);
    
    if (action === 'dismiss') {
      Alert.alert(
        AppTexts.en.notInterested || 'Not Interested',
        AppTexts.en.dismissCircleConfirm || `Remove "${circle.name}" from suggestions?`,
        [
          { text: AppTexts.en.cancel || 'Cancel', style: 'cancel' },
          { 
            text: AppTexts.en.remove || 'Remove', 
            style: 'destructive',
            onPress: () => onDismiss(circle)
          }
        ]
      );
    } else if (action === 'snooze') {
      Alert.alert(
        AppTexts.en.snoozeCircle || 'Snooze Circle',
        AppTexts.en.snoozeCircleConfirm || `Hide "${circle.name}" for 30 days?`,
        [
          { text: AppTexts.en.cancel || 'Cancel', style: 'cancel' },
          { 
            text: AppTexts.en.snooze || 'Snooze', 
            onPress: () => onSnooze(circle, 30)
          }
        ]
      );
    }
  };

  return (
    <ThemedView style={[styles.card, { backgroundColor: surfaceColor }]}>
      <View style={styles.header}>
        <View style={styles.circleInfo}>
          <View style={styles.imageContainer}>
            {circle.circle_profile_url ? (
              <Image 
                source={{ uri: circle.circle_profile_url }} 
                style={styles.circleImage}
                defaultSource={{ uri: 'https://via.placeholder.com/60' }}
              />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: tintColor + '20' }]}>
                <IconSymbol name="person.3" size={24} color={tintColor} />
              </View>
            )}
          </View>
          
          <View style={styles.details}>
            <ThemedText numberOfLines={2} style={styles.circleName}>
              {circle.name}
            </ThemedText>
            {circle.score > 0 && (
              <ThemedText style={[styles.matchText, { color: tintColor }]}>
                {circle.score} interest match{circle.score > 1 ? 'es' : ''}
              </ThemedText>
            )}
            {circle.description && (
              <ThemedText numberOfLines={2} style={styles.description}>
                {circle.description}
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <IconSymbol name="ellipsis.horizontal" size={20} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Overlay */}
      {showMenu && (
        <View style={[styles.menuOverlay, { backgroundColor: backgroundColor }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction('dismiss')}
          >
            <IconSymbol name="hand.thumbsdown" size={16} color="#EF5350" />
            <ThemedText style={[styles.menuItemText, { color: '#EF5350' }]}>
              {AppTexts.en.notInterested || 'Not Interested'}
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction('snooze')}
          >
            <IconSymbol name="clock" size={16} color={textColor} />
            <ThemedText style={styles.menuItemText}>
              {AppTexts.en.snooze30Days || 'Snooze 30 days'}
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowMenu(false)}
          >
            <IconSymbol name="xmark" size={16} color={textColor} />
            <ThemedText style={styles.menuItemText}>
              {AppTexts.en.cancel || 'Cancel'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Join Button */}
      <TouchableOpacity
        style={[styles.joinButton, { backgroundColor: tintColor }]}
        onPress={() => onJoin(circle.id)}
      >
        <ThemedText style={styles.joinButtonText}>
          {AppTexts.en.joinCircle || 'Join'}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  circleInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  imageContainer: {
    marginBottom: 8,
  },
  circleImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    alignItems: 'center',
    minHeight: 60,
  },
  circleName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    opacity: 0.7,
    textAlign: 'center',
  },
  actions: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  menuButton: {
    padding: 4,
  },
  menuOverlay: {
    position: 'absolute',
    top: 28,
    right: 0,
    minWidth: 160,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
