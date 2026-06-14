import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../services/theme-context';

interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onRetry, onDismiss }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.error + '15' }]}>
      <Text style={[styles.text, { color: theme.error }]}>{message}</Text>
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={[styles.btn, { backgroundColor: theme.error }]}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>重试</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.btn}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>忽略</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 10, padding: 10, marginBottom: 8 },
  text: { fontSize: 12, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
});
