import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle, Platform } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation Icons
  'house.fill': 'home',
  'house': 'home',
  'person.circle': 'account-circle',
  'person.circle.fill': 'account-circle',
  'bell': 'notifications',
  'bell.fill': 'notifications',
  'calendar': 'event',
  'calendar.fill': 'event',
  'message': 'chat',
  'message.fill': 'chat',
  'magnifyingglass': 'search',
  'person.3': 'group',
  'person.3.fill': 'group',

  // Action Icons
  'plus': 'add',
  'plus.circle': 'add-circle',
  'plus.circle.fill': 'add-circle',
  'paperplane.fill': 'send',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'bubble.left': 'comment',
  'bubble.left.fill': 'comment',
  'share': 'share',
  'location': 'location-on',
  'location.fill': 'location-on',
  'clock': 'schedule',
  'clock.fill': 'schedule',

  // Navigation Arrows
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.up': 'keyboard-arrow-up',
  'chevron.down': 'keyboard-arrow-down',
  'arrow.left': 'arrow-back',
  'arrow.right': 'arrow-forward',

  // Settings & Profile Icons
  'gear': 'settings',
  'gear.fill': 'settings',
  'person': 'person',
  'person.fill': 'person',
  'photo': 'photo',
  'photo.fill': 'photo',
  'camera': 'camera-alt',
  'camera.fill': 'camera-alt',
  'eye': 'visibility',
  'eye.slash': 'visibility-off',
  'lock': 'lock',
  'lock.fill': 'lock',
  'key': 'vpn-key',
  'key.fill': 'vpn-key',

  // Content Icons
  'tag': 'local-offer',
  'tag.fill': 'local-offer',
  'star': 'star-border',
  'star.fill': 'star',
  'doc': 'description',
  'doc.fill': 'description',
  'folder': 'folder',
  'folder.fill': 'folder',

  // Other Common Icons
  'ellipsis': 'more-horiz',
  'ellipsis.vertical': 'more-vert',
  'xmark': 'close',
  'checkmark': 'check',
  'checkmark.circle': 'check-circle',
  'checkmark.circle.fill': 'check-circle',
  'info': 'info',
  'info.circle': 'info',
  'exclamationmark': 'warning',
  'exclamationmark.triangle': 'warning',
  'trash': 'delete',
  'trash.fill': 'delete',
  'pencil': 'edit',
  'pencil.fill': 'edit',

  // Language & Theme
  'globe': 'language',
  'moon': 'brightness-3',
  'sun.max': 'brightness-7',
  'paintbrush': 'palette',
  'textformat': 'text-fields',

  // Admin Icons
  'shield': 'security',
  'shield.fill': 'security',
  'chart.bar': 'bar-chart',
  'chart.line.uptrend.xyaxis': 'trending-up',
  'person.badge.shield': 'admin-panel-settings',

  // Legacy mappings
  'chevron.left.forwardslash.chevron.right': 'code',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight,
}: {
  name: string;
  size?: number;
  color?: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  if (Platform.OS === 'ios') {
    // Use expo-symbols on iOS if available
    try {
      const { SymbolView } = require('expo-symbols');
      return (
        <SymbolView
          name={name}
          size={size}
          tintColor={color}
          style={style}
          weight={weight}
        />
      );
    } catch {
      // Fall back to MaterialIcons if expo-symbols is not available
    }
  }

  // Fallback to MaterialIcons for Android and web
  const mappedName = MAPPING[name as keyof typeof MAPPING];
  
  // If no mapping found, use a default icon instead of potentially showing invalid characters
  const iconName = mappedName || 'help-outline';

  return (
    <MaterialIcons
      name={iconName}
      size={size}
      color={color || '#000'}
      style={style}
      suppressHighlighting={true}
    />
  );
}