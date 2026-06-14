import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../services/theme-context';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
}

export default function PixelButton({ title, onPress, variant = 'primary', style, disabled }: Props) {
  const { theme } = useTheme();
  const colors = {
    primary: { bg: theme.primary, text: '#fff' },
    secondary: { bg: theme.surfaceAlt, text: theme.text },
    danger: { bg: theme.error, text: '#fff' },
  };
  const c = colors[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        {
          backgroundColor: c.bg,
          borderColor: theme.pixelBorder,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: c.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
  },
});
