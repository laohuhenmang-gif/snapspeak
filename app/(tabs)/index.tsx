import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, AppState } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Task, AIParseResult } from '../../types';
import { loadTasks, addTask, toggleComplete } from '../../services/storage';
import { scheduleTaskReminder } from '../../services/notification';
import { parseTask, generateBriefing, suggestTasks } from '../../services/ai';
import { getApiKey } from '../../services/ai-config';
import { useTheme } from '../../services/theme-context';
import TaskCard from '../../components/TaskCard';
import InputBar from '../../components/InputBar';
import ConfirmSheet from '../../components/ConfirmSheet';

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

  const handleSendText = useCallback(async (text: string) => {
    try {
      const { parsed } = await parseTask(text);
      setAiResult(parsed);
      setShowConfirm(true);
    } catch (e: any) {
      Alert.alert('AI 解析失败', e.message || '请检查 API Key 配置或网络连接');
    }
  }, []);

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
      Alert.alert('已创建', `「${parsed.title}」`);
      refresh(); loadBriefing();
    } catch (e: any) { Alert.alert('保存失败', e.message); }
  }, [refresh, loadBriefing]);

  const handleToggle = useCallback(async (id: string) => { await toggleComplete(id); refresh(); }, [refresh]);
  const [briefingCollapsed, setBriefingCollapsed] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {noKey && (
        <TouchableOpacity style={[styles.setupBanner, { backgroundColor: theme.warning + '20' }]}
          onPress={() => router.push('/(tabs)/settings')}>
          <Text style={[styles.setupBannerText, { color: theme.warning }]}>
            ⚙️ 尚未配置 DeepSeek API Key，点此前往设置
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.briefing, { backgroundColor: theme.primary + '12' }]}
        onPress={() => setBriefingCollapsed(!briefingCollapsed)} activeOpacity={0.7}>
        <Text style={[styles.briefingText, { color: theme.text }]} numberOfLines={briefingCollapsed ? 1 : 3}>
          {briefingLoading ? '加载中…' : briefing}
        </Text>
        <Text style={[styles.briefingToggle, { color: theme.primary }]}>
          {briefingCollapsed ? '展开' : '收起'}
        </Text>
      </TouchableOpacity>

      {suggestion ? (
        <View style={[styles.suggestion, { backgroundColor: theme.success + '12' }]}>
          <Text style={[styles.suggestionText, { color: theme.success }]}>{suggestion}</Text>
        </View>
      ) : null}

      <FlatList
        data={tasks.filter(t => !t.completed)}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TaskCard task={item} onToggle={handleToggle} onLongPress={refresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>今日暂无任务</Text>
            <Text style={[styles.emptyHint, { color: theme.textMuted }]}>在下方输入新任务，或点💬跟AI聊天</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={[styles.chatFab, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/chat')}>
        <Text style={styles.chatFabText}>💬</Text>
      </TouchableOpacity>

      <ConfirmSheet
        visible={showConfirm}
        result={aiResult}
        onConfirm={handleConfirm}
        onCancel={() => { setShowConfirm(false); setAiResult(null); }}
        onReparse={handleSendText}
      />

      <InputBar onSendText={handleSendText} onVoiceResult={handleVoiceResult} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  setupBanner: { paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0' },
  setupBannerText: { fontSize: 13, fontWeight: '500' },
  briefing: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0' },
  briefingText: { fontSize: 14, lineHeight: 20 },
  briefingToggle: { fontSize: 12, marginTop: 2 },
  suggestion: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0' },
  suggestionText: { fontSize: 13, lineHeight: 18 },
  list: { flexGrow: 1, paddingBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16 },
  emptyHint: { fontSize: 13, marginTop: 4 },
  chatFab: { position: 'absolute', bottom: 64, right: 16, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  chatFabText: { fontSize: 22 },
});
