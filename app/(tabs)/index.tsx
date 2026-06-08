import { View, Text, FlatList, StyleSheet, AppState, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { Task, AIParseResult } from '../../types';
import { loadTasks, addTask, updateTask, deleteTask, toggleComplete, findTaskByTitle, batchComplete, saveCapture, saveReminder, saveMemory, saveReflection, saveBlocker, loadReflectionByDate } from '../../services/storage';
import { scheduleTaskReminder } from '../../services/notification';
import { multiIntent, generateBriefing, generateDailyReview } from '../../services/ai';
import { getApiKey } from '../../services/ai-config';
import { useTheme } from '../../services/theme-context';
import { AIAction, AIError } from '../../services/ai-types';
import { recognizeText } from '../../services/ocr';
import {
  InteractionState,
  getErrorMessage,
  INPUT_HINT_IDLE,
} from '../../constants/interaction';
import Toast, { toast } from '../../components/Toast';
import InputBar from '../../components/InputBar';
import ChatBubble, { ChatMessage, generateId } from '../../components/ChatBubble';
import PixelAvatar from '../../components/PixelAvatar';
import { startNetworkMonitor, stopNetworkMonitor, checkNetwork } from '../../services/network';

export default function TodayScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const [noKey, setNoKey] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Check API key + network on mount
  useEffect(() => {
    getApiKey().then((k) => setNoKey(!k));
    checkNetwork().then((online) => setIsOffline(!online));
    startNetworkMonitor((connected) => {
      if (!connected && !isOffline) {
        toast('网络已断开，部分功能可能不可用', 'warn');
      }
      setIsOffline(!connected);
    });
    AppState.addEventListener('change', (s) => {
      if (s === 'active') getApiKey().then((k) => setNoKey(!k));
    });
    return () => stopNetworkMonitor();
  }, []);

  // Auto-recover from stuck states (timeout safeguard)
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const busyStates: InteractionState[] = ['listening', 'transcribing', 'capturing', 'recognizing', 'sending', 'thinking', 'executing'];
    if (busyStates.includes(interactionState)) {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
      stateTimerRef.current = setTimeout(() => {
        setInteractionState('idle');
      }, 15000);
    } else {
      if (stateTimerRef.current) {
        clearTimeout(stateTimerRef.current);
        stateTimerRef.current = null;
      }
    }
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    };
  }, [interactionState]);

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

    // P1-1: 主动推复盘 — 检查昨天的完成任务，生成回顾
    try {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const yesterdayReflection = await loadReflectionByDate(yesterday);
      const yesterdayTasks = all.filter(t => t.datetime.startsWith(yesterday));
      const yesterdayCompleted = yesterdayTasks.filter(t => t.completed);
      const yesterdayPlanned = yesterdayTasks.filter(t => !t.completed || t.completed);

      if (yesterdayTasks.length > 0 && !yesterdayReflection) {
        // 有昨日任务但未生成复盘，AI 主动推
        const rate = yesterdayPlanned.length > 0
          ? Math.round((yesterdayCompleted.length / yesterdayPlanned.length) * 100)
          : 0;
        const overdueFromYesterday = yesterdayTasks.filter(t => !t.completed && t.datetime < new Date().toISOString());
        const blockersFromYesterday = yesterdayTasks
          .filter(t => !t.completed && t.current_blocker_reason)
          .map(t => `「${t.title}」：${t.current_blocker_reason}`);

        let reviewContent = `📊 回顾昨天：计划 ${yesterdayPlanned.length} 件，完成 ${yesterdayCompleted.length} 件`;
        if (rate < 50) {
          reviewContent += `，完成率 ${rate}%。`;
        } else if (rate < 80) {
          reviewContent += `，完成率 ${rate}%。还可以再提高哦。`;
        } else {
          reviewContent += `，完成率 ${rate}%，不错！`;
        }

        if (blockersFromYesterday.length > 0) {
          reviewContent += `\n\n未完成原因：\n${blockersFromYesterday.join('\n')}`;
        }

        if (overdueFromYesterday.length > 0) {
          reviewContent += `\n\n还有 ${overdueFromYesterday.length} 件昨天未完成的任务，要看看怎么安排吗？`;
        }

        msgs.push({
          id: generateId(),
          role: 'assistant',
          kind: 'text',
          content: reviewContent,
          timestamp: Date.now(),
        });
      } else if (yesterdayReflection) {
        // 已有复盘记录，简洁展示
        let reviewContent = `📊 ${yesterdayReflection.ai_summary || `昨天完成 ${yesterdayReflection.completed_count}/${yesterdayReflection.planned_count} 件`}`;
        if (yesterdayReflection.ai_suggestion) {
          reviewContent += `\n\n💡 ${yesterdayReflection.ai_suggestion}`;
        }
        msgs.push({
          id: generateId(),
          role: 'assistant',
          kind: 'text',
          content: reviewContent,
          timestamp: Date.now(),
        });
      }
    } catch {
      // 复盘加载失败不阻塞
    }

    // Auto-push: evening daily review (after 6pm)
    try {
      const currentHour = new Date().getHours();
      if (currentHour >= 18) {
        const todayTasksForReview = all.filter(t => t.datetime.startsWith(today));
        const completedToday = todayTasksForReview.filter(t => t.completed).length;
        if (todayTasksForReview.length > 0 && completedToday > 0) {
          const existingReflection = await loadReflectionByDate(today).catch(() => null);
          if (!existingReflection) {
            const review = await generateDailyReview(all, today);
            const reviewMsg: ChatMessage = {
              id: generateId(),
              role: 'assistant',
              kind: 'card',
              content: `📊 今日回顾：完成 ${review.completion_rate}%`,
              cardData: {
                title: '📊 今日自动回顾',
                items: [
                  { label: '完成率', value: `${review.completion_rate}%` },
                  { label: '总结', value: review.ai_summary },
                  { label: '建议', value: review.ai_suggestion },
                ],
                actions: [
                  { label: '知道了', key: 'dismiss', style: 'secondary' },
                ],
              },
              timestamp: Date.now(),
            };
            msgs.push(reviewMsg);
            // Save the review
            await saveReflection({
              date: today,
              planned_count: todayTasksForReview.length,
              completed_count: completedToday,
              completion_rate: review.completion_rate,
              overdue_count: todayTasksForReview.filter(t => !t.completed).length,
              main_blockers_json: JSON.stringify([]),
              ai_summary: review.ai_summary,
              ai_suggestion: review.ai_suggestion,
            });
          }
        }
      }
    } catch {
      // Evening review failure not blocking
    }

    // P1-2: 主动问原因 — 检查逾期未完成的任务
    try {
      const now = new Date().toISOString();
      const overdueTasks = all.filter(t => {
        if (t.completed) return false;
        // 逾期：planned_at 在今天之前且未完成
        if (t.datetime && t.datetime < now) {
          const taskDate = t.datetime.slice(0, 10);
          // 排除今天的（今天还没过完）
          return taskDate < today;
        }
        return false;
      });

      // 只提示逾期超过半天的，以免刚逾期的任务打扰用户
      const seriousOverdue = overdueTasks.filter(t => {
        const taskDate = new Date(t.datetime);
        const hoursAgo = (Date.now() - taskDate.getTime()) / 3600000;
        return hoursAgo > 4;
      });

      if (seriousOverdue.length > 0) {
        const oldest3 = seriousOverdue.slice(0, 3);
        const items = oldest3.map((t, i) => ({
          label: `${i + 1}.`,
          value: `${t.title}（原定 ${formatDateTime(t.datetime)}）`,
        }));
        msgs.push({
          id: generateId(),
          role: 'assistant',
          kind: 'card',
          content: `有 ${seriousOverdue.length} 个逾期任务需要关注，方便告诉我原因吗？我帮你重新安排。`,
          cardData: {
            title: '⏰ 逾期待处理',
            items,
            actions: [
              { label: '说明原因', key: 'edit', style: 'primary' },
              { label: '重新安排', key: 'view_all', style: 'secondary' },
              { label: '稍后处理', key: 'dismiss', style: 'danger' },
            ],
          },
          timestamp: Date.now(),
        });
      }
    } catch {
      // 逾期加载失败不阻塞
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
        const errorType = e instanceof AIError ? e.errorType : 'network';
        const errMsg: ChatMessage = {
          id: generateId(),
          role: 'system',
          kind: 'error',
          content: getErrorMessage(errorType, e.message || ''),
          timestamp: Date.now(),
          errorRetryable: errorType !== 'api_key_missing',
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

        // Convert image URI to base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Call real OCR service
        const ocrResult = await recognizeText(base64);

        if (!ocrResult.text || ocrResult.confidence < 0.3) {
          const errMsg: ChatMessage = {
            id: generateId(),
            role: 'system',
            kind: 'error',
            content: '图片识别失败，请确认图片清晰后重试',
            timestamp: Date.now(),
            errorRetryable: true,
          };
          setMessages((prev) => [...prev, errMsg]);
          setInteractionState('error');
          return;
        }

        // Save capture record
        await saveCapture({
          type: 'photo',
          ocr_text: ocrResult.text,
          image_uri: imageUri,
        });

        // Show OCR result for user confirmation
        const cardMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          kind: 'card',
          content: '识别到以下文字，需要创建任务吗？',
          cardData: {
            title: '📷 OCR 识别结果',
            items: [
              { label: '文字', value: ocrResult.text },
              { label: '置信度', value: `${Math.round(ocrResult.confidence * 100)}%` },
            ],
            actions: [
              { label: '创建任务', key: 'confirm', style: 'primary' },
              { label: '修改', key: 'edit', style: 'secondary' },
              { label: '保留为备忘', key: 'dismiss', style: 'secondary' },
            ],
            context: JSON.stringify({ action: 'create', title: ocrResult.text, source: 'photo' }),
          },
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, cardMsg]);
        setInteractionState('action_pending');
      } catch (e: any) {
        const errorType = e instanceof AIError ? e.errorType : 'ocr';
        const errMsg: ChatMessage = {
          id: generateId(),
          role: 'system',
          kind: 'error',
          content: getErrorMessage(errorType, e.message || ''),
          timestamp: Date.now(),
          errorRetryable: errorType !== 'api_key_missing',
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
        await saveCapture({ type: 'text', raw_text: act.title });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `✅ 已创建：「${task.title}」` }
              : m
          )
        );
        toast(`「${task.title}」已创建`, 'success');
        break;
      }
      case 'edit': {
        let editTask: Task | null = null;
        if (act.taskId) {
          editTask = await updateTask(act.taskId, act.changes);
        }
        if (!editTask && act.changes.title) {
          editTask = await findTaskByTitle(act.changes.title);
          if (editTask) editTask = await updateTask(editTask.id, act.changes);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `✅ ${act.summary || '已修改'}` }
              : m
          )
        );
        toast('任务已修改', 'success');
        break;
      }
      case 'delete': {
        if (act.taskId) {
          await deleteTask(act.taskId);
        } else if (act.filter === 'completed') {
          const all = await loadTasks();
          const completed = all.filter(t => t.completed);
          for (const t of completed) await deleteTask(t.id);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `✅ ${act.summary || '已删除'}` }
              : m
          )
        );
        toast('任务已删除', 'success');
        break;
      }
      case 'complete': {
        if (act.taskId) {
          await toggleComplete(act.taskId);
          // Check if all today's tasks are done — auto-push congratulations
          try {
            const all = await loadTasks();
            const today = new Date().toISOString().slice(0, 10);
            const todayTasks = all.filter((t: Task) => t.datetime.startsWith(today));
            const remaining = todayTasks.filter((t: Task) => !t.completed);
            if (todayTasks.length > 0 && remaining.length === 0) {
              const currentHour = new Date().getHours();
              const greeting = currentHour < 12 ? '上午' : currentHour < 18 ? '下午' : '晚上';
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  role: 'assistant',
                  kind: 'text',
                  content: `🎉 ${greeting}的任务都完成了！今天完成了 ${todayTasks.length} 件事。`,
                  timestamp: Date.now(),
                },
              ]);
            }
          } catch {}
        } else if (act.filter === 'today') {
          const done = await batchComplete('today');
          act.summary = `完成了今天的 ${done} 个任务`;
        } else if (act.filter === 'all') {
          const done = await batchComplete('all');
          act.summary = `完成了全部 ${done} 个任务`;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `✅ ${act.summary || '已完成'}` }
              : m
          )
        );
        toast(act.summary || '任务已完成', 'success');
        break;
      }
      case 'snooze': {
        const taskId = message.cardData?.related_task_id;
        const taskTitle = message.cardData?.title || '待办事项';
        // 弹出选项让用户选择延后时间
        const snoozeOptions = [
          { label: '5 分钟', minutes: 5 },
          { label: '10 分钟', minutes: 10 },
          { label: '30 分钟', minutes: 30 },
          { label: '1 小时', minutes: 60 },
          { label: '2 小时', minutes: 120 },
          { label: '明天早上', minutes: null }, // will calculate
        ];
        const optionLabels = snoozeOptions.map(o => o.label);
        Alert.alert('延后提醒', `「${taskTitle}」何时再提醒？`, [
          ...snoozeOptions.map((opt, i) => ({
            text: opt.label,
            onPress: async () => {
              if (!taskId) { toast('无法延后：任务 ID 为空', 'warn'); return; }
              const now = Date.now();
              let minutes = opt.minutes;
              if (minutes === null) {
                // "明天早上" — 计算到明天 09:00 的分钟数
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                minutes = Math.round((tomorrow.getTime() - now) / 60000);
              }
              await scheduleTaskReminder({
                id: taskId,
                datetime: new Date(now + minutes * 60000).toISOString(),
                title: taskTitle,
                description: '',
                priority: '中',
                category: '其他',
                completed: false,
                recurring: 'none',
                source: 'text',
                postponed_count: 0,
                current_blocker_reason: '',
                needs_precheck: false,
                project_name: '',
                createdAt: new Date(now).toISOString(),
                completedAt: '',
                updatedAt: new Date(now).toISOString(),
              });
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === message.id
                    ? { ...m, kind: 'text', cardData: undefined, content: `⏰ 已延后 ${Math.round(minutes / 60 * 10) / 10} 分钟提醒` }
                    : m
                )
              );
              toast(`已延后`, 'info');
            },
          })),
          { text: '取消', style: 'cancel' },
        ]);
        break;
      }
      case 'reschedule': {
        const taskId = message.cardData?.related_task_id;
        if (taskId) {
          await updateTask(taskId, { datetime: act.newDatetime } as any);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `📅 ${act.message || '已改期'}` }
              : m
          )
        );
        toast('任务已改期', 'success');
        break;
      }
      case 'query': {
        const all = await loadTasks();
        const today = all.filter(t => t.datetime?.startsWith(new Date().toISOString().slice(0, 10)));
        const overdue = all.filter(t => !t.completed && t.datetime < new Date().toISOString());
        const summary = `你共有 ${all.length} 个任务，今天 ${today.length} 个，逾期 ${overdue.length} 个。${all.filter(t => !t.completed).length} 个待完成。`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `📊 ${summary}` }
              : m
          )
        );
        break;
      }
      case 'record_blocker': {
        const blocker = await saveBlocker({
          task_id: act.taskId,
          blocker_type: 'other',
          blocker_text: act.blocker_reason,
          suggested_action: act.suggested_action,
        });
        await saveMemory({
          memory_type: 'blocker',
          content: act.blocker_reason,
          source_id: act.taskId,
        });
        const reply = `📝 已记录原因：「${act.blocker_reason}」`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: reply }
              : m
          )
        );
        toast('原因已记录', 'info');
        break;
      }
      case 'create_reminder': {
        const task = await loadTasks().then(tasks => tasks.find(t => t.id === act.taskId));
        if (task) {
          await scheduleTaskReminder({
            ...task,
            datetime: act.remind_at,
            title: task.title,
          });
          await saveReminder({
            task_id: act.taskId,
            remind_at: act.remind_at,
            remind_type: act.remind_type,
          });
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `🔔 ${act.message || '提醒已设置'}` }
              : m
          )
        );
        toast('提醒已创建', 'success');
        break;
      }
      case 'create_memory': {
        await saveMemory({
          memory_type: act.memory_type,
          content: act.content,
          source_id: act.source_id,
          user_confirmed: true,
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `🧠 已记住：${act.content}` }
              : m
          )
        );
        toast('已记录到知识库', 'success');
        break;
      }
      case 'generate_review': {
        const reflection = await saveReflection({
          date: act.date,
          planned_count: act.planned_count,
          completed_count: act.completed_count,
          completion_rate: act.completion_rate,
          overdue_count: act.overdue_count,
          main_blockers_json: act.main_blockers_json,
          ai_summary: act.ai_summary,
          ai_suggestion: act.ai_suggestion,
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'card', cardData: {
                  title: '📊 今日复盘',
                  items: [
                    { label: '完成情况', value: `${act.completed_count}/${act.planned_count}` },
                    { label: '完成率', value: `${Math.round(act.completion_rate * 100)}%` },
                    { label: '逾期', value: `${act.overdue_count} 个` },
                  ],
                  actions: [
                    { label: '生成明日计划', key: 'view_all', style: 'secondary' },
                    { label: '知道了', key: 'dismiss', style: 'secondary' },
                  ],
                }, content: act.ai_summary }
              : m
          )
        );
        break;
      }
      case 'create_plan': {
        let createdCount = 0;
        for (const t of act.tasks) {
          const task = await addTask({
            title: t.title,
            description: t.notes || '',
            category: '其他',
            priority: t.priority || '中',
            completed: false,
            recurring: 'none',
            datetime: t.datetime || new Date().toISOString(),
            source: 'ai',
            postponed_count: 0,
            current_blocker_reason: '',
            needs_precheck: false,
            project_name: '',
          });
          if (t.datetime) await scheduleTaskReminder(task);
          createdCount++;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: `✅ 已创建 ${createdCount} 个任务：${act.summary}` }
              : m
          )
        );
        toast(`已创建 ${createdCount} 个任务`, 'success');
        break;
      }
      default: {
        const reply = act.action === 'help'
          ? `💡 ${(act as any).message || '我是你的 AI 助理，可以帮你创建任务、设置提醒、记录事项、复盘工作。试试说"明天下午三点提醒我开会"。'}`
          : act.action === 'unknown'
            ? `🤔 ${(act as any).message || '我没理解你的意思，可以换个说法吗？'}`
            : `✅ 已执行`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, kind: 'text', cardData: undefined, content: reply }
              : m
          )
        );
      }
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <PixelAvatar size={24} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>语拍提醒</Text>
        </View>
        <Text style={[styles.headerStatus, { color: noKey ? theme.danger : isOffline ? theme.warning : theme.success }]}>
          {noKey ? 'API 未配置' : isOffline ? '离线' : '在线'}
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
        keyboardShouldPersistTaps="handled"
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
    backgroundColor: '#F8F8F8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '700',
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
  emptyText: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  stateBar: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  stateText: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
});