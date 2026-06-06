import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Task, Category } from '../../types';
import { loadTasks, toggleComplete } from '../../services/storage';
import { useTheme } from '../../services/theme-context';
import { COLORS, CATEGORY_COLORS, CATEGORY_LABELS } from '../../constants';
import TaskCard from '../../components/TaskCard';

export default function TasksScreen() {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Category | 'all'>('all');

  const refresh = useCallback(async () => { setTasks(await loadTasks()); }, []);

  useEffect(() => { refresh(); }, []);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter);

  const handleToggle = async (id: string) => { await toggleComplete(id); refresh(); };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.filterRow, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: theme.card, borderColor: theme.border }, filter === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, { color: theme.text }, filter === 'all' && { color: '#fff' }]}>全部</Text>
        </TouchableOpacity>
        {CATEGORY_LABELS.map(c => (
          <TouchableOpacity key={c}
            style={[styles.filterBtn, { backgroundColor: theme.card, borderColor: theme.border }, filter === c && { backgroundColor: CATEGORY_COLORS[c], borderColor: CATEGORY_COLORS[c] }]}
            onPress={() => setFilter(c)}>
            <Text style={[styles.filterText, { color: theme.text }, filter === c && { color: '#fff' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TaskCard task={item} onToggle={handleToggle} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>
              {filter === 'all' ? '暂无任务' : `暂无「${filter}」分类任务`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexWrap: 'wrap', borderBottomWidth: StyleSheet.hairlineWidth },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16 },
});
