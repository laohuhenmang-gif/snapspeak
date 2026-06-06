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
  const modeAnim = useRef(new Animated.Value(1)).current;
  const voiceBtnScale = useRef(new Animated.Value(1)).current;
  const cancelZone = useRef(new Animated.Value(0)).current;

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
      Animated.timing(cancelZone, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    } else {
      if (cancelling) setCancelling(false);
      Animated.timing(cancelZone, { toValue: 0, duration: 100, useNativeDriver: true }).start();
    }
  }, [cancelling, cancelZone]);

  const stopRecording = useCallback(() => {
    const wasCancelling = cancelling;
    setRecording(false);
    setCancelling(false);
    stopPulse();
    cancelZone.setValue(0);
    Animated.spring(voiceBtnScale, { toValue: 1, useNativeDriver: true }).start();

    if (!wasCancelling) {
      const mockResult = '下周二下午三点开会讨论项目进度';
      onVoiceResult(mockResult);
    }
  }, [cancelling, stopPulse, voiceBtnScale, cancelZone, onVoiceResult]);

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
              <Text style={styles.cameraIcon}>📷</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.micBtn} onPress={switchToVoice}>
            <Text style={styles.micIcon}>🎤</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="输入新任务…"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Text style={[styles.sendText, !text.trim() && styles.sendTextDisabled]}>发送</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.voiceContainer}>
          <TouchableOpacity style={styles.keyboardBtn} onPress={switchToText}>
            <Text style={styles.keyboardIcon}>⌨️</Text>
          </TouchableOpacity>
          <View style={styles.voiceBtnWrap}>
            {recording && (
              <Animated.View style={[styles.recordRing, { transform: [{ scale: pulseAnim }] }]} />
            )}
            <Animated.View
              style={[styles.voiceBtn, recording && styles.voiceBtnActive, { transform: [{ scale: voiceBtnScale }] }]}
              {...panResponder.panHandlers}
            >
              <Text style={styles.voiceBtnIcon}>{recording ? '🔴' : '🎤'}</Text>
            </Animated.View>
          </View>
          <Text style={[styles.voiceHint, recording && { color: cancelling ? COLORS.danger : COLORS.primary }]}>
            {recording ? (cancelling ? '松手取消' : '上滑取消 · 松开发送') : '按住说话'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12, paddingBottom: 12,
  },
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    elevation: 4,
    shadowColor: '#7C5CFC',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  cameraBtn: { padding: 6 },
  cameraIcon: { fontSize: 20 },
  micBtn: { padding: 6, marginHorizontal: 2 },
  micIcon: { fontSize: 20 },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 15,
    color: COLORS.text,
    marginHorizontal: 4,
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginLeft: 4,
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sendTextDisabled: { color: COLORS.textLight },
  voiceContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    elevation: 4,
    shadowColor: '#7C5CFC',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  keyboardBtn: { padding: 6 },
  keyboardIcon: { fontSize: 20 },
  voiceBtnWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  voiceBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  voiceBtnActive: { backgroundColor: COLORS.danger },
  voiceBtnIcon: { fontSize: 24 },
  recordRing: {
    position: 'absolute',
    width: 70, height: 70, borderRadius: 35,
    borderWidth: 2,
    borderColor: COLORS.danger,
    opacity: 0.25,
  },
  voiceHint: {
    fontSize: 12, color: COLORS.textMuted,
    width: 70, textAlign: 'center', marginLeft: 8,
  },
});
