import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../services/theme-context';
import { getApiKey, setApiKey, clearApiKey, getModel, setModel, getVisionModel, setVisionModel, getProvider, setProvider, getBaseUrl, setCustomBaseUrl, getPersona, setPersona, getChatModels, getVisionModels } from '../../services/ai-config';
import type { AIProvider, ModelOption } from '../../services/ai-config';
import { exportAllData, importAllData, loadAllMemories, deleteMemory } from '../../services/storage';
import { readCrashLog, clearCrashLog, getCrashLogSize } from '../../services/crash-log';
import { setPin, removePin, isAppLockEnabled } from '../../components/AppLock';
import { getRetentionDays, setRetentionDays, cleanupOldTasks } from '../../services/data-retention';
import { PERSONAS } from '../../constants/personas';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import PermissionGuide from '../../components/PermissionGuide';
import themes from '../../constants/themes';

const PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'agnes', label: 'Agnes AI' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'custom', label: '自定义' },
];

function ModelPicker({ label, models, selected, onSelect }: { label: string; models: ModelOption[]; selected: string; onSelect: (id: string) => void }) {
  const { theme } = useTheme();
  if (models.length === 0) return null;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[s.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={s.chipRow}>
        {models.map(m => (
          <TouchableOpacity
            key={m.id}
            onPress={() => onSelect(m.id)}
            style={[s.chip, { backgroundColor: selected === m.id ? theme.primary : theme.surfaceAlt }]}
          >
            <Text style={{ color: selected === m.id ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>
              {m.label}{m.vision ? ' 👁' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, themeId, setTheme, darkMode, setDarkMode } = useTheme();
  const [apiKey, setApiKeyState] = useState('');
  const [model, setModelState] = useState('deepseek-chat');
  const [visionModel, setVisionModelState] = useState('gpt-4o');
  const [provider, setProviderState] = useState<AIProvider>('deepseek');
  const [customUrl, setCustomUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [persona, setPersonaState] = useState('assistant');
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [retentionDays, setRetentionDaysState] = useState(90);

  useEffect(() => {
    getApiKey().then(k => { if (k) setApiKeyState(k); });
    getModel().then(setModelState);
    getVisionModel().then(setVisionModelState);
    getProvider().then(setProviderState);
    getPersona().then(setPersonaState);
    isAppLockEnabled().then(setAppLockEnabled);
    getRetentionDays().then(setRetentionDaysState);
    getBaseUrl().then(setCustomUrl);
  }, []);

  const handleSave = async () => {
    try {
      if (apiKey) await setApiKey(apiKey);
      await setProvider(provider);
      await setModel(model);
      await setVisionModel(visionModel);
      if (customUrl && provider === 'custom') await setCustomBaseUrl(customUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert('保存失败', e.message || '请重试');
    }
  };

  const handleClearKey = async () => {
    await clearApiKey();
    setApiKeyState('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAutoConfig = () => {
    const chatList = getChatModels(provider);
    const visionList = getVisionModels(provider);
    if (chatList.length > 0) setModelState(chatList[0].id);
    if (visionList.length > 0) setVisionModelState(visionList[0].id);
    Alert.alert('已自动配置', `聊天: ${chatList[0]?.label}\n视觉: ${visionList[0]?.label || '同聊天模型'}`);
  };

  const handleTestConnection = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const key = await getApiKey();
      if (!key) { Alert.alert('请先配置 API Key'); return; }
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hello' }], max_tokens: 5 }),
      });
      if (res.ok) Alert.alert('连接成功', 'API Key 和地址有效');
      else Alert.alert('连接失败', `HTTP ${res.status}`);
    } catch (e: any) {
      Alert.alert('连接失败', e.message);
    }
  };

  const handleToggleAppLock = async () => {
    if (appLockEnabled) {
      await removePin();
      setAppLockEnabled(false);
    } else {
      Alert.prompt('设置 PIN 码', '请输入 4 位 PIN 码', async (pin) => {
        if (pin && pin.length === 4) { await setPin(pin); setAppLockEnabled(true); }
      });
    }
  };

  const handleChangeRetention = async (days: number) => {
    await setRetentionDays(days);
    setRetentionDaysState(days);
    const cleaned = await cleanupOldTasks();
    if (cleaned > 0) Alert.alert('清理完成', `已清理 ${cleaned} 个过期已完成任务`);
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      Alert.alert('导出成功', `已导出 ${JSON.stringify(data).length} 字节数据`);
    } catch (e: any) { Alert.alert('导出失败', e.message); }
  };

  const handleExportCrashLog = async () => {
    const size = await getCrashLogSize();
    if (size === 0) { Alert.alert('无崩溃日志', '没有记录到崩溃信息'); return; }
    const log = await readCrashLog();
    Alert.alert('崩溃日志', log.slice(0, 2000), [
      { text: '清除日志', onPress: () => clearCrashLog() },
      { text: '关闭', style: 'cancel' },
    ]);
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.[0]) return;
      const response = await fetch(result.assets[0].uri);
      const data = await response.json();
      Alert.alert('确认导入', '即将导入数据，这会覆盖当前所有数据。确定吗？', [
        { text: '取消', style: 'cancel' },
        { text: '确定导入', onPress: async () => {
          try {
            const res = await importAllData(data);
            Alert.alert('导入完成', `成功导入 ${res.imported} 条记录`);
          } catch (e: any) { Alert.alert('导入失败', e.message); }
        }},
      ]);
    } catch (e: any) { Alert.alert('导入失败', e.message); }
  };

  const loadMemories = async () => { setMemories(await loadAllMemories()); setShowMemories(true); };
  const handleDeleteMemory = async (id: string) => { await deleteMemory(id); setMemories(prev => prev.filter(m => m.id !== id)); };

  const chatModels = getChatModels(provider);
  const visionModels = getVisionModels(provider);

  return (
    <ScrollView style={[s.container, { backgroundColor: theme.background }]} contentContainerStyle={{ padding: 12 }}>
      <PermissionGuide />

      {/* ═══ AI 设置 ═══ */}
      <Text style={[s.sectionHeader, { color: theme.textMuted }]}>AI 设置</Text>

      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[s.title, { color: theme.text }]}>提供商</Text>
        <View style={s.chipRow}>
          {PROVIDERS.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => { setProviderState(p.id); handleAutoConfig(); }}
              style={[s.chip, { backgroundColor: provider === p.id ? theme.primary : theme.surfaceAlt }]}
            >
              <Text style={{ color: provider === p.id ? '#fff' : theme.text, fontSize: 13, fontWeight: '500' }}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <PixelButton title="一键配置模型" onPress={handleAutoConfig} variant="secondary" style={{ marginTop: 8 }} />
      </PixelCard>

      {provider === 'custom' && (
        <PixelCard style={{ marginBottom: 12 }}>
          <Text style={[s.title, { color: theme.text }]}>API 地址</Text>
          <TextInput
            style={[s.input, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
            value={customUrl} onChangeText={setCustomUrl}
            placeholder="https://api.example.com/v1" placeholderTextColor={theme.textMuted}
          />
        </PixelCard>
      )}

      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[s.title, { color: theme.text }]}>API Key</Text>
        <TextInput
          style={[s.input, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
          value={apiKey} onChangeText={setApiKeyState}
          placeholder="sk-xxxxxxxx" placeholderTextColor={theme.textMuted} secureTextEntry
        />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <PixelButton title="保存" onPress={handleSave} style={{ flex: 1 }} />
          <PixelButton title="清除" onPress={handleClearKey} variant="danger" style={{ flex: 1 }} />
        </View>
        <PixelButton title="测试连接" onPress={handleTestConnection} variant="secondary" />
      </PixelCard>

      <PixelCard style={{ marginBottom: 12 }}>
        <ModelPicker label="💬 聊天模型" models={chatModels} selected={model} onSelect={setModelState} />
        <ModelPicker label="👁 视觉模型 (OCR/图片)" models={visionModels.length > 0 ? visionModels : chatModels} selected={visionModel} onSelect={setVisionModelState} />
      </PixelCard>

      {saved && <Text style={[s.saved, { color: theme.success }]}>已保存</Text>}

      {/* ═══ 外观 ═══ */}
      <Text style={[s.sectionHeader, { color: theme.textMuted }]}>外观</Text>

      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[s.title, { color: theme.text }]}>主题</Text>
        <View style={s.chipRow}>
          {themes.filter(t => !t.id.includes('-dark')).map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTheme(t.id)}
              style={[s.chip, { backgroundColor: themeId === t.id ? theme.primary : theme.surfaceAlt }]}
            >
              <Text style={{ color: themeId === t.id ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </PixelCard>

      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[s.title, { color: theme.text }]}>深色模式</Text>
        <View style={s.chipRow}>
          {(['system', 'light', 'dark'] as const).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setDarkMode(m)}
              style={[s.chip, { backgroundColor: darkMode === m ? theme.primary : theme.surfaceAlt }]}
            >
              <Text style={{ color: darkMode === m ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>
                {m === 'system' ? '跟随系统' : m === 'light' ? '亮色' : '暗色'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PixelCard>

      {/* ═══ AI 助理 ═══ */}
      <Text style={[s.sectionHeader, { color: theme.textMuted }]}>AI 助理</Text>

      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[s.title, { color: theme.text }]}>角色</Text>
        <View style={s.chipRow}>
          {PERSONAS.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={async () => { setPersonaState(p.id); await setPersona(p.id); }}
              style={[s.chip, { backgroundColor: persona === p.id ? theme.primary : theme.surfaceAlt }]}
            >
              <Text style={{ color: persona === p.id ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>
                {p.avatar} {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 6 }}>
          {PERSONAS.find(p => p.id === persona)?.description}
        </Text>
      </PixelCard>

      {/* ═══ 安全与数据 ═══ */}
      <Text style={[s.sectionHeader, { color: theme.textMuted }]}>安全与数据</Text>

      <PixelCard style={{ marginBottom: 12 }}>
        <TouchableOpacity onPress={handleToggleAppLock} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[s.title, { color: theme.text }]}>应用锁</Text>
          <Text style={{ color: appLockEnabled ? theme.success : theme.textMuted, fontSize: 13 }}>
            {appLockEnabled ? '已开启' : '未开启'}
          </Text>
        </TouchableOpacity>
      </PixelCard>

      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[s.title, { color: theme.text }]}>数据保留 ({retentionDays}天)</Text>
        <View style={s.chipRow}>
          {[30, 60, 90, 180].map(d => (
            <TouchableOpacity
              key={d} onPress={() => handleChangeRetention(d)}
              style={[s.chip, { backgroundColor: retentionDays === d ? theme.primary : theme.surfaceAlt }]}
            >
              <Text style={{ color: retentionDays === d ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>{d}天</Text>
            </TouchableOpacity>
          ))}
        </View>
      </PixelCard>

      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[s.title, { color: theme.text }]}>数据</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <PixelButton title="导出数据" onPress={handleExport} variant="secondary" style={{ flex: 1 }} />
          <PixelButton title="导入数据" onPress={handleImport} variant="secondary" style={{ flex: 1 }} />
        </View>
        <PixelButton title="查看崩溃日志" onPress={handleExportCrashLog} variant="secondary" />
      </PixelCard>

      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[s.title, { color: theme.text }]}>知识库</Text>
        {!showMemories ? (
          <PixelButton title="查看已记忆的条目" onPress={loadMemories} variant="secondary" />
        ) : (
          <View>
            <PixelButton title="收起" onPress={() => setShowMemories(false)} variant="secondary" style={{ marginBottom: 8 }} />
            {memories.length === 0 ? (
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>暂无记忆条目</Text>
            ) : (
              memories.map(m => (
                <View key={m.id} style={[s.memRow, { borderBottomColor: theme.surfaceAlt }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 10 }}>{m.memory_type} · {m.confidence}</Text>
                    <Text style={{ color: theme.text, fontSize: 13 }}>{m.content}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteMemory(m.id)} style={{ padding: 4 }}>
                    <Text style={{ color: theme.error }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </PixelCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: { fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', padding: 10, fontSize: 13, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  saved: { textAlign: 'center', fontSize: 13, fontWeight: '500', marginBottom: 8 },
  memRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
});
