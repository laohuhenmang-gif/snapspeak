import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../services/theme-context';
import { loadTasks, updateTask, deleteTask } from '../../services/storage';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import type { Task } from '../../types';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    loadTasks().then(all => {
      const t = all.find(x => x.id === id);
      if (t) { setTask(t); setTitle(t.title); }
    });
  }, [id]);

  if (!task) {
    return <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: theme.textMuted, fontFamily: 'monospace' }}>任务不存在</Text>
    </View>;
  }

  const handleUpdate = async () => {
    if (title.trim()) await updateTask(task.id, { title: title.trim() });
    alert('已更新');
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    alert('已删除');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ padding: 12 }}>
      <PixelCard>
        <Text style={[styles.label, { color: theme.textSecondary }]}>标题</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.pixelBorder, color: theme.text }]}
          value={title}
          onChangeText={setTitle}
        />
        <Text style={[styles.label, { color: theme.textSecondary }]}>时间</Text>
        <Text style={[styles.val, { color: theme.text }]}>{task.datetime?.slice(0, 16).replace('T', ' ') || '未设置'}</Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>优先级</Text>
        <Text style={[styles.val, { color: theme.text }]}>{task.priority}</Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>分类</Text>
        <Text style={[styles.val, { color: theme.text }]}>{task.category}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PixelButton title="[保存修改]" onPress={handleUpdate} style={{ flex: 1 }} />
          <PixelButton title="[删除]" onPress={handleDelete} variant="danger" style={{ flex: 1 }} />
        </View>
      </PixelCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontFamily: 'monospace', fontSize: 11, marginTop: 8 },
  val: { fontFamily: 'monospace', fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 2, padding: 10, fontFamily: 'monospace', fontSize: 14 },
});
