import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

type ToastType = 'success' | 'info' | 'warn';

interface ToastData {
  message: string;
  type: ToastType;
  duration: number;
}

let _show: ((data: ToastData) => void) | null = null;

export function toast(message: string, type: ToastType = 'info', duration = 3500) {
  _show?.({ message, type, duration });
}

export default function Toast() {
  const [data, setData] = useState<ToastData | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  let isShowing = false;

  _show = useCallback((d: ToastData) => {
    if (isShowing) {
      isShowing = false;
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }).start();
    }
    setTimeout(() => {
      isShowing = true;
      setData(d);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      setTimeout(() => {
        isShowing = false;
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setData(null));
      }, d.duration);
    }, 110);
  }, []);

  useEffect(() => {
    return () => { _show = null; };
  }, []);

  if (!data) return null;

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
    borderRadius: 2, paddingVertical: 12, paddingHorizontal: 18,
    zIndex: 9999, alignItems: 'center',
    borderWidth: 2, borderColor: '#000',
  },
  message: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
