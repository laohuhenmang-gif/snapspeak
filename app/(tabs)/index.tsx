import { View, Text, FlatList, StyleSheet, AppState, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Task, AIParseResult } from '../../types';
import { loadTasks, addTask, toggleComplete } from '../../services/storage';
import { scheduleTaskReminder } from '../../services/notification';
import { multiIntent, generateBriefing } from '../../services/ai';
import { getApiKey } from '../../services/ai-config';
import { useTheme } from '../../services/theme-context';
import { AIAction } from '../../services/ai-types';
import {
  InteractionState,
  getErrorMessage,
  INPUT_HINT_IDLE,
} from '../../constants/interaction';
import { toast } from '../../components/Toast';
import InputBar from '../../components/InputBar';
import ChatBubble, { ChatMessage, generateId } from '../../components/ChatBubble';
import Toast from '../../components/Toast';

export default function TodayScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const [noKey, setNoKey] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Check API key on mount
  useEffect(() => {
    getApiKey().then((k) => setNoKey(!k));
    AppState.addEventListener('change', (s) => {
      if (s === 'active') getApiKey().then((k) => setNoKey(!k));
    });
  }, []);

  // Load greeting and today's tasks on focus
  useFocusEffect(
    useCallback(() => {
      loadInitialMessages();
    }, [])
  );

  const loadInitialMessages = async () => {
    const all = await loadTasks();
    const today = new Date().toISOString().slice(0, 10);
    const todayTasks = all.filter((t) => t.datetime.startsWith(today) && !t.completed);

    const msgs: ChatMessage[] = [];

    // AI greeting
    if (todayTasks.length > 0) {
      const briefing = await generateBriefing(todayTasks);
      msgs.push({
        id: generateId(),
        role: 'assistant',
        kind: 'text',
        content: briefing,
        timestamp: Date.now(),
      });

      // Today task summary card
      msgs.push({
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: `今天有 ${todayTasks.length} 件重要事项`,
        cardData: {
          title: '📋 今日任务摘要',
          items: todayTasks.slice(0, 6).map((t, i) => ({
            label: `${i + 1}.`,
            value: t.title,
          })),
          actions: [
            { label: '查看全部', key: 'view_all', style: 'secondary' },
          ],
        },
        timestamp: Date.now(),
      });
    } else {
      msgs.push({
        id: generateId(),
        role: 'assistant',
        kind: 'text',
        content: '早上好！我是你的个人 AI 工作助理。\n\n你可以直接告诉我需要做什么，我会帮你记录、提醒和规划。\n\n试试说：\n• "明天下午三点提醒我开会"\n• "帮我记一下，周三前交报告"\n• 或者拍照识别白板上的事项',
        timestamp: Date.now(),
      });
    }

    // API key warning
    const key = await getApiKey();
    if (!key) {
      msgs.push({
        id: generateId(),
        role: 'system',
        kind: 'error',
        content: '⚠️ 尚未配置 DeepSeek API Key，AI 功能暂不可用。请前往「设置」页面配置。',
        timestamp: Date.now(),
        errorRetryable: false,
      });
      setNoKey(true);
    }

    setMessages(msgs);
    scrollToBottom();
  };

  const isBusy = (s: InteractionState) =>
    s === 'listening' || s === 'transcribing' || s === 'capturing' || s === 'recognizing' ||
    s === 'sending' || s === 'thinking' || s === 'executing';

  // Handle text send
  const handleSendText = useCallback(
    async (text: string) => {
      if (isBusy(interactionState)) return;
      setInteractionState('sending');

      // Add user message
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        kind: 'text',
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      scrollToBottom();

      try {
        const key = await getApiKey();
        if (!key) {
          setNoKey(true);
          const errMsg: ChatMessage = {
            id: generateId(),
            role: 'system',
            kind: 'error',
            content: getErrorMessage('no_key'),
            timestamp: Date.now(),
            errorRetryable: false,
          };
          setMessages((prev) => [...prev, errMsg]);
          setInteractionState('error');
          return;
        }
        setNoKey(false);

        setInteractionState('thinking');

        const actions = await multiIntent(text);

        if (actions.length === 1 && actions[0].action === 'unknown') {
          const errMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            kind: 'text',
            content: actions[0].message || '抱歉，我没理解你的意思，可以换个说法吗？',
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errMsg]);
          setInteractionState('idle');
          return;
        }

        // Generate confirm cards for each action
        for (const act of actions) {
          const cardMsg = actionToCardMessage(act, text);
          setMessages((prev) => [...prev, cardMsg]);
        }

        setInteractionState('action_pending');
      } catch (e: any) {
        const errMsg: ChatMessage = {
          id: generateId(),
          role: 'system',
          kind: 'error',
          content: getErrorMessage('network', e.message || ''),
          timestamp: Date.now(),
          errorRetryable: true,
        };
        setMessages((prev) => [...prev, errMsg]);
        setInteractionState('error');
      }
    },
    [interactionState]
  );

  // Handle image send (from camera/gallery)
  const handleSendImage = useCallback(
    async (imageUri: string) => {
      setInteractionState('capturing');

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        kind: 'image',
        content: '📷 拍摄的图片',
        imageUri,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      scrollToBottom();

      try {
        const key = await getApiKey();
        if (!key) {
          setNoKey(true);
          const errMsg: ChatMessage = {
            id: generateId(),
            role: 'system',
            kind: 'error',
            content: getErrorMessage('no_key'),
            timestamp: Date.now(),
            errorRetryable: false,
          };
          setMessages((prev) => [...prev, errMsg]);
          setInteractionState('error');
          return;
        }

        setInteractionState('recognizing');

        // TODO: Call real OCR + AI extraction
        // For now, show a placeholder card
        const cardMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          kind: 'card',
          content: '正在识别图片内容…',
          cardData: {
            title: '📷 OCR 识别',
            items: [{ label: '状态', value: 'OCR 引擎正在升级中，请先用文字或语音输入' }],
            actions: [{ label: '知道了', key: 'dismiss', style: 'secondary' }],
          },
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, cardMsg]);
        setInteractionState('action_pending');
      } catch (e: any) {
        const errMsg: ChatMessage = {
          id: generateId(),
          role: 'system',
          kind: 'error',
          content: getErrorMessage('ocr', e.message || ''),
          timestamp: Date.now(),
          errorRetryable: true,
        };
        setMessages((prev) => [...prev, errMsg]);
        setInteractionState('error');
      }
    },
    []
  );

  // Handle voice result
  const handleVoiceResult = useCallback(
    (text: string) => {
      handleSendText(text);
    },
    [handleSendText]
  );

  // Handle card action (confirm/edit/cancel/etc.)
  const handleCardAction = useCallback(
    async (actionKey: string, message: ChatMessage) => {
      if (!message.cardData) return;

      if (actionKey === 'dismiss' || actionKey === 'cancel') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: '已取消' }
              : m
          )
        );
        setInteractionState('idle');
        return;
      }

      if (actionKey === 'view_all') {
        router.push('/(tabs)/tasks');
        return;
      }

      if (actionKey === 'confirm') {
        setInteractionState('executing');

        try {
          const context = message.cardData.context;
          if (!context) {
            // Simple create from card items
            const title = message.cardData.items?.[0]?.value || message.content;
            const parsed: AIParseResult = {
              title,
              datetime: null,
              priority: '中',
              recurring: 'none',
              category: '其他',
              notes: '',
            };

            const dateMatch = message.content.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})/);
            if (dateMatch) parsed.datetime = dateMatch[1];

            const task = await addTask({
              title: parsed.title,
              description: parsed.notes,
              category: parsed.category,
              priority: parsed.priority,
              completed: false,
              recurring: parsed.recurring,
              datetime: parsed.datetime || new Date().toISOString(),
              source: 'text',
              postponed_count: 0,
              current_blocker_reason: '',
              needs_precheck: false,
              project_name: '',
            });

            if (parsed.datetime) await scheduleTaskReminder(task);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === message.id
                  ? { ...m, kind: 'text', cardData: undefined, content: `✅ 已创建任务：「${parsed.title}」` }
                  : m
              )
            );

            toast(`「${parsed.title}」已创建`, 'success');
          } else {
            try {
              const action: AIAction = JSON.parse(context);
              await executeSingleAction(action, message);
            } catch {
              toast('执行失败，数据格式错误', 'warn');
              setInteractionState('error');
              return;
            }
          }

          setInteractionState('success');
          setTimeout(() => setInteractionState('idle'), 2000);
        } catch (e: any) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === message.id
                ? { ...m, kind: 'error', cardData: undefined, content: `❌ 操作失败: ${e.message || '未知错误'}`, errorRetryable: true }
                : m
            )
          );
          setInteractionState('error');
        }
        return;
      }

      if (actionKey === 'edit') {
        const editMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          kind: 'text',
          content: '好的，请重新输入修改后的内容。',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, editMsg]);
        setInteractionState('idle');
        return;
      }

      setInteractionState('idle');
    },
    []
  );

  const executeSingleAction = useCallback(async (act: AIAction, message: ChatMessage) => {
    switch (act.action) {
      case 'create': {
        const task = await addTask({
          title: act.title || '未命名任务',
          description: act.notes || '',
          category: act.category || '其他',
          priority: act.priority || '中',
          completed: false,
          recurring: act.recurring || 'none',
          datetime: act.datetime || new Date().toISOString(),
          source: 'text',
          postponed_count: 0,
          current_blocker_reason: '',
          needs_precheck: false,
          project_name: '',
        });
        if (act.datetime) await scheduleTaskReminder(task);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `✅ 已创建：「${task.title}」` }
              : m
          )
        );
        break;
      }
      case 'complete': {
        if (act.taskId) {
          await toggleComplete(act.taskId);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `✅ ${act.summary || '已完成'}` }
              : m
          )
        );
        break;
      }
      default:
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `✅ 已执行` }
              : m
          )
        );
    }
  }, []);

  // Handle retry
  const handleRetry = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      setInteractionState('idle');
      toast('请重新输入或检查网络', 'info');
    },
    []
  );

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    scrollToBottom();
  }, []);

  const stateLabel = (s: InteractionState): string => {
    switch (s) {
      case 'listening': return '🎤 正在听你说…';
      case 'transcribing': return '📝 识别中…';
      case 'capturing': return '📷 拍照中…';
      case 'recognizing': return '🔍 识别图片中…';
      case 'sending': return '📤 发送中…';
      case 'thinking': return '🤔 AI 思考中…';
      case 'executing': return '⚡ 执行中…';
      case 'error': return '❌ 出错了';
      case 'success': return '✅ 完成';
      default: return '';
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>语拍提醒 · AI 助理</Text>
        <Text style={[styles.headerStatus, { color: noKey ? theme.danger : theme.success }]}>
          {noKey ? '⚠️ API 未配置' : '● 在线'}
        </Text>
      </View>

      {/* Chat message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble
            message={item}
            onCardAction={handleCardAction}
            onRetry={handleRetry}
          />
        )}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>
              加载中…
            </Text>
          </View>
        }
        onLayout={scrollToBottom}
      />

      {/* Interaction state indicator */}
      {interactionState !== 'idle' && interactionState !== 'action_pending' && (
        <View style={[styles.stateBar, { backgroundColor: theme.card }]}>
          <Text style={[styles.stateText, { color: theme.textLight }]}>
            {stateLabel(interactionState)}
          </Text>
        </View>
      )}

      {/* Bottom Input Bar */}
      <InputBar
        onSendText={handleSendText}
        onVoiceResult={handleVoiceResult}
        onCameraResult={handleSendImage}
        state={interactionState}
        onStateChange={setInteractionState}
      />

      <Toast />
    </KeyboardAvoidingView>
  );
}

