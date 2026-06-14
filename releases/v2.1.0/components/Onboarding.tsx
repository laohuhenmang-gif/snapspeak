import { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../services/theme-context';
import { PERSONAS } from '../constants/personas';
import { setApiKey, setPersona } from '../services/ai-config';
import PixelButton from './PixelButton';
import PixelCard from './PixelCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@snapspeak_onboarded';

export async function isOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

interface Props {
  onFinish: () => void;
}

export default function Onboarding({ onFinish }: Props) {
  const { theme, setTheme } = useTheme();
  const [page, setPage] = useState(0);
  const [apiKey, setApiKeyState] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('assistant');
  const scrollRef = useRef<ScrollView>(null);

  const pages = [
    {
      title: '欢迎使用语拍提醒',
      subtitle: '你的个人 AI 工作助理',
      content: (
        <View style={styles.featureList}>
          {['📝 文字快速记录', '🎙 语音智能识别', '📷 拍照 OCR 提取', '🤖 AI 理解与规划', '⏰ 精确提醒不遗漏'].map((f, i) => (
            <Text key={i} style={[styles.featureItem, { color: theme.text }]}>{f}</Text>
          ))}
        </View>
      ),
    },
    {
      title: '配置 AI 服务',
      subtitle: '输入 API Key 开始使用',
      content: (
        <PixelCard style={{ marginTop: 16 }}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>API Key</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.pixelBorder, color: theme.text }]}
            value={apiKey}
            onChangeText={setApiKeyState}
            placeholder="sk-xxxxxxxx"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
          />
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            支持 DeepSeek / OpenAI / Agnes AI
          </Text>
        </PixelCard>
      ),
    },
    {
      title: '选择 AI 角色',
      subtitle: '选一个适合你的助理风格',
      content: (
        <View style={styles.personaGrid}>
          {PERSONAS.map(p => (
            <View key={p.id} style={[styles.personaCard, { borderColor: selectedPersona === p.id ? theme.primary : theme.pixelBorder }]}>
              <PixelButton
                title={`${p.avatar} ${p.name}`}
                onPress={() => setSelectedPersona(p.id)}
                variant={selectedPersona === p.id ? 'primary' : 'secondary'}
              />
              <Text style={[styles.personaDesc, { color: theme.textMuted }]}>{p.description}</Text>
            </View>
          ))}
        </View>
      ),
    },
  ];

  const handleNext = async () => {
    try {
      if (page === 1 && apiKey.trim()) {
        await setApiKey(apiKey.trim());
      }
    } catch {
      // API Key 保存失败不阻止流程
    }
    if (page === 2) {
      try { await setPersona(selectedPersona); } catch {}
      await completeOnboarding();
      onFinish();
      return;
    }
    const nextPage = page + 1;
    setPage(nextPage);
    scrollRef.current?.scrollTo({ x: nextPage * SCREEN_WIDTH, animated: true });
  };

  const handleSkip = async () => {
    await completeOnboarding();
    onFinish();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {pages.map((p, i) => (
          <View key={i} style={[styles.page, { width: SCREEN_WIDTH }]}>
            <Text style={[styles.title, { color: theme.text }]}>{p.title}</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{p.subtitle}</Text>
            {p.content}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === page ? theme.primary : theme.textMuted }]}
            />
          ))}
        </View>
        <View style={styles.buttons}>
          {page < 2 && (
            <PixelButton title="[跳过]" onPress={handleSkip} variant="secondary" style={{ flex: 1 }} />
          )}
          <PixelButton
            title={page === 2 ? '[开始使用]' : '[下一步]'}
            onPress={handleNext}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 24, paddingTop: 80, alignItems: 'center' },
  title: { fontFamily: 'monospace', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontFamily: 'monospace', fontSize: 13, marginBottom: 24 },
  featureList: { width: '100%' },
  featureItem: { fontFamily: 'monospace', fontSize: 15, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  label: { fontFamily: 'monospace', fontSize: 11, marginBottom: 6 },
  input: { borderWidth: 2, padding: 12, fontFamily: 'monospace', fontSize: 14, marginBottom: 8 },
  hint: { fontFamily: 'monospace', fontSize: 11 },
  personaGrid: { width: '100%', gap: 8 },
  personaCard: { borderWidth: 2, padding: 12, alignItems: 'center' },
  personaDesc: { fontFamily: 'monospace', fontSize: 11, marginTop: 6, textAlign: 'center' },
  footer: { padding: 24, paddingBottom: 40 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  buttons: { flexDirection: 'row', gap: 8 },
});
