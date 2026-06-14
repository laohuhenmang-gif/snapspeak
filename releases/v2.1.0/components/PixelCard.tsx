import { View, StyleSheet, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../services/theme-context';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  noBorder?: boolean;
}

export default function PixelCard({ children, style, noBorder }: Props) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          shadowColor: '#000',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
