import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { COLORS, CATEGORY_COLORS, PRIORITY_LABELS, CATEGORY_LABELS, RECURRING_LABELS } from '../../constants';
import { loadTasks, updateTask, deleteTask } from '../../services/storage';
import { scheduleTaskReminder, cancelTaskReminder } from '../../services/notification';
import { editTask } from '../../services/ai';
import { Priority, Category, RecurringRule, Task } from '../../types';
import InputBar from '../../components/InputBar';

export default function TaskEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [datetime, setDatetime] = useState('');
  const [priority, setPriority] = useState<Priority>('中');
  const [category, setCategory] = useState<Category>('其他');
  const [recurring, setRecurring] = useState<RecurringRule>('none');

  useEffect(() => {
    loadTasks().then(tasks => {
      const t = tasks.find(t => t.id === id);
      if (t) {
        setTask(t);
        setTitle(t.title);
        setDescription(t.description);
        setDatetime(t.datetime.slice(0, 16));
        setPriority(t.priority);
        setCategory(t.category);
        setRecurring(t.recurring);
      }
    });
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !id) return;
    await updateTask(id, {
      title: title.trim(),
      description: description.trim(),
      datetime: new Date(datetime).toISOString(),
      priority, category, recurring,
    });
    await cancelTaskReminder(id);
    const updated = (await loadTasks()).find(t => t.id === id);
    if (updated) await scheduleTaskReminder(updated);
    Alert.alert('已保存', undefined, [{ text: '好的', onPress: () => router.back() }]);
  }, [id, title, description, datetime, priority, category, recurring, router]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    Alert.alert('确认删除', `删除「${title}」？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        await deleteTask(id);
        await cancelTaskReminder(id);
        router.back();
      }},
    ]);
  }, [id, title, router]);

  const handleEditCommand = useCallback(async (text: string) => {
    if (!text.trim() || !task) return;
    try {
      const { changes, summary } = await editTask(task, text.trim());
      if (changes.title !== undefined) setTitle(changes.title);
      if (changes.datetime !== undefined) setDatetime(changes.datetime.slice(0, 16));
      if (changes.priority !== undefined) setPriority(changes.priority);
      if (changes.category !== undefined) setCategory(changes.category);
      if (changes.recurring !== undefined) setRecurring(changes.recurring);
      if (changes.description !== undefined) setDescription(changes.description);
      Alert.alert(summary);
    } catch (e: any) {
      Alert.alert('AI 处理失败', e.message);
    }
  }, [task]);

  if (!task) {
    return <View style={styles.container}><Text style={styles.loading}>加载中...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>编辑任务</Text>

        <View style={styles.field}>
          <Text style={styles.label}>标题</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>时间</Text>
          <TextInput style={styles.input} value={datetime} onChangeText={setDatetime}
            placeholder="YYYY-MM-DD HH:MM" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>优先级</Text>
          <View style={styles.optionRow}>
            {PRIORITY_LABELS.map(p => (
              <TouchableOpacity key={p}
                style={[styles.optionBtn, priority === p && {
                  backgroundColor: p === '高' ? COLORS.priorityHigh : p === '中' ? COLORS.warning : COLORS.success
                }]}
                onPress={() => setPriority(p)}>
                <Text style={[styles.optionText, priority === p && { color: '#fff' }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>分类</Text>
          <View style={styles.optionRow}>
            {CATEGORY_LABELS.map(c => (
              <TouchableOpacity key={c}
                style={[styles.optionBtn, category === c && { backgroundColor: CATEGORY_COLORS[c] }]}
                onPress={() => setCategory(c)}>
                <Text style={[styles.optionText, category === c && { color: '#fff' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>重复</Text>
          <View style={styles.optionRow}>
            {Object.entries(RECURRING_LABELS).map(([k, v]) => (
              <TouchableOpacity key={k}
                style={[styles.optionBtn, recurring === k && { backgroundColor: COLORS.primary }]}
                onPress={() => setRecurring(k as RecurringRule)}>
                <Text style={[styles.optionText, recurring === k && { color: '#fff' }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>备注</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description}
            onChangeText={setDescription} multiline />
        </View>
      </ScrollView>

      <InputBar onSendText={handleEditCommand} onVoiceResult={handleEditCommand} showCamera={false} />

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteText}>删除任务</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>✓ 保存</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1, padding: 16, paddingTop: 60 },
  loading: { fontSize: 16, color: COLORS.textLight, textAlign: 'center', marginTop: 80 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, fontSize: 15,
    borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  optionText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  bottomActions: {
    flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 32,
    backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  deleteBtn: {
    flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.danger, alignItems: 'center',
  },
  deleteText: { color: COLORS.danger, fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  aiBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.primary + '12',
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  aiInput: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  aiBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8, marginLeft: 6,
  },
  aiBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
