import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { COLORS, CATEGORY_COLORS, PRIORITY_LABELS, CATEGORY_LABELS, RECURRING_LABELS } from '../../constants';
import { addTask, updateTask, loadTasks } from '../../services/storage';
import { scheduleTaskReminder, cancelTaskReminder } from '../../services/notification';
import { Priority, Category, RecurringRule } from '../../types';

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const source = (params.source as string || 'text') as 'voice' | 'photo' | 'text';
  const taskId = params.taskId as string || '';

  const [title, setTitle] = useState(params.title as string || '');
  const [description, setDescription] = useState(params.description as string || '');
  const [datetime, setDatetime] = useState('');
  const [priority, setPriority] = useState<Priority>('中');
  const [recurring, setRecurring] = useState<RecurringRule>('none');
  const [category, setCategory] = useState<Category>('其他');

  useEffect(() => {
    if (taskId) {
      loadTasks().then(tasks => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          setTitle(task.title);
          setDescription(task.description);
          setDatetime(task.datetime.slice(0, 16));
          setPriority(task.priority);
          setRecurring(task.recurring);
          setCategory(task.category);
        }
      });
    } else {
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      setDatetime(d.toISOString().slice(0, 16));
    }
  }, [taskId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('请输入任务标题');
      return;
    }

    try {
      if (taskId) {
        await updateTask(taskId, {
          title: title.trim(),
          description: description.trim(),
          datetime: new Date(datetime).toISOString(),
          priority,
          recurring,
          category,
        });
        await cancelTaskReminder(taskId);
        const task = (await loadTasks()).find(t => t.id === taskId);
        if (task) await scheduleTaskReminder(task);
      } else {
        const task = await addTask({
          title: title.trim(),
          description: description.trim(),
          datetime: new Date(datetime).toISOString(),
          priority,
          completed: false,
          recurring,
          category,
          source,
        });
        await scheduleTaskReminder(task);
      }

      Alert.alert('已保存', `任务「${title.trim()}」`, [
        { text: '好的', onPress: () => router.dismissTo('/(tabs)') },
      ]);
    } catch (e: any) {
      Alert.alert('保存失败', e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{taskId ? '编辑任务' : '确认任务信息'}</Text>
      <Text style={styles.sourceTag}>
        {source === 'voice' ? '🎤 语音输入' : source === 'photo' ? '📷 拍照识别' : source === 'text' ? '📝 文字输入' : ''}
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>任务标题</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="输入任务标题" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>备注</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="备注（可选）" multiline />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>提醒时间</Text>
        <TextInput style={styles.input} value={datetime} onChangeText={setDatetime} placeholder="2026-06-10T15:00" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>优先级</Text>
        <View style={styles.optionRow}>
          {PRIORITY_LABELS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.optionBtn, priority === p && { backgroundColor: p === '高' ? COLORS.priorityHigh : p === '中' ? COLORS.warning : COLORS.success }]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.optionText, priority === p && { color: '#fff' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>分类</Text>
        <View style={styles.optionRow}>
          {CATEGORY_LABELS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.optionBtn, category === c && { backgroundColor: CATEGORY_COLORS[c] }]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.optionText, category === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>重复</Text>
        <View style={styles.optionRow}>
          {Object.entries(RECURRING_LABELS).map(([k, v]) => (
            <TouchableOpacity
              key={k}
              style={[styles.optionBtn, recurring === k && { backgroundColor: COLORS.primary }]}
              onPress={() => setRecurring(k as RecurringRule)}
            >
              <Text style={[styles.optionText, recurring === k && { color: '#fff' }]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>✓ 保存任务</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function getPriorityColor(p: string) {
  return p === '高' ? COLORS.priorityHigh : p === '中' ? COLORS.priorityMedium : COLORS.priorityLow;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sourceTag: { fontSize: 13, color: COLORS.textLight, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  optionText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
