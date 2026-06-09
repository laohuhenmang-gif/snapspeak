import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← 返回</Text>
      </TouchableOpacity>
      <Text style={styles.title}>隐私政策</Text>

      <Text style={styles.updated}>最后更新：2026 年 6 月</Text>

      <Section title="信息收集">
        <Bullet>所有任务数据、AI 对话记录、知识库内容均存储在设备本地 SQLite 数据库中</Bullet>
        <Bullet>应用设置（主题偏好、AI 模型选择等）存储在设备本地</Bullet>
        <Bullet>AI 请求直接由您的设备发送至您配置的 AI 服务提供商，我们不会收集或转发</Bullet>
        <Bullet>相机、麦克风、通知权限仅用于对应的功能，不会在后台收集信息</Bullet>
      </Section>

      <Section title="信息分享">
        <Text style={styles.text}>本应用不会收集、上传或分享任何个人信息。所有数据仅存储在您的设备上。</Text>
      </Section>

      <Section title="数据安全">
        <Bullet>API Key 使用系统安全存储（SecureStore）加密保存</Bullet>
        <Bullet>可随时在设置中清除所有数据</Bullet>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bullet}>• {children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f6fa' },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, fontFamily: 'monospace' },
  updated: { fontSize: 13, color: '#7f8c8d', marginBottom: 24, fontFamily: 'monospace' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, fontFamily: 'monospace' },
  text: { fontSize: 14, lineHeight: 22, fontFamily: 'monospace', color: '#2c3e50' },
  bullet: { fontSize: 14, lineHeight: 22, fontFamily: 'monospace', color: '#2c3e50', marginBottom: 4 },
});
