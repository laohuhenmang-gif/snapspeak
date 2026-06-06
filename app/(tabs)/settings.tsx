import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { DEEPSEEK_MODELS } from '../../constants';
import themes from '../../constants/themes';
import { saveTasks, loadTasks } from '../../services/storage';
import { getApiKey, setApiKey, getModel, setModel, clearApiKey } from '../../services/ai-config';
import { useTheme } from '../../services/theme-context';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen() {
  const { theme, themeId, setTheme } = useTheme();
  const [apiKey, setLocalApiKey] = useState('');
  const [model, setLocalModel] = useState('deepseek-chat');

  useEffect(() => {
    getApiKey().then(k => { if (k) setLocalApiKey(k); });
    getModel().then(m => setLocalModel(m));
  }, []);

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) { Alert.alert('请输入 API Key'); return; }
    await setApiKey(trimmed);
    Alert.alert('已保存', 'DeepSeek API Key 已更新');
  };

  const handleClearAll = () => {
    Alert.alert('确认清除', '将删除所有任务和数据', [
      { text: '取消', style: 'cancel' },
      { text: '确定', style: 'destructive', onPress: async () => {
        await saveTasks([]);
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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🤖 AI 配置</Text>
        <Text style={[styles.label, { color: theme.textLight }]}>DeepSeek API Key</Text>
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
          {DEEPSEEK_MODELS.map(m => (
            <TouchableOpacity key={m.id}
              style={[styles.optionBtn, { backgroundColor: theme.bg, borderColor: theme.border },
                model === m.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={async () => { setLocalModel(m.id); await setModel(m.id); }}>
              <Text style={[styles.optionText, { color: theme.text },
                model === m.id && { color: '#fff' }]} numberOfLines={1}>{m.label}</Text>
            </TouchableOpacity>
          ))}
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

      <TouchableOpacity style={[styles.dangerBtn, { backgroundColor: theme.card }]}
        onPress={handleClearAll}>
        <Text style={{ color: theme.danger, fontSize: 15, fontWeight: '600' }}>清除所有数据</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1 },
  value: { fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnOutline: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1 },
  btnOutlineText: { fontSize: 14, fontWeight: '500' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  optionText: { fontSize: 13, fontWeight: '500' },
  themeRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  themeItem: { alignItems: 'center', padding: 8, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  themePreview: { width: 36, height: 36, borderRadius: 18 },
  themeName: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  dangerBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
});
