
import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminScreen() {
  const { texts, toggleLanguage, language, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => router.replace('/login') }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={styles.headerTitle}>
          {texts.adminDashboard || 'Admin Dashboard'}
        </ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: tintColor + '20' }]}
            onPress={toggleLanguage}
          >
            <ThemedText style={[styles.headerButtonText, { color: tintColor }]}>
              {language === 'en' ? 'العربية' : 'English'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: '#EF5350' }]}
            onPress={handleLogout}
          >
            <ThemedText style={[styles.headerButtonText, { color: '#fff' }]}>
              {texts.logout || 'Logout'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Overview */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {texts.userOverview || 'User Overview'}
          </ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <ThemedText type="defaultSemiBold" style={styles.statNumber}>156</ThemedText>
              <ThemedText style={styles.statLabel}>Total Users</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText type="defaultSemiBold" style={styles.statNumber}>89</ThemedText>
              <ThemedText style={styles.statLabel}>Active Users</ThemedText>
            </View>
          </View>
        </View>

        {/* Circle Metrics */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {texts.circleMetrics || 'Circle Metrics'}
          </ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <ThemedText type="defaultSemiBold" style={styles.statNumber}>24</ThemedText>
              <ThemedText style={styles.statLabel}>Total Circles</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText type="defaultSemiBold" style={styles.statNumber}>18</ThemedText>
              <ThemedText style={styles.statLabel}>Active Circles</ThemedText>
            </View>
          </View>
        </View>

        {/* Content Moderation */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {texts.contentModeration || 'Content Moderation'}
          </ThemedText>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              Review Posts
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              Review Events
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Reports Review */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {texts.reportsReview || 'Reports Review'}
          </ThemedText>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FFB74D' }]}>
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              View Reports (3)
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Search & Manage */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {texts.searchManage || 'Search & Manage'}
          </ThemedText>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              Manage Users
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: tintColor }]}>
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              Manage Circles
            </ThemedText>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 178, 169, 0.1)',
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 24,
    color: '#00B2A9',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
