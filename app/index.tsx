
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function RootIndex() {
  useEffect(() => {
    // Redirect to login page immediately
    router.replace('/login');
  }, []);

  return null;
}
