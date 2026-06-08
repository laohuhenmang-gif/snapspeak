import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useState, useEffect, useCallback } from 'react';
import { AI_PROVIDERS } from '../../constants';
import themes from '../../constants/themes';
import { loadTasks, exportAllData, importAllData } from '../../services/storage';
import { getApiKey, setApiKey, getModel, setModel, clearApiKey, getProvider, setProvider, getProviderModels, setCustomBaseUrl, AIProvider } from '../../services/ai-config';
import { useTheme } from '../../services/theme-context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MOTION_KEY = '@snapspeak_reduced_motion';

function useReducedMotion(): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState(false);
  useEffect(() => { AsyncStorage.getItem(MOTION_KEY).then(v => { if (v) setVal(v === 'true'); }); }, []);
  const setter = (v: boolean) => { setVal(v); AsyncStorage.setItem(MOTION_KEY, String(v)); };
  return [val, setter];
}

export default function SettingsScreen() {
  const { theme, themeId, setTheme, darkMode, setDarkMode } = useTheme();
  const [reducedMotion, setReducedMotion] = useReducedMotion();
  const [apiKey, setLocalApiKey] = useState('');
  const [model, setLocalModel] = useState('deepseek-chat');
  const [provider, setLocalProvider] = useState<AIProvider>('deepseek');
  const [providerModels, setProviderModels] = useState<readonly { id: string; label: string }[]>([]);
  const [customBaseUrl, setLocalCustomBaseUrl] = useState('');

  useEffect(() => {
    getApiKey().then(k => { if (k) setLocalApiKey(k); });
    getModel().then(m => setLocalModel(m));
    getProvider().then(p => { setLocalProvider(p); });
    getProviderModels().then(m => setProviderModels(m));
    (async () => {
      const p = await getProvider();
      if (p === 'custom') {
        const { getBaseUrl } = await import('../../services/ai-config');
        const url = await getBaseUrl();
        setLocalCustomBaseUrl(url);
      }
    })();
  }, []);

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) { Alert.alert('请输入 API Key'); return; }
    await setApiKey(trimmed);
    Alert.alert('已保存', 'DeepSeek API Key 已更新');
  };

  const handleProviderChange = async (newProvider: AIProvider) => {
    setLocalProvider(newProvider);
    await setProvider(newProvider);
    const models = await getProviderModels();
    setProviderModels(models);
    // Reset model to first available if current model not in new provider's list
    const modelInList = models.find(m => m.id === model);
    if (!modelInList && models.length > 0) {
      setLocalModel(models[0].id);
      await setModel(models[0].id);
    }
  };

  const handleModelChange = async (modelId: string) => {
    setLocalModel(modelId);
    await setModel(modelId);
  };

  const handleSaveCustomUrl = async () => {
    if (!customBaseUrl.trim()) {
      Alert.alert('请输入 API 地址');
      return;
    }
    await setCustomBaseUrl(customBaseUrl.trim());
    Alert.alert('已保存', '自定义 API 地址已更新');
  };

  const handleClearAll = () => {
    Alert.alert('确认清除', '将删除所有任务和数据', [
      { text: '取消', style: 'cancel' },
      { text: '确定', style: 'destructive', onPress: async () => {
        await importAllData({ version: '1.0', exported_at: '', tasks: [], captures: [], reminders: [], ai_actions: [], memories: [], reflections: [], blockers: [], conversations: [] });
        await Notifications.cancelAllScheduledNotificationsAsync();
      }},
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🎨 主题</Text>
        <View style={styles.themeRow}>
          {themes.map(t => (
            <TouchableOpacity key={t.id}
              style={[styles.themeItem, themeId === t.id && { borderColor: theme.primary, borderWidth: 2 }]}
              onPress={() => setTheme(t.id)}>
              <View style={[styles.themePreview, { backgroundColor: t.colors.primary }]} />
              <Text style={[styles.themeName, { color: theme.text }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🌙 外观</Text>
        <View style={styles.row}>
          {(['system' as const, 'light' as const, 'dark' as const]).map(m => (
            <TouchableOpacity key={m}
              style={[styles.optionBtn, { backgroundColor: theme.bg }, darkMode === m && { backgroundColor: theme.primary }]}
              onPress={() => setDarkMode(m)}>
              <Text style={[styles.optionText, { color: theme.text }, darkMode === m && { color: '#fff' }]}>
                {m === 'system' ? '跟随系统' : m === 'light' ? '浅色' : '深色'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🤖 AI 配置</Text>

        <Text style={[styles.label, { color: theme.textLight }]}>API 提供商</Text>
        <View style={styles.optionRow}>
          {AI_PROVIDERS.map(p => (
            <TouchableOpacity key={p.id}
              style={[styles.optionBtn, { backgroundColor: theme.bg },
                provider === p.id && { backgroundColor: theme.primary }]}
              onPress={() => handleProviderChange(p.id as AIProvider)}>
              <Text style={[styles.optionText, { color: theme.text },
                provider === p.id && { color: '#fff' }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {provider === 'custom' && (
          <>
            <Text style={[styles.label, { color: theme.textLight, marginTop: 12 }]}>自定义 API 地址</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
              value={customBaseUrl}
              onChangeText={setLocalCustomBaseUrl}
              placeholder="https://your-api.example.com"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary, alignSelf: 'flex-start', marginTop: 8 }]} onPress={handleSaveCustomUrl}>
              <Text style={styles.btnText}>保存地址</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.label, { color: theme.textLight, marginTop: 16 }]}>API Key</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
          value={apiKey}
          onChangeText={setLocalApiKey}
          placeholder="sk-xxxxxxxxxxxxxxxx"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          autoCapitalize="none"
        />
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleSaveKey}>
            <Text style={styles.btnText}>保存</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnOutline, { borderColor: theme.border }]}
            onPress={async () => { await clearApiKey(); setLocalApiKey(''); }}>
            <Text style={[styles.btnOutlineText, { color: theme.text }]}>清除</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: theme.textLight, marginTop: 16 }]}>模型</Text>
        <View style={styles.optionRow}>
          {providerModels.length > 0 ? providerModels.map(m => (
            <TouchableOpacity key={m.id}
              style={[styles.optionBtn, { backgroundColor: theme.bg },
                model === m.id && { backgroundColor: theme.primary }]}
              onPress={() => handleModelChange(m.id)}>
              <Text style={[styles.optionText, { color: theme.text },
                model === m.id && { color: '#fff' }]} numberOfLines={1}>{m.label}</Text>
            </TouchableOpacity>
          )) : (
            <Text style={[styles.value, { color: theme.textLight }]}>请先选择提供商</Text>
          )}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🔊 提醒</Text>
        <Text style={[styles.value, { color: theme.textLight }]}>系统 TTS 播报</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>📷 OCR</Text>
        <Text style={[styles.value, { color: theme.textLight }]}>DeepSeek Vision</Text>
      </View>

      <TouchableOpacity style={[styles.card, { backgroundColor: theme.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
        onPress={() => router.push('/knowledge')}>
        <View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🧠 知识库</Text>
          <Text style={[styles.value, { color: theme.textLight }]}>查看和管理 AI 记住的偏好和习惯</Text>
        </View>
        <Text style={[styles.value, { color: theme.textLight }]}>→</Text>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ 性能</Text>
        <TouchableOpacity style={styles.row} onPress={() => setReducedMotion(!reducedMotion)}>
          <Text style={[styles.value, { color: theme.textLight, flex: 1 }]}>减少动画效果</Text>
          <View style={[styles.toggle, { backgroundColor: reducedMotion ? theme.primary : theme.border }]}>
            <View style={[styles.toggleKnob, reducedMotion && styles.toggleKnobOn]} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>📦 数据管理</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary, flex: 1 }]}
            onPress={async () => {
              try {
                const data = await exportAllData();
                const json = JSON.stringify(data, null, 2);
                const fileName = `snapspeak-backup-${new Date().toISOString().slice(0, 10)}.json`;
                const file = new File(Paths.cache, fileName);
                await file.write(json);
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
                } else {
                  Alert.alert('导出成功', `文件已保存`);
                }
              } catch (e: any) {
                Alert.alert('导出失败', e.message || '未知错误');
              }
            }}>
            <Text style={styles.btnText}>导出数据</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnOutline, { borderColor: theme.border, flex: 1 }]}
            onPress={async () => {
              try {
                const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
                if (result.canceled || !result.assets?.[0]) return;
                const readFile = new File(result.assets[0].uri);
                const json = await readFile.text();
                const data = JSON.parse(json);
                Alert.alert('确认导入', '导入将替换所有现有数据，确认继续？', [
                  { text: '取消', style: 'cancel' },
                  { text: '导入', style: 'destructive', onPress: async () => {
                    const { imported, errors } = await importAllData(data);
                    Alert.alert('导入完成', `成功导入 ${imported} 条记录${errors.length > 0 ? `，${errors.length} 条失败` : ''}`);
                  }},
                ]);
              } catch (e: any) {
                Alert.alert('导入失败', e.message || '文件格式错误');
              }
            }}>
            <Text style={[styles.btnOutlineText, { color: theme.text }]}>导入数据</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={[styles.dangerBtn, { backgroundColor: theme.card }]}
        onPress={handleClearAll}>
        <Text style={{ color: theme.danger, fontSize: 15, fontWeight: '600' }}>清除所有数据</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, backgroundColor: '#FFF' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, fontFamily: 'monospace' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, fontFamily: 'monospace' },
  input: { padding: 12, fontSize: 14, fontFamily: 'monospace', backgroundColor: '#F5F5F5' },
  value: { fontSize: 14, fontFamily: 'monospace' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#000' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  btnOutline: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F0F0F0' },
  btnOutlineText: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F5F5F5' },
  optionText: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  themeRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  themeItem: { alignItems: 'center', padding: 8, borderWidth: 2, borderColor: 'transparent' },
  themePreview: { width: 36, height: 36, borderWidth: 2, borderColor: '#000' },
  themeName: { fontSize: 12, marginTop: 4, fontWeight: '700', fontFamily: 'monospace' },
  dangerBtn: { padding: 16, alignItems: 'center', marginBottom: 40, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, backgroundColor: '#FFF' },
  toggle: { width: 48, height: 28, padding: 3, justifyContent: 'center', backgroundColor: '#E0E0E0' },
  toggleKnob: { width: 20, height: 18, backgroundColor: '#000' },
  toggleKnobOn: { alignSelf: 'flex-end' },
});
