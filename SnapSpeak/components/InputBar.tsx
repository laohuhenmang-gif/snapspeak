import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  PanResponder,
  Alert,
} from 'react-native';
import { useState, useRef, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants';
import { InputMode, InteractionState, ERROR_MESSAGES } from '../constants/interaction';
import { ensureSpeechPermission, startListening, stopListening } from '../services/speech';
import { requestNotificationPermission } from '../services/notification';

interface InputBarProps {
  onSendText: (text: string) => void;
  onVoiceResult: (text: string) => void;
  onCameraResult: (imageUri: string) => void;
  state: InteractionState;
  onStateChange?: (state: InteractionState) => void;
  /** 是否将语音识别结果填入输入框（可编辑）而非直接发送 */
  editableVoiceResult?: boolean;
  onFocus?: () => void;
}

export default function InputBar({
  onSendText,
  onVoiceResult,
  onCameraResult,
  state,
  onStateChange,
  editableVoiceResult = true,
  onFocus,
}: InputBarProps) {
  const [text, setText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [cancelling, setCancelling] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const voiceBtnScale = useRef(new Animated.Value(1)).current;
  const lastPartialRef = useRef<string>('');

  // Use explicit boolean flags to avoid TS narrowing issues
  const isBusy = state !== 'idle' && state !== 'success' && state !== 'error';
  const isListening = state === 'listening';
  const isCapturing = state === 'capturing';

  const setState = useCallback(
    (s: InteractionState) => {
      onStateChange?.(s);
    },
    [onStateChange],
  );

  // Pulse animation for recording
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  // Text send
  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSendText(trimmed);
    setText('');
    setState('sending');
  }, [text, isBusy, onSendText, setState]);

  // Switch modes
  const switchToVoice = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputMode('voice');
  }, []);

  const switchToText = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputMode('text');
  }, []);

  const switchToCamera = useCallback(async () => {
    if (isBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', ERROR_MESSAGES.camera_permission.message, [
        { text: '知道了' },
      ]);
      return;
    }

    Alert.alert('拍照 / 从相册选择', '', [
      {
        text: '拍照',
        onPress: async () => {
          setState('capturing');
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            base64: false,
          });
          if (!result.canceled && result.assets?.[0]) {
            onCameraResult(result.assets[0].uri);
            setState('recognizing');
          } else {
            setState('idle');
          }
        },
      },
      {
        text: '从相册选择',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== 'granted') {
            Alert.alert('需要权限', '需要相册权限才能选择图片，请在系统设置中开启');
            return;
          }
          setState('capturing');
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            base64: false,
          });
          if (!result.canceled && result.assets?.[0]) {
            onCameraResult(result.assets[0].uri);
            setState('recognizing');
          } else {
            setState('idle');
          }
        },
      },
      { text: '取消', onPress: () => setState('idle') },
    ]);
  }, [isBusy, onCameraResult, setState]);

  // Voice recording — real STT
  const startRecording = useCallback(async () => {
    // 1. Check microphone permission first
    const hasPermission = await ensureSpeechPermission();
    if (!hasPermission) {
      Alert.alert('需要录音权限', '语音输入需要麦克风权限，请在系统设置中开启后重试');
      setState('idle');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCancelling(false);
    setState('listening');
    startPulse();
    Animated.spring(voiceBtnScale, { toValue: 1.3, useNativeDriver: true }).start();

    // 2. Start real speech recognition
    const cleanup = startListening(
      (text: string) => {
        // Partial result — store in ref for fallback
        lastPartialRef.current = text;
      },
      (text: string) => {
        // Final result — stop listening and use result
        stopPulse();
        Animated.spring(voiceBtnScale, { toValue: 1, useNativeDriver: true }).start();
        if (text && text.trim()) {
          const trimmed = text.trim();
          if (editableVoiceResult) {
            setText(trimmed);
            setInputMode('text');
            setState('idle');
          } else {
            onVoiceResult(trimmed);
          }
        } else {
          setState('idle');
        }
      },
      (error: string) => {
        // Error during recognition
        stopPulse();
        Animated.spring(voiceBtnScale, { toValue: 1, useNativeDriver: true }).start();
        Alert.alert('语音识别失败', error || '无法识别语音，请重试');
        setState('idle');
      },
    );
    // No need to store cleanup — use exported stopListening() directly
  }, [startPulse, voiceBtnScale, setState, onVoiceResult]);

  const stopRecording = useCallback((_cancelling: boolean) => {
    stopPulse();
    Animated.spring(voiceBtnScale, { toValue: 1, useNativeDriver: true }).start();

    if (_cancelling) {
      // Cancel: suppress onend, reset state
      stopListening(true);
      lastPartialRef.current = '';
      setState('idle');
    } else {
      // Normal stop: let onend callback handle the result
      stopListening(false);
    }
  }, [stopPulse, voiceBtnScale, setState]);

  const cancellingRef = useRef(cancelling);
  cancellingRef.current = cancelling;

  const startRecordingRef = useRef(startRecording);
  startRecordingRef.current = startRecording;

  const stopRecordingRef = useRef(stopRecording);
  stopRecordingRef.current = stopRecording;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => startRecordingRef.current(),
      onPanResponderMove: (_, gs) => {
        if (gs.dy < -60) {
          if (!cancellingRef.current) {
            cancellingRef.current = true;
            setCancelling(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        } else {
          if (cancellingRef.current) {
            cancellingRef.current = false;
            setCancelling(false);
          }
        }
      },
      onPanResponderRelease: () => {
        const wasCancelling = cancellingRef.current;
        stopRecordingRef.current(wasCancelling);
      },
    }),
  ).current;

  // Status label based on state
  const getStatusLabel = () => {
    switch (state) {
      case 'listening':
        return '正在听你说……';
      case 'capturing':
        return '拍照中…';
      case 'recognizing':
        return '识别图片中…';
      case 'sending':
        return '发送中…';
      case 'thinking':
        return 'AI 思考中…';
      case 'executing':
        return '执行中…';
      default:
        return '输入任务、备忘或问 AI…';
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Status bar */}
      {(isListening ||
        state === 'thinking' ||
        state === 'executing' ||
        state === 'error') && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {isListening && '🎙 正在听你说……'}
            {state === 'thinking' && '🤔 AI 正在理解……'}
            {state === 'executing' && '⚡ 正在执行……'}
            {state === 'error' && '⚠ 出错了，请重试'}
          </Text>
          {state === 'error' && (
            <TouchableOpacity onPress={() => setState('idle')}>
              <Text style={styles.retryText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Input bar */}
      <View style={styles.container}>
        {/* Voice button */}
        <TouchableOpacity
          style={[styles.iconBtn, inputMode === 'voice' && styles.iconBtnActive]}
          onPress={switchToVoice}
          disabled={isBusy}
        >
          <Text style={styles.iconText}>🎙</Text>
        </TouchableOpacity>

        {inputMode === 'text' ? (
          <>
            {/* Text input */}
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={getStatusLabel()}
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!isBusy}
              onFocus={() => onFocus?.()}
            />
            {/* Send button */}
            <TouchableOpacity
              style={[
                styles.iconBtn,
                (!text.trim() || isBusy) && styles.iconBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!text.trim() || isBusy}
            >
              <Text
                style={[
                  styles.sendIcon,
                  (!text.trim() || isBusy) && styles.sendIconDisabled,
                ]}
              >
                ↑
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Voice recording area */}
            <View style={styles.voiceBtnWrap}>
              <Animated.View
                style={[
                  styles.recordRing,
                  isListening && styles.recordRingActive,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.voiceBtn,
                  isListening && styles.voiceBtnActive,
                  { transform: [{ scale: voiceBtnScale }] },
                ]}
                {...panResponder.panHandlers}
              >
                <Text style={styles.voiceBtnIcon}>
                  {isListening ? 'REC' : 'HOLD'}
                </Text>
              </Animated.View>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={switchToText}>
              <Text style={styles.iconText}>⌨</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Camera button */}
        <TouchableOpacity
          style={[styles.iconBtn, isCapturing && styles.iconBtnActive]}
          onPress={switchToCamera}
          disabled={isBusy}
        >
          <Text style={styles.iconText}>📷</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.primary,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  iconBtnActive: {
    backgroundColor: '#000',
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  iconText: {
    fontSize: 16,
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'monospace',
  },
  sendIconDisabled: {
    color: COLORS.textMuted,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'monospace',
    color: COLORS.text,
    maxHeight: 80,
    marginHorizontal: 2,
    borderWidth: 0,
  },
  voiceBtnWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 44,
  },
  voiceBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  voiceBtnActive: {
    backgroundColor: '#000',
    elevation: 4,
    shadowOpacity: 0.2,
  },
  voiceBtnIcon: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: COLORS.text,
  },
  recordRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    zIndex: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    backgroundColor: '#FFF',
  },
  recordRingActive: {
    backgroundColor: '#F0F0F0',
  },
});