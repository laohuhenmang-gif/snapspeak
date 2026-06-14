import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../services/theme-context';
import type { Priority } from '../types';

const map: Record<Priority, string> = { '高': '!!', '中': '!', '低': '-' };

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const { theme } = useTheme();
  const color =
    priority === '高' ? theme.priorityHigh
    : priority === '中' ? theme.priorityMedium
    : theme.priorityLow;

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{map[priority]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  text: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '900',
  },
});
