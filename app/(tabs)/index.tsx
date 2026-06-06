import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, AppState } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Task, AIParseResult } from '../../types';
import { loadTasks, addTask, toggleComplete, deleteTask, updateTask } from '../../services/storage';
import { scheduleTaskReminder, cancelTaskReminder } from '../../services/notification';
import { parseTask, generateBriefing, suggestTasks, multiIntent } from '../../services/ai';
import { getApiKey } from '../../services/ai-config';
import { useTheme } from '../../services/theme-context';
import { AIAction } from '../../services/ai-types';
import { toast } from '../../components/Toast';
import TaskCard from '../../components/TaskCard';
import InputBar from '../../components/InputBar';
import ConfirmSheet from '../../components/ConfirmSheet';
import Toast from '../../components/Toast';

export default function TodayScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [briefing, setBriefing] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [aiResult, setAiResult] = useState<AIParseResult | null>(null);
  const [noKey, setNoKey] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [briefingCollapsed, setBriefingCollapsed] = useState(true);

  const refresh = useCallback(async () => {
    const all = await loadTasks();
    const today = new Date().toISOString().slice(0, 10);
    setTasks(all.filter(t => t.datetime.startsWith(today)));
  }, []);

  const loadBriefing = useCallback(async () => {
    setBriefingLoading(true);
    const all = await loadTasks();
    const today = new Date().toISOString().slice(0, 10);
    const todayTasks = all.filter(t => t.datetime.startsWith(today));
    const text = await generateBriefing(todayTasks);
    setBriefing(text);
    setBriefingLoading(false);
    const sug = await suggestTasks(all);
    setSuggestion(sug);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); loadBriefing(); }, []));

  useEffect(() => {
    getApiKey().then(k => setNoKey(!k));
    refresh(); loadBriefing();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') { refresh(); loadBriefing(); } });
    return () => sub.remove();
  }, []);

  const executeActions = useCallback(async (actions: AIAction[], fallbackText: string) => {
    for (const act of actions) {
      try {
        switch (act.action) {
          case 'create': {
            const parsed: AIParseResult = {
              title: act.title || fallbackText,
              datetime: act.datetime || null,
              priority: act.priority || '中',
              recurring: act.recurring || 'none',
              category: act.category || '其他',
              notes: act.notes || '',
            };
            setAiResult(parsed);
            setShowConfirm(true);
            break;
          }
          case 'complete': {
            if (act.taskId) {
              await toggleComplete(act.taskId);
              const all = await loadTasks();
              const t = all.find(t => t.id === act.taskId);
              toast(`「${t?.title || '任务'}」已完成 ✓`, 'success');
            } else if (act.filter) {
              const batchMap: Record<string, string> = { today: '今天', all: '全部' };
              const now = new Date().toISOString();
              const all = await loadTasks();
              let count = 0;
              for (const t of all) {
                if (t.completed) continue;
                const match = act.filter === 'today'
                  ? t.datetime.startsWith(now.slice(0, 10))
                  : act.filter === 'all'
                  ? true
                  : t.category === act.filter;
                if (match) { t.completed = true; t.completedAt = now; count++; }
              }
              await (await import('../../services/storage')).saveTasks(all);
              const label = batchMap[act.filter] || act.filter;
              toast(`已${act.summary || '完成' + label + '的' + count + '个任务'}`, 'success');
            }
            refresh(); loadBriefing();
            break;
          }
          case 'delete': {
            if (act.taskId) {
              const all = await loadTasks();
              const t = all.find(t => t.id === act.taskId);
              await deleteTask(act.taskId);
              await cancelTaskReminder(act.taskId);
              toast(`已删除「${t?.title || '任务'}」`, 'success');
              refresh();
            }
            break;
          }
          case 'edit': {
            if (act.taskId && act.changes) {
              await updateTask(act.taskId, act.changes);
              await cancelTaskReminder(act.taskId);
              const all = await loadTasks();
              const updated = all.find(t => t.id === act.taskId);
              if (updated && act.changes.datetime) await scheduleTaskReminder(updated);
              toast(act.summary || '已修改', 'success');
              refresh(); loadBriefing();
            }
            break;
          }
          case 'query': {
            toast(act.summary || '查询结果', 'info', 3000);
            break;
          }
          case 'help': {
            toast(act.message || '试试输入一个任务吧', 'info', 3000);
            break;
          }
        }
      } catch (e: any) {
        toast(e.message || '操作失败', 'warn');
      }
    }
  }, [refresh, loadBriefing]);

  const handleSendText = useCallback(async (text: string) => {
    try {
      const actions = await multiIntent(text);
      if (actions.length === 1 && actions[0].action === 'unknown') {
        toast(actions[0].message || '没理解您的意思，请换个说法', 'warn');
        return;
      }
      await executeActions(actions, text);
    } catch (e: any) {
      toast(e.message || 'AI 处理失败', 'warn');
    }
  }, [executeActions]);

  const handleVoiceResult = useCallback((text: string) => { handleSendText(text); }, [handleSendText]);

  const handleConfirm = useCallback(async (parsed: AIParseResult) => {
    setShowConfirm(false);
    setAiResult(null);
    try {
      const task = await addTask({
        title: parsed.title, description: parsed.notes, category: parsed.category || '其他',
        priority: parsed.priority, completed: false, recurring: parsed.recurring || 'none',
        datetime: parsed.datetime || new Date().toISOString(), source: 'text',
      });
      if (parsed.datetime) await scheduleTaskReminder(task);
      toast(`「${parsed.title}」已创建`, 'success');
      refresh(); loadBriefing();
    } catch (e: any) { toast('保存失败: ' + (e.message || ''), 'warn'); }
  }, [refresh, loadBriefing]);

  const handleToggle = useCallback(async (id: string) => { await toggleComplete(id); refresh(); }, [refresh]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.headerWrap}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>今日任务</Text>
      </View>

      {noKey ? (
        <TouchableOpacity style={styles.setupBanner}
          onPress={() => router.push('/(tabs)/settings')} activeOpacity={0.7}>
          <Text style={styles.setupBannerText}>⚙️ 尚未配置 DeepSeek API Key，点此前往设置</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={[styles.briefingCard, { backgroundColor: theme.card }]}
        onPress={() => setBriefingCollapsed(!briefingCollapsed)} activeOpacity={0.7}>
        <Text style={[styles.briefingText, { color: theme.text }]} numberOfLines={briefingCollapsed ? 1 : 3}>
          {briefingLoading ? '加载中…' : briefing}
        </Text>
        <Text style={[styles.briefingToggle, { color: theme.primary }]}>
          {briefingCollapsed ? '展开' : '收起'}
        </Text>
      </TouchableOpacity>

      {suggestion ? (
        <View style={[styles.suggestionCard, { backgroundColor: theme.success + '15' }]}>
          <Text style={[styles.suggestionText, { color: theme.success }]}>{suggestion}</Text>
        </View>
      ) : null}

      <FlatList
        data={tasks.filter(t => !t.completed)}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TaskCard task={item} onToggle={handleToggle} onLongPress={refresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.textLight }]}>今日暂无任务</Text>
            <Text style={[styles.emptyHint, { color: theme.textMuted }]}>在下方输入新任务，或点💬跟AI聊天</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={[styles.chatFab, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/chat')}>
        <Text style={styles.chatFabText}>💬</Text>
      </TouchableOpacity>

      <ConfirmSheet visible={showConfirm} result={aiResult}
        onConfirm={handleConfirm}
        onCancel={() => { setShowConfirm(false); setAiResult(null); }}
        onReparse={handleSendText} />

      <InputBar onSendText={handleSendText} onVoiceResult={handleVoiceResult} />

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  setupBanner: {
    backgroundColor: '#FFF3E0', borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 16,
    marginHorizontal: 16, marginBottom: 8,
  },
  setupBannerText: { fontSize: 13, fontWeight: '600', color: '#E67E22' },
  briefingCard: {
    borderRadius: 20, padding: 20,
    marginHorizontal: 16, marginBottom: 8,
    elevation: 3,
    shadowColor: '#7C5CFC', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  briefingText: { fontSize: 15, lineHeight: 22 },
  briefingToggle: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  suggestionCard: {
    borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16,
    marginHorizontal: 16, marginBottom: 8,
  },
  suggestionText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  list: { flexGrow: 1, paddingBottom: 8 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyHint: { fontSize: 13, marginTop: 6 },
  chatFab: {
    position: 'absolute', bottom: 72, right: 16,
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: '#7C5CFC', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  chatFabText: { fontSize: 22 },
});
