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
import { useState, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants';
import { InputMode, InteractionState, ERROR_MESSAGES } from '../constants/interaction';

interface InputBarProps {
  onSendText: (text: string) => void;
  onVoiceResult: (text: string) => void;
  onCameraResult: (imageUri: string) => void;
  state: InteractionState;
  onStateChange?: (state: InteractionState) => void;
}

export default function InputBar({
  onSendText,
  onVoiceResult,
  onCameraResult,
  state,
  onStateChange,
}: InputBarProps) {
  const [text, setText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [cancelling, setCancelling] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const voiceBtnScale = useRef(new Animated.Value(1)).current;

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

  // Voice recording
  const startRecording = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCancelling(false);
    setState('listening');
    startPulse();
    Animated.spring(voiceBtnScale, { toValue: 1.3, useNativeDriver: true }).start();
  }, [startPulse, voiceBtnScale, setState]);

  const onPanResponderMove = useCallback(
    (_: any, gs: { dy: number }) => {
      if (gs.dy < -60) {
        if (!cancelling) {
          setCancelling(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } else {
        if (cancelling) setCancelling(false);
      }
    },
    [cancelling],
  );

  const stopRecording = useRef((_cancelling: boolean) => {
    stopPulse();
    Animated.spring(voiceBtnScale, { toValue: 1, useNativeDriver: true }).start();
    if (_cancelling) {
      setState('idle');
    } else {
      setState('transcribing');
      // Mock STT — 生产环境替换为真实语音识别
      onVoiceResult('下周二下午三点开会讨论项目进度');
    }
  }).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: startRecording,
      onPanResponderMove,
      onPanResponderRelease: () => {
        setCancelling(true);
        stopRecording(true);
      },
    }),
  ).current;

  // Status label based on state
  const getStatusLabel = () => {
    switch (state) {
      case 'listening':
        return '正在听你说……';
      case 'transcribing':
        return '识别中…';
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
        state === 'transcribing' ||
        state === 'thinking' ||
        state === 'executing' ||
        state === 'error') && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {isListening && '🎙 正在听你说……'}
            {state === 'transcribing' && '📝 正在转文字……'}
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
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 24,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
  },
  iconBtnActive: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.primary,
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
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  voiceBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.border,
    zIndex: 1,
  },
  recordRingActive: {
    borderColor: COLORS.primary,
  },
});