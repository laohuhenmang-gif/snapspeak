import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../services/theme-context';

interface Props {
  input: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onVoicePress: () => void;
  onCameraPress: () => void;
  disabled: boolean;
  listening?: boolean;
}

export default function BottomInputBar({ input, onChangeText, onSend, onVoicePress, onCameraPress, disabled, listening }: Props) {
  const { theme } = useTheme();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { borderTopColor: theme.pixelBorder, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          onPress={onVoicePress}
          style={[styles.iconBtn, { borderColor: theme.pixelBorder, backgroundColor: listening ? theme.error : theme.surface }]}
        >
          <Text style={{ color: listening ? '#fff' : theme.text, fontFamily: 'monospace', fontSize: 16, fontWeight: '700' }}>
            {listening ? '◉' : '🎙'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.pixelBorder, color: theme.text }]}
          placeholder={listening ? '正在听你说…' : '输入任务、备忘或问 AI…'}
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={onChangeText}
          multiline
          editable={!listening}
        />

        <TouchableOpacity
          onPress={onCameraPress}
          style={[styles.iconBtn, { borderColor: theme.pixelBorder, backgroundColor: theme.surface }]}
        >
          <Text style={{ color: theme.text, fontFamily: 'monospace', fontSize: 16 }}>📷</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSend}
          disabled={disabled || !input.trim()}
          style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: disabled || !input.trim() ? 0.4 : 1 }]}
        >
          <Text style={{ color: '#fff', fontFamily: 'monospace', fontWeight: '700' }}>[发送]</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 8, borderTopWidth: 2,
  },
  iconBtn: {
    borderWidth: 2, width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 4,
  },
  input: {
    flex: 1, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8,
    fontFamily: 'monospace', fontSize: 13, maxHeight: 80,
    marginRight: 4,
  },
  sendBtn: {
    borderWidth: 2, borderColor: '#000',
    paddingHorizontal: 10, paddingVertical: 10,
  },
});
