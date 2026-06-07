import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, AppState, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Task } from '../types';
import { loadTasks, addTask, updateTask, deleteTask, toggleComplete } from '../services/storage';
import { scheduleTaskReminder, cancelTaskReminder } from '../services/notification';
import { chat } from '../services/ai';
import { getApiKey } from '../services/ai-config';
import { AIChatMessage, AIAction } from '../services/ai-types';
import { useTheme } from '../services/theme-context';

export default function ChatScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const flatRef = useRef<FlatList>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;

  const refreshTasks = useCallback(async () => {
    const all = await loadTasks();
    const today = new Date().toISOString().slice(0, 10);
    setAllTasks(all);
    setTodayTasks(all.filter(t => t.datetime.startsWith(today)));
  }, []);

  useEffect(() => {
    getApiKey().then(k => { if (!k) router.replace('/(tabs)'); });
    refreshTasks();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refreshTasks(); });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [loading]);

  const welcomeMsg: AIChatMessage = {
    role: 'assistant',
    content: '你好呀！我是你的 AI 提醒助手✨\n\n你可以直接跟我说事情：\n📌 "明天下午三点开会"\n📌 "帮我看看今天有什么安排"\n📌 "把买菜改成后天上午"\n📌 "你觉得我这周安排合理吗？"\n\n想问什么直接说，我随时在～',
    timestamp: Date.now(),
  };

  useEffect(() => {
    if (messages.length === 0) setMessages([welcomeMsg]);
  }, []);

  const executeActions = async (actions: AIAction[]) => {
    for (const act of actions) {
      try {
        switch (act.action) {
          case 'create':
            if (act.title) {
              const task = await addTask({
                title: act.title, description: act.notes || '', category: act.category || '其他',
                priority: act.priority || '中', completed: false, recurring: act.recurring || 'none',
                datetime: act.datetime || new Date().toISOString(), source: 'text',
                postponed_count: 0, current_blocker_reason: '', needs_precheck: false, project_name: '',
              });
              if (act.datetime) await scheduleTaskReminder(task);
            }
            break;
          case 'edit':
            if (act.taskId && act.changes) {
              await updateTask(act.taskId, act.changes);
              await cancelTaskReminder(act.taskId);
              const updated = (await loadTasks()).find(t => t.id === act.taskId);
              if (updated) await scheduleTaskReminder(updated);
            }
            break;
          case 'delete':
            if (act.taskId) { await deleteTask(act.taskId); await cancelTaskReminder(act.taskId); }
            break;
          case 'complete':
            if (act.taskId) { await toggleComplete(act.taskId); await cancelTaskReminder(act.taskId); }
            break;
          case 'batch':
            if (act.operations) {
              await executeActions(act.operations);
            }
            break;
          case 'snooze': {
            const sa = act as { taskId?: string; snoozeMinutes?: number; newDatetime?: string };
            const mins = sa.snoozeMinutes || 30;
            const future = new Date(Date.now() + mins * 60000).toISOString();
            const allS = await loadTasks();
            let tid = sa.taskId;
            if (!tid && allS.length === 1) tid = allS[0].id;
            if (tid) {
              await updateTask(tid, { datetime: future });
              await cancelTaskReminder(tid);
              const u = (await loadTasks()).find(t => t.id === tid);
              if (u) await scheduleTaskReminder(u);
            }
            break;
          }
          case 'reschedule': {
            const ra = act as { taskId?: string; newDatetime?: string };
            const allR = await loadTasks();
            let rid = ra.taskId;
            if (!rid && allR.length === 1) rid = allR[0].id;
            if (rid && ra.newDatetime) {
              await updateTask(rid, { datetime: ra.newDatetime });
              await cancelTaskReminder(rid);
              const u = (await loadTasks()).find(t => t.id === rid);
              if (u) await scheduleTaskReminder(u);
            }
            break;
          }
        }
      } catch (e) { console.warn('Action failed:', act, e); }
    }
    refreshTasks();
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: AIChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await chat(text, [...messages, userMsg], todayTasks, allTasks);
      const aiMsg: AIChatMessage = { role: 'assistant', content: response.reply, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
      if (response.actions && response.actions.length > 0) {
        await executeActions(response.actions);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant', content: `😅 出错了：${e.message}`, timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, todayTasks, allTasks]);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.headerText }]}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.avatar, { backgroundColor: theme.headerText + '25' }]}>
            <Text style={[styles.avatarText, { color: theme.headerText }]}>🤖</Text>
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.headerText }]}>AI 助手</Text>
            <Text style={[styles.headerStatus, { color: theme.headerText + '99' }]}>
              {loading ? '正在思考...' : '在线'}
            </Text>
          </View>
        </View>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => (
          <View style={[styles.bubbleRow, item.role === 'user' ? styles.userRow : styles.aiRow]}>
            {item.role === 'assistant' && (
              <View style={[styles.avatarSmall, { backgroundColor: theme.primaryLight }]}>
                <Text style={styles.avatarSmallText}>🤖</Text>
              </View>
            )}
            <View style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : styles.aiBubble,
              { backgroundColor: item.role === 'user' ? theme.chatBubbleUser : theme.chatBubbleAI },
            ]}>
              <Text style={[
                styles.bubbleText,
                { color: item.role === 'user' ? theme.chatBubbleUserText : theme.chatBubbleAIText },
              ]}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={[styles.typingIndicator, { backgroundColor: theme.chatBubbleAI }]}>
          <Text style={[styles.typingDot, { color: theme.textMuted }]}>●</Text>
          <Text style={[styles.typingDot, { color: theme.textMuted }]}>●</Text>
          <Text style={[styles.typingDot, { color: theme.textMuted }]}>●</Text>
        </View>
      )}

      <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
          value={input}
          onChangeText={setInput}
          placeholder="跟 AI 聊两句…"
          placeholderTextColor={theme.textMuted}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: theme.primary }, (!input.trim() || loading) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16,
  },
  backBtn: { width: 40, alignItems: 'center' },
  backText: { fontSize: 20, fontWeight: '300' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerStatus: { fontSize: 11, marginTop: 1 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 8 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, gap: 8 },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarSmallText: { fontSize: 14 },
  bubble: { maxWidth: '78%', padding: 14, borderRadius: 18 },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 28,
    borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 10, fontSize: 15,
    marginRight: 8, maxHeight: 80,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  typingIndicator: {
    flexDirection: 'row', gap: 4,
    alignSelf: 'flex-start', marginLeft: 52, marginBottom: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderBottomLeftRadius: 4,
  },
  typingDot: { fontSize: 8 },
});
