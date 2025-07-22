
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Redirect to login page
  return <Redirect href="/login" />;
}
