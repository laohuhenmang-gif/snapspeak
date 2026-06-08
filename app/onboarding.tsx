import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_DONE_KEY = '@snapspeak_onboarding_done';
const { width } = Dimensions.get('window');

const pages = [
  {
    title: '欢迎使用语拍提醒',
    subtitle: '你的个人 AI 工作助理',
    emoji: '🤖',
    description: '语拍提醒帮你记录待办事项、设置智能提醒、跟踪任务进度，让你的工作生活更有序。',
  },
  {
    title: '语音 & 拍照',
    subtitle: '最自然的输入方式',
    emoji: '🎙️',
    description: '按住录音按钮说话，AI 自动理解并创建任务。拍照识别白板或手写笔记，一键转为待办事项。',
  },
  {
    title: '开始使用',
    subtitle: '三步完成配置',
    emoji: '🚀',
    description: '1. 获取 DeepSeek API Key\n2. 在设置中填入 Key\n3. 开始与 AI 助理对话',
  },
];

export default function OnboardingScreen() {
  const [page, setPage] = useState(0);

  const handleNext = async () => {
    if (page < pages.length - 1) {
      setPage(page + 1);
    } else {
      await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
      router.replace('/(tabs)');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    router.replace('/(tabs)');
  };

  const p = pages[page];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{p.emoji}</Text>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.subtitle}>{p.subtitle}</Text>
        <Text style={styles.description}>{p.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>{page < pages.length - 1 ? '跳过' : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextText}>{page < pages.length - 1 ? '下一步' : '开始使用'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: '#ccc',
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  footer: {
    paddingBottom: 48,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: '#444',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: '#888',
    fontSize: 15,
    fontFamily: 'monospace',
    padding: 8,
  },
  nextBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  nextText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
