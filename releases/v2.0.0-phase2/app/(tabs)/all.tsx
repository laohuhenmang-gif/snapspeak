import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../services/theme-context';
import { loadTasks, toggleComplete, deleteTask } from '../../services/storage';
import { cancelTaskReminder } from '../../services/notification';
import PixelCard from '../../components/PixelCard';
import PriorityBadge from '../../components/PriorityBadge';
import type { Task } from '../../types';

type FilterStatus = 'all' | 'pending' | 'completed' | 'overdue';

export default function AllTasksScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  const refresh = useCallback(async () => {
    const all = await loadTasks();
    setTasks(all);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const now = new Date().toISOString();
  const filtered = tasks.filter(t => {
    if (filter === 'pending' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;
    if (filter === 'overdue' && (t.completed || (t.datetime && t.datetime >= now))) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleToggle = async (id: string) => {
    await toggleComplete(id);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await cancelTaskReminder(id);
    await deleteTask(id);
    await refresh();
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待办' },
    { key: 'completed', label: '已完成' },
    { key: 'overdue', label: '已逾期' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.pixelBorder }]}>
        <Text style={[styles.heading, { color: theme.text }]}>全部任务</Text>
        <Text style={[styles.subheading, { color: theme.textMuted }]}>共 {tasks.length} 项</Text>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        {[
          { label: '总数', value: tasks.length, color: theme.text },
          { label: '待办', value: tasks.filter(t => !t.completed).length, color: theme.warning },
          { label: '完成', value: tasks.filter(t => t.completed).length, color: theme.success },
          { label: '逾期', value: tasks.filter(t => !t.completed && t.datetime && t.datetime < now).length, color: theme.error },
        ].map(s => (
          <View key={s.label} style={[styles.statItem, { borderColor: theme.pixelBorder, backgroundColor: theme.surface }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={{ padding: 12, paddingBottom: 0 }}>
        <TextInput
          style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.pixelBorder, color: theme.text }]}
          placeholder="搜索任务…"
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterBtn, { borderColor: theme.pixelBorder, backgroundColor: filter === f.key ? theme.primary : theme.surface }]}
          >
            <Text style={{ color: filter === f.key ? '#fff' : theme.text, fontFamily: 'monospace', fontSize: 11, fontWeight: '600' }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingTop: 4 }}>
        {filtered.length === 0 ? (
          <Text style={{ color: theme.textMuted, fontFamily: 'monospace', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            {search ? '没有匹配的任务' : '暂无任务'}
          </Text>
        ) : (
          filtered.map(task => (
            <TouchableOpacity
              key={task.id}
              onPress={() => router.push(`/task/${task.id}`)}
              style={[styles.taskRow, { borderColor: theme.pixelBorder, backgroundColor: theme.surface }]}
            >
              <TouchableOpacity onPress={() => handleToggle(task.id)} style={styles.checkBtn}>
                <Text style={{ fontFamily: 'monospace', fontSize: 16 }}>
                  {task.completed ? '✅' : '⬜'}
                </Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.taskTitle, { color: theme.text, textDecorationLine: task.completed ? 'line-through' : 'none' }]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                <Text style={{ color: theme.textMuted, fontFamily: 'monospace', fontSize: 11 }}>
                  {task.datetime?.slice(0, 16).replace('T', ' ') || '未设时间'} · {task.category}
                </Text>
              </View>
              <PriorityBadge priority={task.priority} />
              <TouchableOpacity onPress={() => handleDelete(task.id)} style={{ padding: 6 }}>
                <Text style={{ color: theme.error, fontFamily: 'monospace', fontSize: 14 }}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2 },
  heading: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700' },
  subheading: { fontFamily: 'monospace', fontSize: 11, marginTop: 2 },
  search: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8, fontFamily: 'monospace', fontSize: 13, marginBottom: 8 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 6, paddingVertical: 8 },
  filterBtn: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 5 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, paddingTop: 12, paddingBottom: 4 },
  statItem: { flex: 1, borderWidth: 2, padding: 8, alignItems: 'center' },
  statValue: { fontFamily: 'monospace', fontSize: 20, fontWeight: '900' },
  statLabel: { fontFamily: 'monospace', fontSize: 10, marginTop: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, padding: 10, marginBottom: 6 },
  checkBtn: { marginRight: 8, padding: 2 },
  taskTitle: { fontFamily: 'monospace', fontSize: 13, fontWeight: '600' },
});
