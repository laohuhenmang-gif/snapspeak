import { View, Text, TouchableOpacity, StyleSheet, BackHandler, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { COLORS } from '../constants';
import { playBeepSound, speakReminder } from '../services/speech';
import { loadTasks, toggleComplete, updateTask } from '../services/storage';
import { handleReminderResponse } from '../services/ai';
import { cancelTaskReminder, scheduleTaskReminder } from '../services/notification';

export default function ReminderPopupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [response, setResponse] = useState('');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');

  const title = params.title as string || '';
  const taskId = params.taskId as string || '';
  const description = params.description as string || '';

  useEffect(() => {
    speakReminder('提醒：' + title);
    playBeepSound();
    const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => handler.remove();
  }, []);

  const dismiss = () => router.dismissTo('/(tabs)');

  const handleComplete = async () => {
    if (taskId) await toggleComplete(taskId);
    await cancelTaskReminder(taskId);
    dismiss();
  };

  const handleSnooze = async (minutes: number) => {
    if (taskId) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + minutes);
      await updateTask(taskId, { datetime: now.toISOString() });
      await cancelTaskReminder(taskId);
    }
    dismiss();
  };

  const handleAIResponse = async () => {
    if (!response.trim() || processing) return;
    setProcessing(true);
    setFeedback('');
    try {
      const result = await handleReminderResponse(title, response.trim());
      setFeedback(result.message);
      if (result.action === 'complete') {
        if (taskId) await toggleComplete(taskId);
        await cancelTaskReminder(taskId);
        setTimeout(dismiss, 1500);
      } else if (result.action === 'snooze') {
        await handleSnooze(result.snoozeMinutes || 5);
      } else if (result.action === 'reschedule' && result.newDatetime) {
        if (taskId) {
          await updateTask(taskId, { datetime: result.newDatetime });
          await cancelTaskReminder(taskId);
          const updated = (await loadTasks()).find(t => t.id === taskId);
          if (updated) await scheduleTaskReminder(updated);
        }
        setTimeout(dismiss, 1500);
      } else {
        setTimeout(dismiss, 1000);
      }
    } catch {
      setFeedback('处理失败，请重试');
    } finally {
      setProcessing(false);
      setResponse('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.icon}>⏰</Text>
        <Text style={styles.title}>提醒</Text>
        <Text style={styles.taskTitle}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.snoozeBtn} onPress={() => handleSnooze(5)}>
            <Text style={styles.snoozeText}>延后5分钟</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={handleComplete}>
            <Text style={styles.doneText}>✓ 已完成</Text>
          </TouchableOpacity>
        </View>

        {feedback ? (
          <Text style={styles.feedback}>{feedback}</Text>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={response}
            onChangeText={setResponse}
            placeholder="对话式处理：推迟1小时 / 明天再做..."
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleAIResponse}
          />
          <TouchableOpacity
            style={[styles.aiBtn, processing && { opacity: 0.5 }]}
            onPress={handleAIResponse}
            disabled={processing || !response.trim()}
          >
            <Text style={styles.aiBtnText}>{processing ? '...' : '发送'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(45,27,105,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 24, padding: 32,
    width: '100%', alignItems: 'center',
    elevation: 10,
    shadowColor: '#2D1B69',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  taskTitle: { fontSize: 18, fontWeight: '600', color: COLORS.primary, textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  snoozeBtn: {
    flex: 1, padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center',
  },
  snoozeText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  doneBtn: {
    flex: 1, padding: 14, borderRadius: 14,
    backgroundColor: COLORS.success, alignItems: 'center',
  },
  doneText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  feedback: { fontSize: 14, color: COLORS.primary, marginBottom: 12, fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: 8, width: '100%' },
  input: {
    flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 14, padding: 14,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  aiBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 18,
    justifyContent: 'center',
  },
  aiBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
