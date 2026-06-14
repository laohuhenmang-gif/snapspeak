import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../services/theme-context';
import { loadTasks, toggleComplete, deleteTask } from '../../services/storage';
import { cancelTaskReminder } from '../../services/notification';
import { hapticMedium, hapticSuccess } from '../../services/haptics';
import PixelCard from '../../components/PixelCard';
import SwipeableTask from '../../components/SwipeableTask';
import EmptyState from '../../components/EmptyState';
import type { Task } from '../../types';

type FilterStatus = 'all' | 'pending' | 'completed' | 'overdue';

export default function AllTasksScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    const all = await loadTasks();
    setTasks(all);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

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
    await hapticSuccess();
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await cancelTaskReminder(id);
    await deleteTask(id);
    await hapticMedium();
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={search ? '🔍' : '📭'}
            title={search ? '没有匹配的任务' : '暂无任务'}
            subtitle={search ? '试试其他关键词' : '点击下方输入栏创建第一个任务'}
          />
        ) : (
          filtered.map(task => (
            <SwipeableTask
              key={task.id}
              task={task}
              onPress={() => router.push(`/task/${task.id}`)}
              onComplete={() => handleToggle(task.id)}
              onDelete={() => handleDelete(task.id)}
            />
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
});
