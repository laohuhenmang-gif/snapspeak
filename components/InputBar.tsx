import { View, TextInput, TouchableOpacity, StyleSheet, Animated, Text, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants';

interface InputBarProps {
  onSendText: (text: string) => void;
  onVoiceResult: (text: string) => void;
  showCamera?: boolean;
}

export default function InputBar({ onSendText, onVoiceResult, showCamera = true }: InputBarProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [recording, setRecording] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const voiceBtnScale = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 300, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
  }, [text, onSendText]);

  const switchToVoice = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputMode('voice');
  }, []);

  const switchToText = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputMode('text');
  }, []);

  const startRecording = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRecording(true);
    setCancelling(false);
    startPulse();
    Animated.spring(voiceBtnScale, { toValue: 1.3, useNativeDriver: true }).start();
  }, [startPulse, voiceBtnScale]);

  const onPanResponderMove = useCallback((_: any, gs: { dy: number }) => {
    if (gs.dy < -60) {
      if (!cancelling) {
        setCancelling(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } else {
      if (cancelling) setCancelling(false);
    }
  }, [cancelling]);

  const stopRecording = useRef(() => {
    setRecording(false);
    setCancelling(false);
    stopPulse();
    Animated.spring(voiceBtnScale, { toValue: 1, useNativeDriver: true }).start();
    if (!cancelling) {
      onVoiceResult('下周二下午三点开会讨论项目进度');
    }
  }).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: startRecording,
      onPanResponderMove: onPanResponderMove,
      onPanResponderRelease: stopRecording,
    }),
  ).current;

  return (
    <View style={styles.wrapper}>
      {inputMode === 'text' ? (
        <View style={styles.container}>
          {showCamera && (
            <TouchableOpacity style={styles.cameraBtn} onPress={() => router.push('/new-task/camera')}>
              <Text style={styles.cameraIcon}>[ ]</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.micBtn} onPress={switchToVoice}>
            <Text style={styles.micIcon}>(o)</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="> NEW TASK_"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Text style={[styles.sendText, !text.trim() && styles.sendTextDisabled]}>SEND</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.voiceContainer}>
          <TouchableOpacity style={styles.keyboardBtn} onPress={switchToText}>
            <Text style={styles.keyboardIcon}>[K]</Text>
          </TouchableOpacity>
          <View style={styles.voiceBtnWrap}>
            {recording && (
              <Animated.View style={[styles.recordRing, { transform: [{ scale: pulseAnim }] }]} />
            )}
            <Animated.View
              style={[styles.voiceBtn, recording && styles.voiceBtnActive, { transform: [{ scale: voiceBtnScale }] }]}
              {...panResponder.panHandlers}
            >
              <Text style={styles.voiceBtnIcon}>{recording ? 'REC' : 'HOLD'}</Text>
            </Animated.View>
          </View>
          <Text style={[styles.voiceHint, recording && { color: cancelling ? '#F00' : COLORS.text }]}>
            {recording ? (cancelling ? 'CANCEL!' : '>>RELEASE<<') : 'SPEAK_'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 8, paddingBottom: 8 },
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: COLORS.card,
    borderWidth: 2, borderColor: COLORS.border,
  },
  cameraBtn: { padding: 4 },
  cameraIcon: { fontSize: 16, fontFamily: 'monospace', color: COLORS.text },
  micBtn: { padding: 4, marginHorizontal: 2 },
  micIcon: { fontSize: 16, fontFamily: 'monospace', color: COLORS.text },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 14, fontFamily: 'monospace',
    color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
    marginHorizontal: 4, maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderWidth: 2, borderColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 7, marginLeft: 2,
  },
  sendBtnDisabled: { backgroundColor: COLORS.card, borderColor: COLORS.textMuted },
  sendText: { color: '#FFF', fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  sendTextDisabled: { color: COLORS.textMuted },
  voiceContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: COLORS.card,
    borderWidth: 2, borderColor: COLORS.border,
  },
  keyboardBtn: { padding: 4 },
  keyboardIcon: { fontSize: 16, fontFamily: 'monospace', color: COLORS.text },
  voiceBtnWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  voiceBtn: {
    width: 48, height: 48,
    backgroundColor: COLORS.card, borderWidth: 3, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  voiceBtnActive: { backgroundColor: '#000', borderColor: '#FFF' },
  voiceBtnIcon: { fontSize: 10, fontWeight: '700', fontFamily: 'monospace', color: COLORS.text },
  recordRing: {
    position: 'absolute', width: 64, height: 64,
    borderWidth: 2, borderColor: '#000',
  },
  voiceHint: {
    fontSize: 10, fontFamily: 'monospace', color: COLORS.textMuted,
    width: 70, textAlign: 'center', marginLeft: 4,
  },
});
