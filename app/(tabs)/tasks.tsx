import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Task, Category } from '../../types';
import { loadTasks, toggleComplete } from '../../services/storage';
import { useTheme } from '../../services/theme-context';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../constants';
import TaskCard from '../../components/TaskCard';

export default function TasksScreen() {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  const refresh = useCallback(async () => { setTasks(await loadTasks()); }, []);

  useEffect(() => { refresh(); }, []);

  const inCategory = (t: Task) => filter === 'all' || t.category === filter;
  const active = tasks.filter(t => !t.completed && inCategory(t));
  const completed = tasks.filter(t => t.completed && inCategory(t));
  const displayed = tab === 'active' ? active : completed;

  const handleToggle = async (id: string) => { await toggleComplete(id); refresh(); };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.segRow, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'active' && { backgroundColor: theme.primary }]}
          onPress={() => setTab('active')}>
          <Text style={[styles.segText, { color: theme.text }, tab === 'active' && { color: '#fff' }]}>
            ● 待办 ({active.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'completed' && { backgroundColor: theme.primary }]}
          onPress={() => setTab('completed')}>
          <Text style={[styles.segText, { color: theme.text }, tab === 'completed' && { color: '#fff' }]}>
            ✓ 已完成 ({completed.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'active' ? (
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
      ) : null}

      <FlatList
        data={displayed}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          tab === 'active' ? (
            <TaskCard task={item} onToggle={handleToggle} onTap={() => {}} />
          ) : (
            <View style={[styles.completedRow, { backgroundColor: theme.card }]}>
              <Text style={styles.completedCheck}>✓</Text>
              <View style={styles.completedInfo}>
                <Text style={[styles.completedTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.completedDate, { color: theme.textMuted }]}>
                  {item.completedAt ? formatDate(item.completedAt) : ''}
                </Text>
              </View>
            </View>
          )
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>
              {tab === 'active' ? (filter === 'all' ? '暂无待办任务' : `暂无「${filter}」待办任务`) : '暂无已完成任务'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segText: { fontSize: 15, fontWeight: '600' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexWrap: 'wrap', borderBottomWidth: StyleSheet.hairlineWidth },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16 },
  completedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, marginHorizontal: 16, marginVertical: 3, borderRadius: 16, opacity: 0.7 },
  completedCheck: { fontSize: 16, color: '#2ED573', marginRight: 14, fontWeight: '700' },
  completedInfo: { flex: 1 },
  completedTitle: { fontSize: 15, textDecorationLine: 'line-through' },
  completedDate: { fontSize: 12, marginTop: 2 },
});