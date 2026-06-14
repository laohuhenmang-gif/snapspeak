import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../services/theme-context';
import { chat, generateDailyReview, generateWeeklyReview, generateBriefing } from '../../services/ai';
import { getPersona } from '../../services/ai-config';
import { getPersonaById } from '../../constants/personas';
import {
  loadTasks, addTask, updateTask, deleteTask, toggleComplete,
  saveBlocker, saveMemory, saveAIAction, saveReflection,
  loadReflectionByDate, saveConversation, saveCapture,
} from '../../services/storage';
import { cancelTaskReminder } from '../../services/notification';
import { scheduleTaskReminder } from '../../services/notification';
import { ensureSpeechPermission, startListening, stopListening } from '../../services/speech';
import { recognizeText } from '../../services/ocr';
import { ocrEnhance } from '../../services/ai';
import * as ImagePicker from 'expo-image-picker';
import { startNetworkMonitor, stopNetworkMonitor } from '../../services/network';
import { saveAppState, loadPendingActions, savePendingActions, clearPendingActions } from '../../services/state-recovery';
import BottomInputBar from '../../components/BottomInputBar';
import StatusBanner, { type ChatState } from '../../components/StatusBanner';
import TaskSummaryCard from '../../components/TaskSummaryCard';
import ErrorBanner from '../../components/ErrorBanner';
import ConfirmCard from '../../components/ConfirmCard';
import PixelAvatar from '../../components/PixelAvatar';
import PixelButton from '../../components/PixelButton';
import AnimatedMessage from '../../components/AnimatedMessage';
import type { Task, Category, RecurringRule } from '../../types';
import type { AIAction, AIChatMessage } from '../../services/ai-types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type: 'text' | 'card' | 'error' | 'image';
  content: string;
  actions?: AIAction[];
  imageUri?: string;
  timestamp: number;
  reviewData?: { type: 'daily' | 'weekly'; date: string; summary: string; suggestion: string; rate: number };
}

