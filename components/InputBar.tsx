import { View, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useRef, useCallback, useEffect } from 'react';
import { COLORS } from '../constants';

interface InputBarProps {
  onSendText: (text: string) => void;
  onVoiceResult: (text: string) => void;
}

export default function InputBar({ onSendText, onVoiceResult }: InputBarProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 1.4, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, [pulseAnim, ringAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.setValue(1);
    ringAnim.setValue(1);
  }, [pulseAnim, ringAnim]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
  }, [text, onSendText]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    startPulse();
  }, [startPulse]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    stopPulse();
    const mockResult = '下周二下午三点开会讨论项目进度';
    onVoiceResult(mockResult);
  }, [stopPulse, onVoiceResult]);

  const [inputFocused, setInputFocused] = useState(false);

  return (
    <View style={[styles.container, inputFocused && styles.containerFocused]}>
      <TouchableOpacity
        style={styles.cameraBtn}
        onPress={() => router.push('/new-task/camera')}
      >
        <Animated.Text style={styles.cameraIcon}>📷</Animated.Text>
      </TouchableOpacity>

      <View style={styles.micWrapper}>
        {isRecording && (
          <Animated.View
            style={[styles.recRing, { transform: [{ scale: ringAnim }] }]}
          />
        )}
        <TouchableOpacity
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={0.7}
          style={styles.micBtn}
        >
          <Animated.Text style={[styles.micIcon, isRecording && styles.micActive]}>
            {isRecording ? '🔴' : '🎤'}
          </Animated.Text>
        </TouchableOpacity>
      </View>

      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="输入新任务…"
        placeholderTextColor={COLORS.textLight}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
      />

      <TouchableOpacity
        style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!text.trim()}
      >
        <Animated.Text style={[styles.sendText, !text.trim() && styles.sendTextDisabled]}>
          发送
        </Animated.Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: COLORS.card,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  containerFocused: {
    borderTopColor: COLORS.primary,
  },
  cameraBtn: { padding: 6 },
  cameraIcon: { fontSize: 20 },
  micWrapper: { position: 'relative', marginHorizontal: 4 },
  micBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  micIcon: { fontSize: 18 },
  micActive: { fontSize: 18 },
  recRing: {
    position: 'absolute', top: -4, left: -4,
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: COLORS.danger,
    opacity: 0.3,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text,
    marginHorizontal: 4,
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 4,
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sendTextDisabled: { color: COLORS.textLight },
});
