import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../services/theme-context';

export type ChatState = 'idle' | 'listening' | 'transcribing' | 'sending' | 'thinking' | 'action_pending' | 'executing' | 'error';

interface Props {
  state: ChatState;
}

const LABELS: Record<ChatState, string> = {
  idle: '',
  listening: '🎤 正在听你说…',
  transcribing: '⏳ 正在转写…',
  sending: '📤 发送中…',
  thinking: '💭 AI 正在思考…',
  action_pending: '📋 需要你确认',
  executing: '⚡ 正在执行…',
  error: '',
};

export default function StatusBanner({ state }: Props) {
  const { theme } = useTheme();
  if (state === 'idle' || state === 'error') return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.pixelBorder }]}>
      <Text style={[styles.text, { color: theme.textMuted }]}>{LABELS[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1 },
  text: { fontFamily: 'monospace', fontSize: 12 },
});
