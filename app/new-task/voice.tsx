import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { COLORS } from '../../constants';

export default function VoiceInputScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const startRecording = () => {
    setIsRecording(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ).start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    scaleAnim.setValue(1);
    // 模拟语音识别结果
    const mockResult = '下周二下午三点开会讨论项目进度';
    setRecognizedText(mockResult);
  };

  const handleConfirm = () => {
    if (recognizedText) {
      router.push({
        pathname: '/new-task/confirm',
        params: { title: recognizedText, source: 'voice' },
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>语音输入</Text>
      <Text style={styles.hint}>
        {isRecording ? '正在聆听...' : recognizedText ? '识别结果如下' : '按住按钮说话'}
      </Text>

      {recognizedText ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{recognizedText}</Text>
          <TouchableOpacity style={styles.clearBtn} onPress={() => setRecognizedText('')}>
            <Text style={styles.clearText}>重新录制</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        onPressIn={startRecording}
        onPressOut={stopRecording}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.micButton, isRecording && styles.micActive, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.micIcon}>🎤</Text>
        </Animated.View>
      </TouchableOpacity>

      <Text style={styles.instruction}>
        {isRecording ? '松开手指完成录制' : '按住🎤说话'}
      </Text>

      {recognizedText ? (
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmText}>确认并设置时间</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', paddingTop: 80 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  hint: { fontSize: 14, color: COLORS.textLight, marginBottom: 40 },
  resultBox: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginHorizontal: 20,
    width: '85%', marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  resultText: { fontSize: 17, color: COLORS.text, lineHeight: 24 },
  clearBtn: { marginTop: 12, alignSelf: 'flex-end' },
  clearText: { color: COLORS.primary, fontSize: 14 },
  micButton: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary,
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  micActive: { backgroundColor: COLORS.danger },
  micIcon: { fontSize: 40 },
  instruction: { fontSize: 14, color: COLORS.textLight, marginTop: 20 },
  confirmBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 28, marginTop: 30,
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
