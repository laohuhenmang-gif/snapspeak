import { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';

type ToastType = 'success' | 'info' | 'warn';

interface ToastData {
  message: string;
  type: ToastType;
  duration?: number;
}

let showToastFn: ((data: ToastData) => void) | null = null;

export function toast(message: string, type: ToastType = 'info', duration = 2000) {
  showToastFn?.({ message, type, duration });
}

export default function Toast() {
  const [data, setData] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    showToastFn = (d) => {
      if (timer.current) clearTimeout(timer.current);
      setData(d);
      setVisible(true);
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setVisible(false));
      }, d.duration || 2000);
    };
    return () => {
      showToastFn = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!visible || !data) return null;

  const bgColor = data.type === 'success' ? COLORS.success : data.type === 'warn' ? COLORS.warning : COLORS.primary;

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: bgColor }]} pointerEvents="none">
      <Text style={styles.message}>{data.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 60, left: 20, right: 20,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18,
    zIndex: 9999, alignItems: 'center',
    elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  message: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
