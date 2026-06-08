import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task, Category } from '../types';
import { useTheme } from '../services/theme-context';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../constants';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onTap?: (task: Task) => void;
}

export default function TaskCard({ task, onToggle, onTap }: TaskCardProps) {
  const { theme } = useTheme();

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${mins}`;
  };

  const priorityColor = task.priority === '高' ? '#FF4757' : task.priority === '中' ? '#FFA502' : '#2ED573';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card }]}
      onPress={() => onTap?.(task)}
      activeOpacity={0.7}
    >
      <TouchableOpacity style={styles.checkArea} onPress={() => onToggle(task.id)}>
        <View style={[styles.checkbox, { borderColor: theme.textMuted }]}>
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{task.title}</Text>
        <Text style={[styles.datetime, { color: theme.textMuted }]}>{formatDateTime(task.datetime)}</Text>
        <View style={styles.tags}>
          <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[task.category as Category] || theme.primary }]}>
            <Text style={styles.badgeText}>{task.category}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>{task.priority}</Text>
          </View>
          {task.needs_precheck && (
            <View style={[styles.badge, { backgroundColor: '#FF6B81' }]}>
              <Text style={styles.badgeText}>需前置准备</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 3,
    borderRadius: 16,
  },
  checkArea: { justifyContent: 'center', marginRight: 14 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  checkmark: { fontSize: 12, fontWeight: '700', color: '#2ED573' },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  datetime: { fontSize: 12, marginBottom: 6 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  priorityText: { fontSize: 11, fontWeight: '600' },
});