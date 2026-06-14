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
    <View style={[styles.container, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
      <Text style={[styles.text, { color: theme.error }]}>{message}</Text>
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={[styles.btn, { borderColor: theme.error }]}>
            <Text style={{ color: theme.error, fontFamily: 'monospace', fontWeight: '700', fontSize: 11 }}>[重试]</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={[styles.btn, { borderColor: theme.textMuted }]}>
            <Text style={{ color: theme.textMuted, fontFamily: 'monospace', fontSize: 11 }}>[忽略]</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 2, padding: 10, marginBottom: 8 },
  text: { fontFamily: 'monospace', fontSize: 12, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 6 },
  btn: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
});
