import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Switch, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SettingsScreen() {
  const { texts, language, toggleLanguage, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');
  const colorScheme = useColorScheme();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Theme settings
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  // Notification settings
  const [notifications, setNotifications] = useState({
    messages: true,
    events: true,
    circleUpdates: true,
    communityPosts: false,
  });

  const handlePasswordChange = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      Alert.alert(texts.error || 'Error', texts.fillAllFields || 'Please fill in all fields.');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      Alert.alert(texts.error || 'Error', texts.passwordMismatch || 'New passwords do not match.');
      return;
    }

    if (passwordData.new.length < 6) {
      Alert.alert(texts.error || 'Error', 'Password must be at least 6 characters long.');
      return;
    }

    // Here you would typically validate the current password and update it
    Alert.alert(texts.success || 'Success', texts.passwordChanged || 'Password changed successfully!');
    setShowPasswordModal(false);
    setPasswordData({ current: '', new: '', confirm: '' });
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // Here you would implement theme switching logic
    Alert.alert('Theme', `Switched to ${!isDarkMode ? 'Dark' : 'Light'} mode`);
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol 
            name={isRTL ? "chevron.right" : "chevron.left"} 
            size={24} 
            color={textColor} 
          />
        </TouchableOpacity>
        <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {texts.settings || 'Settings'}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Password Settings */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="lock" size={20} color={tintColor} />
            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {texts.passwordSettings || 'Password Settings'}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.settingItem, isRTL && styles.settingItemRTL]}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol name="key.fill" size={20} color={tintColor} />
              <ThemedText style={[styles.settingLabel, isRTL && styles.rtlText]}>
                {texts.changePassword || 'Change Password'}
              </ThemedText>
            </View>
            <IconSymbol name={isRTL ? "chevron.left" : "chevron.right"} size={16} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Theme Settings */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name={isDarkMode ? "moon.fill" : "sun.max.fill"} size={20} color={tintColor} />
            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {texts.themeSettings || 'Theme Settings'}
            </ThemedText>
          </View>

          <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol name={isDarkMode ? "moon.fill" : "sun.max.fill"} size={20} color={tintColor} />
              <View>
                <ThemedText style={[styles.settingLabel, isRTL && styles.rtlText]}>
                  {texts.darkMode || 'Dark Mode'}
                </ThemedText>
                <ThemedText style={[styles.settingDescription, isRTL && styles.rtlText]}>
                  {isDarkMode ? 'Dark theme enabled' : 'Light theme enabled'}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: tintColor }}
              thumbColor={isDarkMode ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Language Settings */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="globe" size={20} color={tintColor} />
            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {texts.languageSettings || 'Language Settings'}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.settingItem, isRTL && styles.settingItemRTL]}
            onPress={toggleLanguage}
          >
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol name="globe" size={20} color={tintColor} />
              <View>
                <ThemedText style={[styles.settingLabel, isRTL && styles.rtlText]}>
                  {texts.language || 'Language'}
                </ThemedText>
                <ThemedText style={[styles.settingDescription, isRTL && styles.rtlText]}>
                  {language === 'en' ? 'English' : 'العربية'}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.languageToggle, { backgroundColor: tintColor }]}>
              <ThemedText style={styles.languageToggleText}>
                {language === 'en' ? 'ع' : 'EN'}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="bell" size={20} color={tintColor} />
            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {texts.notificationSettings || 'Notification Settings'}
            </ThemedText>
          </View>

          <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol name="message.fill" size={20} color={tintColor} />
              <View>
                <ThemedText style={[styles.settingLabel, isRTL && styles.rtlText]}>
                  {texts.messageNotifications || 'Message Notifications'}
                </ThemedText>
                <ThemedText style={[styles.settingDescription, isRTL && styles.rtlText]}>
                  Get notified about new messages
                </ThemedText>
              </View>
            </View>
            <Switch
              value={notifications.messages}
              onValueChange={() => toggleNotification('messages')}
              trackColor={{ false: '#767577', true: tintColor }}
              thumbColor={notifications.messages ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol name="calendar" size={20} color={tintColor} />
              <View>
                <ThemedText style={[styles.settingLabel, isRTL && styles.rtlText]}>
                  {texts.eventNotifications || 'Event Notifications'}
                </ThemedText>
                <ThemedText style={[styles.settingDescription, isRTL && styles.rtlText]}>
                  Get notified about upcoming events
                </ThemedText>
              </View>
            </View>
            <Switch
              value={notifications.events}
              onValueChange={() => toggleNotification('events')}
              trackColor={{ false: '#767577', true: tintColor }}
              thumbColor={notifications.events ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol name="person.3.fill" size={20} color={tintColor} />
              <View>
                <ThemedText style={[styles.settingLabel, isRTL && styles.rtlText]}>
                  {texts.circleUpdates || 'Circle Updates'}
                </ThemedText>
                <ThemedText style={[styles.settingDescription, isRTL && styles.rtlText]}>
                  Get notified about circle activities
                </ThemedText>
              </View>
            </View>
            <Switch
              value={notifications.circleUpdates}
              onValueChange={() => toggleNotification('circleUpdates')}
              trackColor={{ false: '#767577', true: tintColor }}
              thumbColor={notifications.circleUpdates ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
            <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
              <IconSymbol name="megaphone.fill" size={20} color={tintColor} />
              <View>
                <ThemedText style={[styles.settingLabel, isRTL && styles.rtlText]}>
                  {texts.communityPosts || 'Community Posts'}
                </ThemedText>
                <ThemedText style={[styles.settingDescription, isRTL && styles.rtlText]}>
                  Get notified about admin posts
                </ThemedText>
              </View>
            </View>
            <Switch
              value={notifications.communityPosts}
              onValueChange={() => toggleNotification('communityPosts')}
              trackColor={{ false: '#767577', true: tintColor }}
              thumbColor={notifications.communityPosts ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <ThemedText type="subtitle" style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {texts.changePassword || 'Change Password'}
            </ThemedText>

            <View style={styles.formField}>
              <ThemedText style={[styles.fieldLabel, isRTL && styles.rtlText]}>
                {texts.currentPassword || 'Current Password'}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                ]}
                placeholder={texts.enterCurrentPassword || 'Enter current password'}
                placeholderTextColor={textColor + '80'}
                secureTextEntry
                value={passwordData.current}
                onChangeText={(text) => setPasswordData({ ...passwordData, current: text })}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText style={[styles.fieldLabel, isRTL && styles.rtlText]}>
                {texts.newPassword || 'New Password'}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                ]}
                placeholder={texts.enterNewPassword || 'Enter new password'}
                placeholderTextColor={textColor + '80'}
                secureTextEntry
                value={passwordData.new}
                onChangeText={(text) => setPasswordData({ ...passwordData, new: text })}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText style={[styles.fieldLabel, isRTL && styles.rtlText]}>
                {texts.confirmPassword || 'Confirm Password'}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
                ]}
                placeholder={texts.confirmNewPassword || 'Confirm new password'}
                placeholderTextColor={textColor + '80'}
                secureTextEntry
                value={passwordData.confirm}
                onChangeText={(text) => setPasswordData({ ...passwordData, confirm: text })}
              />
            </View>

            <View style={[styles.modalActions, isRTL && styles.modalActionsRTL]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <ThemedText>{texts.cancel || 'Cancel'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handlePasswordChange}
              >
                <ThemedText style={{ color: '#fff' }}>
                  {texts.change || 'Change'}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingItemRTL: {
    flexDirection: 'row-reverse',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingInfoRTL: {
    flexDirection: 'row-reverse',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  languageToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionsRTL: {
    flexDirection: 'row-reverse',
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