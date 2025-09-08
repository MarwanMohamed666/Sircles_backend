
import { create } from 'zustand';
import { Alert } from 'react-native';
import { Circle, fetchSuggestedCircles, dismissCircle, snoozeCircle, undoPreference } from '@/lib/circlePrefs';

interface CirclesStore {
  suggested: Circle[];
  loading: boolean;
  error?: string;
  lastAction?: {
    type: 'dismiss' | 'snooze';
    circleId: string;
    circleName: string;
    circle: Circle;
  };
  
  // Actions
  loadSuggested: () => Promise<void>;
  dismiss: (circle: Circle, reason?: string) => Promise<void>;
  snooze: (circle: Circle, days?: number) => Promise<void>;
  undo: (circleId: string) => Promise<void>;
  clearError: () => void;
}

export const useCirclesStore = create<CirclesStore>((set, get) => ({
  suggested: [],
  loading: false,
  error: undefined,
  lastAction: undefined,

  loadSuggested: async () => {
    set({ loading: true, error: undefined });
    
    try {
      const circles = await fetchSuggestedCircles();
      set({ suggested: circles, loading: false });
    } catch (error) {
      console.error('Error loading suggested circles:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load suggestions',
        loading: false 
      });
    }
  },

  dismiss: async (circle: Circle, reason = 'dismissed') => {
    const state = get();
    const originalSuggested = state.suggested;

    // Optimistic update
    set({
      suggested: state.suggested.filter(c => c.id !== circle.id),
      lastAction: { type: 'dismiss', circleId: circle.id, circleName: circle.name, circle }
    });

    try {
      await dismissCircle(circle.id, reason);
      
      // Show undo toast
      Alert.alert(
        'Circle Dismissed',
        `"${circle.name}" has been removed from suggestions`,
        [
          {
            text: 'Undo',
            onPress: () => get().undo(circle.id),
            style: 'cancel'
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error dismissing circle:', error);
      
      // Revert optimistic update
      set({ 
        suggested: originalSuggested,
        error: error instanceof Error ? error.message : 'Failed to dismiss circle'
      });
      
      Alert.alert('Error', 'Failed to dismiss circle. Please try again.');
    }
  },

  snooze: async (circle: Circle, days = 30) => {
    const state = get();
    const originalSuggested = state.suggested;

    // Optimistic update
    set({
      suggested: state.suggested.filter(c => c.id !== circle.id),
      lastAction: { type: 'snooze', circleId: circle.id, circleName: circle.name, circle }
    });

    try {
      await snoozeCircle(circle.id, days);
      
      // Show undo toast
      Alert.alert(
        'Circle Snoozed',
        `"${circle.name}" will be hidden for ${days} days`,
        [
          {
            text: 'Undo',
            onPress: () => get().undo(circle.id),
            style: 'cancel'
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error snoozing circle:', error);
      
      // Revert optimistic update
      set({ 
        suggested: originalSuggested,
        error: error instanceof Error ? error.message : 'Failed to snooze circle'
      });
      
      Alert.alert('Error', 'Failed to snooze circle. Please try again.');
    }
  },

  undo: async (circleId: string) => {
    try {
      await undoPreference(circleId);
      
      // Refresh suggestions to show the circle again
      await get().loadSuggested();
      
      Alert.alert('Undone', 'Circle preference has been undone');
    } catch (error) {
      console.error('Error undoing preference:', error);
      Alert.alert('Error', 'Failed to undo preference. Please try again.');
    }
  },

  clearError: () => set({ error: undefined }),
}));
