import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../services/theme-context';
import { getApiKey, setApiKey, clearApiKey, getModel, setModel, getProvider, setProvider, getBaseUrl, setCustomBaseUrl } from '../../services/ai-config';
import { exportAllData, importAllData, loadAllMemories, deleteMemory } from '../../services/storage';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';
import themes from '../../constants/themes';
import type { AIProvider } from '../../services/ai-config';

const PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'agnes', label: 'Agnes AI' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'custom', label: '自定义' },
];

const MODELS: Record<string, { id: string; label: string }[]> = {
  deepseek: [
    { id: 'deepseek-chat', label: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
  ],
  agnes: [
    { id: 'deepseek-chat', label: 'DeepSeek Chat' },
    { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash (vision)' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  custom: [{ id: 'custom-model', label: '自定义模型名' }],
};

export default function SettingsScreen() {
  const { theme, themeId, setTheme, darkMode, setDarkMode } = useTheme();
  const [apiKey, setApiKeyState] = useState('');
  const [model, setModelState] = useState('deepseek-chat');
  const [provider, setProviderState] = useState<AIProvider>('deepseek');
  const [customUrl, setCustomUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [showMemories, setShowMemories] = useState(false);

  useEffect(() => {
    getApiKey().then(k => { if (k) setApiKeyState(k); });
    getModel().then(m => setModelState(m));
    getProvider().then(p => setProviderState(p));
    (async () => {
      const url = await getBaseUrl();
      setCustomUrl(url);
    })();
  }, []);

  const handleSave = async () => {
    if (apiKey) await setApiKey(apiKey);
    await setProvider(provider);
    await setModel(model);
    if (customUrl && provider === 'custom') await setCustomBaseUrl(customUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearKey = async () => {
    await clearApiKey();
    setApiKeyState('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      Alert.alert('导出成功', `已导出 ${JSON.stringify(data).length} 字节数据`);
    } catch (e: any) {
      Alert.alert('导出失败', e.message);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      const response = await fetch(file.uri);
      const data = await response.json();
      Alert.alert('确认导入', `即将导入数据，这会覆盖当前所有数据。确定吗？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '确定导入', onPress: async () => {
            try {
              const res = await importAllData(data);
              Alert.alert('导入完成', `成功导入 ${res.imported} 条记录${res.errors.length > 0 ? '\n错误：' + res.errors.join(', ') : ''}`);
            } catch (e: any) {
              Alert.alert('导入失败', e.message);
            }
          }
        },
      ]);
    } catch (e: any) {
      Alert.alert('导入失败', e.message);
    }
  };

  const loadMemories = async () => {
    const all = await loadAllMemories();
    setMemories(all);
    setShowMemories(true);
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const handleTestConnection = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const key = await getApiKey();
      if (!key) { Alert.alert('请先配置 API Key'); return; }
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: await getModel(), messages: [{ role: 'user', content: 'hello' }], max_tokens: 5 }),
      });
      if (res.ok) Alert.alert('连接成功', 'API Key 和地址有效');
      else Alert.alert('连接失败', `HTTP ${res.status}`);
    } catch (e: any) {
      Alert.alert('连接失败', e.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ padding: 12 }}>
      {/* AI Provider */}
      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>AI 提供商</Text>
        <View style={styles.row}>
          {PROVIDERS.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setProviderState(p.id)}
              style={[styles.option, { borderColor: theme.pixelBorder, backgroundColor: provider === p.id ? theme.primary : theme.surface }]}
            >
              <Text style={{ color: provider === p.id ? '#fff' : theme.text, fontFamily: 'monospace', fontSize: 12, fontWeight: '600' }}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PixelCard>

      {/* Model */}
      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>模型</Text>
        <View style={styles.row}>
          {(MODELS[provider] || []).map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setModelState(m.id)}
              style={[styles.option, { borderColor: theme.pixelBorder, backgroundColor: model === m.id ? theme.primary : theme.surface }]}
            >
              <Text style={{ color: model === m.id ? '#fff' : theme.text, fontFamily: 'monospace', fontSize: 11, fontWeight: '600' }}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PixelCard>

      {/* Custom Base URL */}
      {provider === 'custom' && (
        <PixelCard style={{ marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>自定义 API 地址</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.pixelBorder, color: theme.text }]}
            value={customUrl}
            onChangeText={setCustomUrl}
            placeholder="https://api.example.com/v1"
            placeholderTextColor={theme.textMuted}
          />
        </PixelCard>
      )}

      {/* API Key */}
      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>API Key</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.pixelBorder, color: theme.text }]}
          value={apiKey}
          onChangeText={setApiKeyState}
          placeholder="sk-xxxxxxxx"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
        />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <PixelButton title="[保存]" onPress={handleSave} style={{ flex: 1 }} />
          <PixelButton title="[清除]" onPress={handleClearKey} variant="danger" style={{ flex: 1 }} />
        </View>
        <PixelButton title="[测试连接]" onPress={handleTestConnection} variant="secondary" />
      </PixelCard>

      {/* Theme */}
      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>主题</Text>
        <View style={styles.row}>
          {themes.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTheme(t.id)}
              style={[styles.option, { borderColor: theme.pixelBorder, backgroundColor: themeId === t.id ? theme.primary : theme.surface }]}
            >
              <Text style={{ color: themeId === t.id ? '#fff' : theme.text, fontFamily: 'monospace', fontSize: 11, fontWeight: '600' }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PixelCard>

      {/* Dark mode */}
      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>深色模式</Text>
        <View style={styles.row}>
          {(['system', 'light', 'dark'] as const).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setDarkMode(m)}
              style={[styles.option, { borderColor: theme.pixelBorder, backgroundColor: darkMode === m ? theme.primary : theme.surface }]}
            >
              <Text style={{ color: darkMode === m ? '#fff' : theme.text, fontFamily: 'monospace', fontSize: 11, fontWeight: '600' }}>
                {m === 'system' ? '跟随系统' : m === 'light' ? '亮色' : '暗色'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PixelCard>

      {/* Data */}
      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>数据</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PixelButton title="[导出数据]" onPress={handleExport} variant="secondary" style={{ flex: 1 }} />
          <PixelButton title="[导入数据]" onPress={handleImport} variant="secondary" style={{ flex: 1 }} />
        </View>
      </PixelCard>

      {/* Knowledge Base */}
      <PixelCard style={{ marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>知识库</Text>
        {!showMemories ? (
          <PixelButton title="[查看已记忆的条目]" onPress={loadMemories} variant="secondary" />
        ) : (
          <View>
            <PixelButton title="[收起]" onPress={() => setShowMemories(false)} variant="secondary" style={{ marginBottom: 8 }} />
            {memories.length === 0 ? (
              <Text style={{ color: theme.textMuted, fontFamily: 'monospace', fontSize: 12 }}>暂无记忆条目</Text>
            ) : (
              memories.map(m => (
                <View key={m.id} style={[styles.memoryRow, { borderBottomColor: theme.pixelBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textSecondary, fontFamily: 'monospace', fontSize: 10 }}>
                      {m.memory_type} · {m.confidence}
                    </Text>
                    <Text style={{ color: theme.text, fontFamily: 'monospace', fontSize: 12 }}>{m.content}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteMemory(m.id)} style={{ padding: 4 }}>
                    <Text style={{ color: theme.error, fontFamily: 'monospace' }}>[×]</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </PixelCard>

      {saved && <Text style={[styles.saved, { color: theme.success }]}>[✓] 已保存</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 6 },
  input: { borderWidth: 2, padding: 10, fontFamily: 'monospace', fontSize: 12, marginBottom: 8 },
  saved: { fontFamily: 'monospace', fontSize: 13, textAlign: 'center' },
  memoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1 },
});