// Helper to convert AIAction to a ChatMessage with confirm card
function actionToCardMessage(act: AIAction, fallbackText: string): ChatMessage {
  switch (act.action) {
    case 'create':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: '我理解为一条任务/提醒：',
        cardData: {
          title: '📝 创建任务',
          items: [
            { label: '事项', value: act.title || fallbackText },
            { label: '时间', value: act.datetime ? formatDateTime(act.datetime) : '未指定' },
            { label: '优先级', value: act.priority || '中' },
            { label: '分类', value: act.category || '其他' },
            ...(act.notes ? [{ label: '备注', value: act.notes }] : []),
          ],
          actions: [
            { label: '确认创建', key: 'confirm', style: 'primary' },
            { label: '修改', key: 'edit', style: 'secondary' },
            { label: '取消', key: 'cancel', style: 'danger' },
          ],
          context: JSON.stringify(act),
        },
        timestamp: Date.now(),
      };

    case 'complete':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: act.summary || '确认完成这个任务？',
        cardData: {
          title: '✅ 完成任务',
          items: act.taskId ? [{ label: '任务', value: act.taskId }] : [],
          actions: [
            { label: '确认完成', key: 'confirm', style: 'primary' },
            { label: '取消', key: 'cancel', style: 'danger' },
          ],
          context: JSON.stringify(act),
        },
        timestamp: Date.now(),
      };

    case 'delete':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: '确认删除这个任务？此操作不可撤回。',
        cardData: {
          title: '🗑️ 删除任务',
          items: act.taskId ? [{ label: '任务', value: act.taskId }] : [],
          actions: [
            { label: '确认删除', key: 'confirm', style: 'danger' },
            { label: '取消', key: 'cancel', style: 'secondary' },
          ],
          context: JSON.stringify(act),
        },
        timestamp: Date.now(),
      };

    case 'edit':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: act.summary || '确认修改？',
        cardData: {
          title: '✏️ 修改任务',
          items: act.changes
            ? Object.entries(act.changes).map(([k, v]) => ({ label: k, value: String(v) }))
            : [],
          actions: [
            { label: '确认修改', key: 'confirm', style: 'primary' },
            { label: '取消', key: 'cancel', style: 'danger' },
          ],
          context: JSON.stringify(act),
        },
        timestamp: Date.now(),
      };

    case 'record_blocker':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: '记录未完成原因并重新计划？',
        cardData: {
          title: '🔴 记录卡点',
          items: [
            { label: '原因', value: act.blocker_reason || '未指定' },
            ...(act.suggested_action ? [{ label: '建议', value: act.suggested_action }] : []),
          ],
          actions: [
            { label: '记录并重排', key: 'confirm', style: 'primary' },
            { label: '只记录原因', key: 'edit', style: 'secondary' },
            { label: '稍后再说', key: 'cancel', style: 'danger' },
          ],
          context: JSON.stringify(act),
        },
        timestamp: Date.now(),
      };

    case 'query':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'text',
        content: act.summary || '查询结果',
        timestamp: Date.now(),
      };

    case 'help':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'text',
        content: '你可以直接告诉我需要做什么，例如：\n• "明天下午三点提醒我开会"\n• "帮我记一下周三前交报告"\n• "今天有什么任务？"',
        timestamp: Date.now(),
      };

    case 'create_reminder':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: act.message || '创建提醒？',
        cardData: {
          title: '⏰ 创建提醒',
          items: [
            { label: '任务', value: act.taskId },
            { label: '类型', value: act.remind_type },
            { label: '时间', value: act.remind_at },
          ],
          actions: [
            { label: '确认', key: 'confirm', style: 'primary' },
            { label: '取消', key: 'cancel', style: 'danger' },
          ],
          context: JSON.stringify(act),
        },
        timestamp: Date.now(),
      };

    case 'generate_review':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: `复盘：完成率 ${act.completion_rate}%`,
        cardData: {
          title: '📊 复盘总结',
          items: [
            { label: '计划', value: String(act.planned_count) },
            { label: '完成', value: String(act.completed_count) },
            { label: '完成率', value: `${act.completion_rate}%` },
            { label: '逾期', value: String(act.overdue_count) },
            { label: '分析', value: act.ai_summary },
            { label: '建议', value: act.ai_suggestion },
          ],
          actions: [
            { label: '生成明日计划', key: 'confirm', style: 'primary' },
            { label: '知道了', key: 'dismiss', style: 'secondary' },
          ],
          context: JSON.stringify(act),
        },
        timestamp: Date.now(),
      };

    case 'create_plan':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: act.summary || '这是新的计划安排：',
        cardData: {
          title: '📋 新计划',
          items: act.tasks.map((t, i) => ({
            label: `${i + 1}.`,
            value: `${t.title}${t.datetime ? ' · ' + formatDateTime(t.datetime) : ''}`,
          })),
          actions: [
            { label: '确认计划', key: 'confirm', style: 'primary' },
            { label: '调整', key: 'edit', style: 'secondary' },
            { label: '取消', key: 'cancel', style: 'danger' },
          ],
          context: JSON.stringify(act),
        },
        timestamp: Date.now(),
      };

    case 'create_memory':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'card',
        content: `我发现一条规律，要不要记住？`,
        cardData: {
          title: '🧠 知识库发现',
          items: [
            { label: '类型', value: act.memory_type },
            { label: '内容', value: act.content },
          ],
          actions: [
            { label: '记住了', key: 'confirm', style: 'primary' },
            { label: '忽略', key: 'dismiss', style: 'secondary' },
          ],
          context: JSON.stringify(act),
        },
        timestamp: Date.now(),
      };

    case 'snooze':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'text',
        content: act.message || '已延后提醒',
        timestamp: Date.now(),
      };

    case 'reschedule':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'text',
        content: act.message || '已重新安排时间',
        timestamp: Date.now(),
      };

    case 'batch':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'text',
        content: act.summary || '批量操作完成',
        timestamp: Date.now(),
      };

    case 'unknown':
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'text',
        content: act.message || '抱歉，我没理解你的意思。',
        timestamp: Date.now(),
      };

    default:
      return {
        id: generateId(),
        role: 'assistant',
        kind: 'text',
        content: '收到，我来处理。',
        timestamp: Date.now(),
      };
  }
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hour}:${min}`;
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: { fontSize: 15, fontWeight: '500', fontFamily: 'monospace' },
  stateBar: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  stateText: { fontSize: 12, fontWeight: '500', fontFamily: 'monospace' },
});