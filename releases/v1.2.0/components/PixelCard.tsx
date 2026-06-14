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
          borderColor: noBorder ? 'transparent' : theme.pixelBorder,
          shadowColor: theme.pixelShadow,
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
    borderWidth: 2,
    borderRadius: 0,
    padding: 12,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
});
