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
          style={[styles.iconBtn, { backgroundColor: listening ? theme.error : theme.surfaceAlt }]}
        >
          <Text style={{ color: listening ? '#fff' : theme.text, fontSize: 18 }}>
            {listening ? '◉' : '🎙'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          placeholder={listening ? '正在听你说…' : '输入任务、备忘或问 AI…'}
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={onChangeText}
          multiline
          editable={!listening}
        />

        <TouchableOpacity
          onPress={onCameraPress}
          style={[styles.iconBtn, { backgroundColor: theme.surfaceAlt }]}
        >
          <Text style={{ color: theme.text, fontSize: 18 }}>📷</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSend}
          disabled={disabled || !input.trim()}
          style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: disabled || !input.trim() ? 0.4 : 1 }]}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>发送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 8, borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    borderRadius: 20, width: 38, height: 38,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 6,
  },
  input: {
    flex: 1, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd', paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 14, maxHeight: 80, marginRight: 6,
  },
  sendBtn: {
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
  },
});
