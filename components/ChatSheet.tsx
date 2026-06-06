import { View, Text, FlatList, TouchableOpacity, StyleSheet, Animated, Dimensions, Image, KeyboardAvoidingView, Platform, PanResponder } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { BlurView } from 'expo-blur';
import { Task } from '../types';
import { loadTasks, addTask, updateTask, deleteTask, toggleComplete } from '../services/storage';
import { scheduleTaskReminder, cancelTaskReminder } from '../services/notification';
import { chat } from '../services/ai';
import { getApiKey } from '../services/ai-config';
import { AIChatMessage, AIAction } from '../services/ai-types';
import { useTheme } from '../services/theme-context';
import InputBar from './InputBar';
import { toast } from './Toast';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface ChatSheetProps {
  visible: boolean;
  onClose: () => void;
  task?: Task | null;
}

export default function ChatSheet({ visible, onClose, task }: ChatSheetProps) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const flatRef = useRef<FlatList>(null);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const refreshTasks = useCallback(async () => {
    const all = await loadTasks();
    const today = new Date().toISOString().slice(0, 10);
    setAllTasks(all);
    setTodayTasks(all.filter(t => t.datetime.startsWith(today)));
  }, []);

  const welcomeMsg: AIChatMessage = {
    role: 'assistant',
    content: task
      ? `好的，我们来看看「${task.title}」。你可以直接说"改到明天下午"、"标记为完成"、"加重要"等。`
      : '你好呀！我是你的 AI 提醒助手\n\n你可以直接跟我说：\n📌 "明天下午三点开会"\n📌 "帮我看看今天有什么安排"\n📌 "把买菜改成后天上午"\n\n想问什么直接说，我随时在～',
    timestamp: Date.now(),
  };

  const openSheet = useCallback(() => {
    setMessages([welcomeMsg]);
    refreshTasks();
    Animated.parallel([
      Animated.spring(translateY, { toValue: SCREEN_HEIGHT - SHEET_HEIGHT, stiffness: 160, damping: 22, mass: 1, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [welcomeMsg]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: SCREEN_HEIGHT, stiffness: 200, damping: 26, mass: 1, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  useEffect(() => {
    if (visible) openSheet();
    else { translateY.setValue(SCREEN_HEIGHT); backdropOpacity.setValue(0); }
  }, [visible]);

  const sheetPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(Math.max(SCREEN_HEIGHT - SHEET_HEIGHT + gs.dy, SCREEN_HEIGHT - SHEET_HEIGHT));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > SHEET_HEIGHT * 0.3) closeSheet();
        else {
          Animated.spring(translateY, { toValue: SCREEN_HEIGHT - SHEET_HEIGHT, stiffness: 200, damping: 26, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const executeActions = async (actions: AIAction[]) => {
    for (const act of actions) {
      try {
        switch (act.action) {
          case 'create':
            if (act.title) {
              const t = await addTask({
                title: act.title, description: act.notes || '', category: act.category || '其他',
                priority: act.priority || '中', completed: false, recurring: act.recurring || 'none',
                datetime: act.datetime || new Date().toISOString(), source: 'text',
              });
              if (act.datetime) await scheduleTaskReminder(t);
            }
            break;
          case 'edit':
            if (act.taskId && act.changes) {
              await updateTask(act.taskId, act.changes);
              await cancelTaskReminder(act.taskId);
              const u = (await loadTasks()).find(t => t.id === act.taskId);
              if (u) await scheduleTaskReminder(u);
            }
            break;
          case 'delete':
            if (act.taskId) { await deleteTask(act.taskId); await cancelTaskReminder(act.taskId); }
            break;
          case 'complete':
            if (act.taskId) { await toggleComplete(act.taskId); await cancelTaskReminder(act.taskId); }
            break;
          case 'batch':
            if (act.operations) await executeActions(act.operations);
            break;
        }
      } catch (e) { console.warn('Action failed:', act, e); }
    }
    refreshTasks();
  };

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const key = await getApiKey();
    if (!key) { toast('请先在设置中配置 API Key', 'warn'); return; }

    setLoading(true);
    const userMsg: AIChatMessage = { role: 'user', content: trimmed, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const aiResponse = await chat(trimmed, [...messages, userMsg], todayTasks, allTasks);
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse.reply, timestamp: Date.now() }]);
      if (aiResponse.actions?.length) await executeActions(aiResponse.actions);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: '😅 出错了：' + (e.message || ''), timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, todayTasks, allTasks]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <BlurView intensity={25} tint={theme.bg === '#0E0E1A' ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
        </BlurView>
      </Animated.View>

      <Animated.View style={[styles.sheet, { backgroundColor: theme.card, transform: [{ translateY }] }]}>
        <View style={styles.handleBar} {...sheetPan.panHandlers}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>

        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.avatarWrap}>
            <Image source={require('../assets/mona-avatar.png')} style={styles.avatar} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {task ? `编辑：${task.title}` : 'AI 助手'}
            </Text>
            <Text style={[styles.headerStatus, { color: theme.textMuted }]}>
              {loading ? '思考中...' : '在线'}
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.role === 'user' ? styles.userRow : styles.aiRow]}>
              {item.role === 'assistant' && (
                <Image source={require('../assets/mona-avatar.png')} style={styles.avatarSmall} />
              )}
              <View style={[
                styles.bubble,
                item.role === 'user' ? styles.userBubble : styles.aiBubble,
                { backgroundColor: item.role === 'user' ? theme.chatBubbleUser : theme.chatBubbleAI },
              ]}>
                <Text style={[styles.bubbleText, { color: item.role === 'user' ? theme.chatBubbleUserText : theme.chatBubbleAIText }]}>
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
          <View style={[styles.typing, { backgroundColor: theme.chatBubbleAI + '80' }]}>
            <Text style={{ color: theme.textMuted }}>...</Text>
          </View>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <InputBar onSendText={handleSend} onVoiceResult={handleSend} showCamera={!task} />
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
  },
  handleBar: {
    alignItems: 'center', paddingTop: 10, paddingBottom: 6,
  },
  handle: {
    width: 36, height: 5, borderRadius: 3,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerStatus: { fontSize: 11, marginTop: 1 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 8 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, gap: 8 },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  avatarSmall: { width: 28, height: 28, borderRadius: 14 },
  avatarSmallImg: { width: 28, height: 28, borderRadius: 14 },
  bubble: { maxWidth: '75%', padding: 14, borderRadius: 18 },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  typing: {
    alignSelf: 'flex-start', marginLeft: 52, marginBottom: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderBottomLeftRadius: 4,
  },
});
