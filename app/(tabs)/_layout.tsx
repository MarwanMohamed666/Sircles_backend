import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { texts, isRTL } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          direction: isRTL ? 'rtl' : 'ltr',
        },
      }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: texts.profile,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? "person.circle.fill" : "person.circle"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: texts.notifications,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? "bell.fill" : "bell"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: texts.home,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? "house.fill" : "house"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: texts.events,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? "calendar.fill" : "calendar"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: texts.messages,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? "message.fill" : "message"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          title: 'My Circles',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'person.3.fill' : 'person.3'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}