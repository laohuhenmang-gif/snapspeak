import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants';

export default function NewTaskScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>更多方式</Text>
      <Text style={styles.subtitle}>其他新建任务方式（在首页底部输入条可直接使用 AI 创建）</Text>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: '#E8F5E9' }]}
        onPress={() => router.push('/new-task/voice')}
      >
        <Text style={styles.cardIcon}>🎤</Text>
        <Text style={styles.cardTitle}>语音输入</Text>
        <Text style={styles.cardDesc}>按住说话，自动转文字</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: '#E3F2FD' }]}
        onPress={() => router.push('/new-task/camera')}
      >
        <Text style={styles.cardIcon}>📷</Text>
        <Text style={styles.cardTitle}>拍照识别</Text>
        <Text style={styles.cardDesc}>拍摄或上传图片，OCR识别文字</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: '#FFF3E0' }]}
        onPress={() => router.push({ pathname: '/new-task/confirm', params: { title: '', description: '' } })}
      >
        <Text style={styles.cardIcon}>⌨️</Text>
        <Text style={styles.cardTitle}>手动输入</Text>
        <Text style={styles.cardDesc}>直接填写所有任务信息</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textLight, marginBottom: 24, lineHeight: 18 },
  card: {
    borderRadius: 16, padding: 20, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardIcon: { fontSize: 36, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: COLORS.textLight },
});