type StatusState = ChatState;

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatState, setChatState] = useState<StatusState>('idle');
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [pendingActions, setPendingActions] = useState<AIAction[]>([]);
  const [listening, setListening] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const listeningCleanup = useRef<(() => void) | null>(null);
  const lastSendText = useRef<string>('');
  const initialized = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    startNetworkMonitor(setIsConnected);
    return () => { stopNetworkMonitor(); };
  }, []);

  useEffect(() => {
    if (input) {
      saveAppState({ pendingInput: input }).catch(() => {});
    }
  }, [input]);

  const refreshTasks = useCallback(async () => {
    const all = await loadTasks();
    setAllTasks(all);
    const today = new Date().toISOString().slice(0, 10);
    setTodayTasks(all.filter(t => t.datetime?.startsWith(today)));
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
    saveConversation({
      role: msg.role,
      content: msg.content,
      message_type: msg.type,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      await refreshTasks();
      const all = await loadTasks();
      const today = new Date().toISOString().slice(0, 10);
      const todayList = all.filter(t => t.datetime?.startsWith(today));

      // Check for daily review (yesterday)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const existingReview = await loadReflectionByDate(yesterday);
      if (!existingReview) {
        try {
          const review = await generateDailyReview(all, yesterday);
          if (review.completion_rate > 0 || all.filter(t => t.datetime?.startsWith(yesterday)).length > 0) {
            addMessage({
              id: 'review-' + yesterday,
              role: 'assistant', type: 'text',
              content: `📊 昨日复盘\n完成 ${review.completion_rate}%\n${review.ai_summary}\n\n建议：${review.ai_suggestion}`,
              timestamp: Date.now(),
              reviewData: { type: 'daily', date: yesterday, summary: review.ai_summary, suggestion: review.ai_suggestion, rate: review.completion_rate },
            });
            await saveReflection({
              date: yesterday,
              planned_count: all.filter(t => t.datetime?.startsWith(yesterday)).length,
              completed_count: all.filter(t => t.completed && t.completedAt?.startsWith(yesterday)).length,
              completion_rate: review.completion_rate,
              overdue_count: all.filter(t => !t.completed && t.datetime && t.datetime < new Date().toISOString()).length,
              ai_summary: review.ai_summary,
              ai_suggestion: review.ai_suggestion,
            });
          }
        } catch {}
      }

      // Weekly review on Mondays
      const todayDate = new Date();
      if (todayDate.getDay() === 1) {
        const lastMonday = new Date(todayDate.getTime() - 7 * 86400000);
        const weekStart = lastMonday.toISOString().slice(0, 10);
        const existingWeekly = await loadReflectionByDate('weekly-' + weekStart);
        if (!existingWeekly) {
          try {
            const weekReview = await generateWeeklyReview(all, weekStart);
            addMessage({
              id: 'weekly-review-' + weekStart,
              role: 'assistant', type: 'text',
              content: `📊 上周复盘 (${weekStart} ~ ${new Date(lastMonday.getTime() + 6 * 86400000).toISOString().slice(0, 10)})\n完成 ${weekReview.total_completed}/${weekReview.total_planned} 件，完成率 ${weekReview.completion_rate}%\n${weekReview.ai_summary}\n\n建议：${weekReview.ai_suggestion}`,
              timestamp: Date.now(),
              reviewData: { type: 'weekly', date: weekStart, summary: weekReview.ai_summary, suggestion: weekReview.ai_suggestion, rate: weekReview.completion_rate },
            });
            await saveReflection({
              date: 'weekly-' + weekStart,
              planned_count: weekReview.total_planned,
              completed_count: weekReview.total_completed,
              completion_rate: weekReview.completion_rate,
              overdue_count: 0,
              ai_summary: weekReview.ai_summary,
              ai_suggestion: weekReview.ai_suggestion,
            });
          } catch {}
        }
      }

      // Generate greeting
      const personaId = await getPersona();
      const persona = getPersonaById(personaId);
      const greeting = await generateBriefing(todayList);
      addMessage({
        id: 'greeting',
        role: 'assistant',
        type: 'text',
        content: `${persona.avatar} ${greeting}`,
        timestamp: Date.now(),
      });
    })();
  }, [refreshTasks, addMessage]);

  const executeActions = useCallback(async (actions: AIAction[]): Promise<boolean> => {
    for (const action of actions) {
      try {
        await saveAIAction({ action_type: action.action, payload_json: JSON.stringify(action), status: 'executed' });

        switch (action.action) {
          case 'create': {
            const task = await addTask({
              title: action.title,
              datetime: action.datetime || new Date().toISOString(),
              priority: action.priority || '中',
              category: action.category || '其他',
              recurring: action.recurring || 'none',
              source: 'ai',
              completed: false, postponed_count: 0, current_blocker_reason: '',
              needs_precheck: false, project_name: '',
              description: action.notes || '',
            });
            if (task) await scheduleTaskReminder(task);
            break;
          }
          case 'edit': {
            if (action.taskId) await updateTask(action.taskId, action.changes);
            break;
          }
          case 'delete': {
            if (action.taskId) { await cancelTaskReminder(action.taskId); await deleteTask(action.taskId); }
            break;
          }
          case 'complete': {
            if (action.taskId) await toggleComplete(action.taskId);
            break;
          }
          case 'record_blocker': {
            await saveBlocker({
              task_id: action.taskId,
              blocker_type: 'user_report',
              blocker_text: action.blocker_reason,
              suggested_action: action.suggested_action || '',
            });
            if (action.taskId) await updateTask(action.taskId, { current_blocker_reason: action.blocker_reason } as any);
            break;
          }
          case 'create_reminder': {
            const task = allTasks.find(t => t.id === action.taskId);
            if (task) await scheduleTaskReminder(task);
            break;
          }
          case 'create_memory': {
            await saveMemory({
              memory_type: action.memory_type,
              content: action.content,
              source_id: action.source_id || '',
              confidence: 0.9,
              user_confirmed: true,
            });
            break;
          }
          case 'create_plan': {
            for (const t of action.tasks) {
              const newTask = await addTask({
                title: t.title,
                datetime: t.datetime || new Date().toISOString(),
                priority: t.priority || '中',
                category: '其他' as Category,
                recurring: 'none' as RecurringRule,
                source: 'ai', completed: false, postponed_count: 0,
                current_blocker_reason: '', needs_precheck: false, project_name: '',
                description: t.notes || '',
              });
              if (newTask) await scheduleTaskReminder(newTask);
            }
            break;
          }
          case 'generate_review': {
            await saveReflection({
              date: action.date, planned_count: action.planned_count,
              completed_count: action.completed_count, completion_rate: action.completion_rate,
              overdue_count: action.overdue_count, main_blockers_json: action.main_blockers_json,
              ai_summary: action.ai_summary, ai_suggestion: action.ai_suggestion,
            });
            break;
          }
          case 'batch': {
            if (action.operations) await executeActions(action.operations);
            break;
          }
        }
      } catch (e: any) {
        console.error('Action failed:', action.action, e);
      }
    }
    await refreshTasks();
    return true;
  }, [allTasks, refreshTasks]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || chatState === 'thinking' || chatState === 'executing') return;
    if (!isConnected) {
      addMessage({
        id: Date.now().toString(36), role: 'assistant', type: 'error',
        content: '当前网络不可用，请检查网络后重试。',
        timestamp: Date.now(),
      });
      return;
    }
    lastSendText.current = msg;

    setInput('');
    setChatState('thinking');

    const userMsg: ChatMessage = {
      id: Date.now().toString(36),
      role: 'user', type: 'text', content: msg, timestamp: Date.now(),
    };
    addMessage(userMsg);
    saveCapture({ type: 'text', raw_text: msg }).catch(() => {});

    try {
      const history: AIChatMessage[] = messages
        .filter(m => m.type === 'text')
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }));

      const response = await chat(msg, history, todayTasks, allTasks);
      setPendingActions(response.actions || []);

      if (response.actions && response.actions.length > 0) {
        const asstMsg: ChatMessage = {
          id: (Date.now() + 1).toString(36),
          role: 'assistant', type: 'text', content: response.reply,
          actions: response.actions,
          timestamp: Date.now(),
        };
        addMessage(asstMsg);
        setChatState('action_pending');
      } else {
        const asstMsg: ChatMessage = {
          id: (Date.now() + 1).toString(36),
          role: 'assistant', type: 'text', content: response.reply,
          timestamp: Date.now(),
        };
        addMessage(asstMsg);
        setChatState('idle');
      }
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(36),
        role: 'assistant', type: 'error',
        content: e.message || '出错了，请重试',
        timestamp: Date.now(),
      };
      addMessage(errMsg);
      setChatState('error');
    }
  }, [input, chatState, messages, todayTasks, allTasks, addMessage, isConnected]);

  const handleConfirm = useCallback(async () => {
    if (pendingActions.length === 0) return;
    setChatState('executing');
    await executeActions(pendingActions);
    setPendingActions([]);
    setChatState('idle');

    // Update the last assistant message to show confirmed status
    setMessages(prev => prev.map(m =>
      m.actions && m.actions === pendingActions
        ? { ...m, content: m.content + '\n\n[✓ 已执行]' }
        : m
    ));
  }, [pendingActions, executeActions]);

  const handleCancelActions = useCallback(async () => {
    for (const action of pendingActions) {
      await saveAIAction({ action_type: action.action, payload_json: JSON.stringify(action), status: 'cancelled' });
    }
    setPendingActions([]);
    setChatState('idle');
  }, [pendingActions]);

  const handleVoicePress = useCallback(async () => {
    if (listening) {
      stopListening(true);
      setListening(false);
      return;
    }

    const granted = await ensureSpeechPermission();
    if (!granted) {
      addMessage({
        id: Date.now().toString(36), role: 'assistant', type: 'error',
        content: '需要麦克风权限才能使用语音输入，请在系统设置中授权。',
        timestamp: Date.now(),
      });
      return;
    }

    setListening(true);
    setChatState('listening');

    const cleanup = startListening(
      (partial) => setInput(partial),
      async (result) => {
        setListening(false);
        setChatState('sending');
        setInput('');
        saveCapture({ type: 'voice', transcribed_text: result }).catch(() => {});
        await handleSend(result);
      },
      (error) => {
        setListening(false);
        setChatState('idle');
        addMessage({
          id: Date.now().toString(36), role: 'assistant', type: 'error',
          content: error, timestamp: Date.now(),
        });
      },
    );
    listeningCleanup.current = cleanup;
  }, [listening, addMessage, handleSend]);

  const handleCameraPress = useCallback(async () => {
    const useCamera = await new Promise<boolean | null>(resolve => {
      Alert.alert('选择图片来源', '', [
        { text: '拍照', onPress: () => resolve(true) },
        { text: '从相册选择', onPress: () => resolve(false) },
        { text: '取消', onPress: () => resolve(null), style: 'cancel' },
      ]);
    });
    if (useCamera === null) return;

    const cameraPerm = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : { granted: true };
    const libraryPerm = !useCamera ? await ImagePicker.requestMediaLibraryPermissionsAsync() : { granted: true };

    if (!cameraPerm.granted && !libraryPerm.granted) {
      addMessage({
        id: Date.now().toString(36), role: 'assistant', type: 'error',
        content: '需要相机和相册权限才能使用拍照功能，请在系统设置中授权。',
        timestamp: Date.now(),
      });
      return;
    }

    let result;
    try {
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'], quality: 0.8, base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], quality: 0.8, base64: true,
        });
      }
      if (result.canceled) return;
    } catch {
      addMessage({
        id: Date.now().toString(36), role: 'assistant', type: 'error',
        content: '打开相机或相册失败，请重试', timestamp: Date.now(),
      });
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.base64) {
      addMessage({
        id: Date.now().toString(36), role: 'assistant', type: 'error',
        content: '无法读取图片，请重试',
        timestamp: Date.now(),
      });
      return;
    }

    // Show image as user message
    addMessage({
      id: Date.now().toString(36), role: 'user', type: 'image',
      content: '[图片]', imageUri: asset.uri,
      timestamp: Date.now(),
    });

    setChatState('thinking');

    try {
      // OCR
      const ocrResult = await recognizeText(asset.base64);
      if (ocrResult.confidence === 0 || !ocrResult.text) {
        const errText = ocrResult.text || 'OCR 识别失败';
        addMessage({
          id: Date.now().toString(36), role: 'assistant', type: 'error',
          content: errText,
          timestamp: Date.now(),
        });
        setChatState('idle');
        return;
      }

      saveCapture({ type: 'photo', image_uri: asset.uri, ocr_text: ocrResult.text }).catch(() => {});

      // AI task extraction
      const enhanced = await ocrEnhance(ocrResult.text);

      addMessage({
        id: Date.now().toString(36), role: 'assistant', type: 'text',
        content: `从图片中识别到以下内容：\n${enhanced.cleaned || ocrResult.text}`,
        timestamp: Date.now(),
      });

      if (enhanced.tasks.length > 0) {
        const createActions: AIAction[] = enhanced.tasks.map(t => ({
          action: 'create',
          title: t.title,
          datetime: t.datetime || undefined,
          priority: t.priority,
          category: t.category,
          notes: t.notes,
        }));
        setPendingActions(createActions);
        setChatState('action_pending');

        addMessage({
          id: Date.now().toString(36), role: 'assistant', type: 'text',
          content: `识别到 ${enhanced.tasks.length} 个待办事项，请确认：`,
          actions: createActions,
          timestamp: Date.now(),
        });
      } else {
        setChatState('idle');
      }
    } catch (e: any) {
      addMessage({
        id: Date.now().toString(36), role: 'assistant', type: 'error',
        content: `处理图片失败: ${e.message}`,
        timestamp: Date.now(),
      });
      setChatState('idle');
    }
  }, [addMessage]);

  const handleTaskPress = useCallback((task: Task) => {
    router.push(`/task/${task.id}`);
  }, [router]);

  const lastAssistantMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.pixelBorder }]}>
        <PixelAvatar size={28} />
        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text style={[styles.heading, { color: theme.text }]}>语拍提醒</Text>
          <Text style={[styles.subheading, { color: theme.textMuted }]}>
            {chatState === 'thinking' ? 'AI 处理中…' :
             chatState === 'error' ? '出错了' :
             `今日 ${todayTasks.filter(t => !t.completed).length} 项待办`}
          </Text>
        </View>
      </View>

      {/* Chat area */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
        keyboardShouldPersistTaps="handled"
      >
        <TaskSummaryCard tasks={todayTasks} onTaskPress={handleTaskPress} />

        {messages.map((msg, idx) => (
          <AnimatedMessage key={msg.id} delay={idx < 10 ? idx * 40 : 0}>
            <View>
            {msg.type === 'error' ? (
              <ErrorBanner
                message={msg.content}
                onRetry={lastSendText.current ? () => handleSend(lastSendText.current) : undefined}
                onDismiss={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
              />
            ) : (
              <View
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.userBubble : styles.asstBubble,
                  { borderColor: theme.pixelBorder },
                ]}
              >
                <Text style={[styles.bubbleText, { color: msg.role === 'user' ? '#fff' : theme.text }]}>
                  {msg.content}
                </Text>
              </View>
            )}

            {/* Review action buttons */}
            {msg.reviewData && (
              <View style={styles.reviewActions}>
                <PixelButton
                  title="[生成明日计划]"
                  onPress={() => handleSend('帮我根据刚才的复盘生成明天的计划')}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
                <PixelButton
                  title="[查看详情]"
                  onPress={() => handleSend('帮我查看今天所有任务的完成情况')}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
                <PixelButton
                  title="[不用提醒]"
                  onPress={() => addMessage({ id: Date.now().toString(36), role: 'assistant', type: 'text', content: '好的，已跳过本次复盘提醒。', timestamp: Date.now() })}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
              </View>
            )}

            {/* Confirmation card for pending actions */}
            {msg.actions && msg.actions.length > 0 && pendingActions === msg.actions && (
              <ConfirmCard
                actions={msg.actions}
                onConfirm={handleConfirm}
                onCancel={handleCancelActions}
                executing={chatState === 'executing'}
              />
            )}
          </View>
          </AnimatedMessage>
        ))}
      </ScrollView>

      {/* Status banner */}
      <StatusBanner state={chatState} />

      {/* Bottom input bar */}
      <BottomInputBar
        input={input}
        onChangeText={setInput}
        onSend={() => handleSend()}
        onVoicePress={handleVoicePress}
        onCameraPress={handleCameraPress}
        disabled={chatState === 'thinking' || chatState === 'executing'}
        listening={listening}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 2,
  },
  heading: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700' },
  subheading: { fontFamily: 'monospace', fontSize: 11 },
  settingsBtn: { padding: 6 },
  chatArea: { flex: 1 },
  bubble: { borderWidth: 2, padding: 10, marginBottom: 8, maxWidth: '85%' },
  userBubble: { backgroundColor: '#4a90d9', alignSelf: 'flex-end' },
  asstBubble: { backgroundColor: '#fff', alignSelf: 'flex-start' },
  bubbleText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 18 },
  reviewActions: { flexDirection: 'row', gap: 6, marginBottom: 8, paddingHorizontal: 4 },
});
