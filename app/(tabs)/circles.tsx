
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';

interface Circle {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastActivity: string;
  isAdmin: boolean;
  unreadMessages: number;
}

export default function MyCirclesScreen() {
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [myCircles] = useState<Circle[]>([
    {
      id: '1',
      name: 'Tech Enthusiasts',
      description: 'A community for technology lovers to share ideas and collaborate on projects.',
      memberCount: 24,
      lastActivity: '2 hours ago',
      isAdmin: false,
      unreadMessages: 3,
    },
    {
      id: '2',
      name: 'Book Club',
      description: 'Monthly book discussions and literary conversations.',
      memberCount: 18,
      lastActivity: '1 day ago',
      isAdmin: true,
      unreadMessages: 0,
    },
    {
      id: '3',
      name: 'Photography Club',
      description: 'Capture and share the beauty around us through photography.',
      memberCount: 31,
      lastActivity: '3 hours ago',
      isAdmin: false,
      unreadMessages: 7,
    },
  ]);

  const handleCirclePress = (circleId: string) => {
    router.push(`/circle/${circleId}`);
  };

  const handleChatPress = (circleId: string) => {
    router.push('/(tabs)/messages');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {texts.myCircles || 'My Circles'}
        </ThemedText>
      </View>

      {/* Circles List */}
      <ScrollView style={styles.circlesList} showsVerticalScrollIndicator={false}>
        {myCircles.map((circle) => (
          <TouchableOpacity
            key={circle.id}
            style={[styles.circleCard, { backgroundColor: surfaceColor }]}
            onPress={() => handleCirclePress(circle.id)}
          >
            <View style={[styles.circleHeader, isRTL && styles.circleHeaderRTL]}>
              <View style={styles.circleInfo}>
                <View style={styles.circleNameRow}>
                  <ThemedText type="defaultSemiBold" style={[styles.circleName, isRTL && styles.rtlText]}>
                    {circle.name}
                  </ThemedText>
                  {circle.isAdmin && (
                    <View style={[styles.adminBadge, { backgroundColor: tintColor }]}>
                      <ThemedText style={styles.adminBadgeText}>
                        {texts.admin || 'Admin'}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={[styles.circleDescription, isRTL && styles.rtlText]} numberOfLines={2}>
                  {circle.description}
                </ThemedText>
                <View style={[styles.circleStats, isRTL && styles.circleStatsRTL]}>
                  <ThemedText style={styles.memberCount}>
                    {circle.memberCount} {texts.members || 'members'}
                  </ThemedText>
                  <ThemedText style={styles.lastActivity}>
                    {texts.lastActivity || 'Last activity'}: {circle.lastActivity}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.circleActions}>
                <TouchableOpacity
                  style={[styles.chatButton, { backgroundColor: tintColor }]}
                  onPress={() => handleChatPress(circle.id)}
                >
                  <IconSymbol name="message" size={20} color="#fff" />
                  {circle.unreadMessages > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: '#EF5350' }]}>
                      <ThemedText style={styles.unreadBadgeText}>
                        {circle.unreadMessages}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {myCircles.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="person.3" size={48} color={textColor + '40'} />
            <ThemedText style={[styles.emptyStateText, isRTL && styles.rtlText]}>
              {texts.noCirclesJoined || 'No circles joined yet'}
            </ThemedText>
            <ThemedText style={[styles.emptyStateSubtext, isRTL && styles.rtlText]}>
              {texts.exploreCirclesToJoin || 'Explore circles to join your first community'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.exploreButton, { backgroundColor: tintColor }]}
              onPress={() => router.push('/explore')}
            >
              <ThemedText style={[styles.exploreButtonText, { color: '#fff' }]}>
                {texts.exploreCircles || 'Explore Circles'}
              </ThemedText>
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
  },
  circlesList: {
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
  },
  circleHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  circleInfo: {
    flex: 1,
    marginRight: 12,
  },
  circleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  circleName: {
    fontSize: 16,
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  circleDescription: {
    marginBottom: 8,
    lineHeight: 18,
    opacity: 0.8,
  },
  circleStats: {
    flexDirection: 'row',
    gap: 16,
  },
  circleStatsRTL: {
    flexDirection: 'row-reverse',
  },
  memberCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  lastActivity: {
    fontSize: 12,
    opacity: 0.7,
  },
  circleActions: {
    alignItems: 'center',
    gap: 8,
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
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
    marginBottom: 24,
  },
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontWeight: '600',
  },
  rtlText: {
    textAlign: 'right',
  },
});
