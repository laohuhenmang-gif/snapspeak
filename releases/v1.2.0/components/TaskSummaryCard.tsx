import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../services/theme-context';
import PixelCard from './PixelCard';
import type { Task } from '../types';

interface Props {
  tasks: Task[];
  onTaskPress?: (task: Task) => void;
}

export default function TaskSummaryCard({ tasks, onTaskPress }: Props) {
  const { theme } = useTheme();
  const pending = tasks.filter(t => !t.completed);
  if (pending.length === 0) return null;

  return (
    <PixelCard style={{ marginBottom: 8 }}>
      <Text style={[styles.heading, { color: theme.text }]}>
        今日待办 · {pending.length}项
      </Text>
      {pending.slice(0, 5).map(task => (
        <TouchableOpacity
          key={task.id}
          style={styles.row}
          onPress={() => onTaskPress?.(task)}
        >
          <Text style={{ color: theme.textMuted, fontFamily: 'monospace', fontSize: 12, width: 40 }}>
            {task.datetime?.slice(11, 16) || ''}
          </Text>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {task.priority === '高' ? '‼ ' : task.priority === '低' ? '– ' : '! '}{task.title}
          </Text>
        </TouchableOpacity>
      ))}
      {pending.length > 5 && (
        <Text style={[styles.more, { color: theme.textMuted }]}>还有 {pending.length - 5} 项…</Text>
      )}
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  title: { fontFamily: 'monospace', fontSize: 13, flex: 1 },
  more: { fontFamily: 'monospace', fontSize: 11, marginTop: 4 },
});
