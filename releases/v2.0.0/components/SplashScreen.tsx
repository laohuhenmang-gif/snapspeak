import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  onFinish: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 1500 }: Props) {
  const [opacity] = useState(new Animated.Value(0));
  const [scale] = useState(new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onFinish());
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.title}>语拍提醒</Text>
        <Text style={styles.subtitle}>SnapSpeak</Text>
        <Text style={styles.tagline}>你的个人 AI 工作助理</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f0e8' },
  content: { alignItems: 'center' },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontFamily: 'monospace', fontSize: 28, fontWeight: '900', color: '#2d2d2d', marginBottom: 4 },
  subtitle: { fontFamily: 'monospace', fontSize: 14, color: '#4a90d9', marginBottom: 12 },
  tagline: { fontFamily: 'monospace', fontSize: 12, color: '#9a9a9a' },
});
