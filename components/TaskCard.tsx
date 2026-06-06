import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { COLORS } from '../constants';
import { Task } from '../types';
import { deleteTask } from '../services/storage';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onLongPress?: (task: Task) => void;
  onTap?: (task: Task) => void;
}

export default function TaskCard({ task, onToggle, onLongPress, onTap }: TaskCardProps) {
  const router = useRouter();
  const priorityIcon = task.priority === '高' ? '!!' : task.priority === '低' ? '--' : '··';
  const time = task.datetime ? task.datetime.slice(11, 16) : '';

  const handleLongPress = () => {
    Alert.alert(
      task.title,
      undefined,
      [
        { text: '编辑', onPress: () => router.push({ pathname: `/task-edit/${task.id}` }) },
        { text: '删除', style: 'destructive', onPress: () => {
          Alert.alert('确认删除', `删除「${task.title}」？`, [
            { text: '取消', style: 'cancel' },
            { text: '删除', style: 'destructive', onPress: async () => {
              await deleteTask(task.id);
              onLongPress?.(task);
            }},
          ]);
        }},
        { text: '取消', style: 'cancel' },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, task.completed && styles.completed]}
      onPress={() => {
        if (onTap) onTap(task);
        else router.push({ pathname: `/task-edit/${task.id}` });
      }}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <Text style={styles.priorityIcon}>{priorityIcon}</Text>
      {time ? <Text style={[styles.time, task.completed && styles.dim]}>{time}</Text> : null}
      <Text style={[styles.title, task.completed && styles.lineThrough]} numberOfLines={1}>
        {task.title}
      </Text>
      {task.recurring !== 'none' && (
        <Text style={styles.recurring}>{'>'}{'>'}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    marginHorizontal: 12, marginVertical: 2,
    backgroundColor: COLORS.card,
    borderWidth: 2, borderColor: COLORS.border,
  },
  completed: { opacity: 0.5 },
  priorityIcon: { fontSize: 12, width: 22, textAlign: 'center', color: COLORS.text, fontFamily: 'monospace' },
  time: { fontSize: 13, fontWeight: '700', color: COLORS.text, width: 48, fontVariant: ['tabular-nums'] },
  dim: { color: COLORS.textLight },
  title: { flex: 1, fontSize: 14, color: COLORS.text, marginLeft: 8 },
  lineThrough: { textDecorationLine: 'line-through', color: COLORS.textLight },
  recurring: { fontSize: 12, color: COLORS.text, marginLeft: 4, fontFamily: 'monospace' },
});
