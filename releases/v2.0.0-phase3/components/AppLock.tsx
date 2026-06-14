import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../services/theme-context';
import PixelButton from './PixelButton';

const PIN_KEY = '@snapspeak_pin';
const LOCK_KEY = '@snapspeak_lock_enabled';

export async function isAppLockEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOCK_KEY)) === 'true';
}

export async function getStoredPin(): Promise<string | null> {
  return AsyncStorage.getItem(PIN_KEY);
}

export async function setPin(pin: string): Promise<void> {
  await AsyncStorage.setItem(PIN_KEY, pin);
  await AsyncStorage.setItem(LOCK_KEY, 'true');
}

export async function removePin(): Promise<void> {
  await AsyncStorage.removeItem(PIN_KEY);
  await AsyncStorage.removeItem(LOCK_KEY);
}

interface Props {
  onUnlock: () => void;
}

export default function AppLock({ onUnlock }: Props) {
  const { theme } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [storedPin, setStoredPin] = useState('');

  useEffect(() => {
    getStoredPin().then(p => { if (p) setStoredPin(p); });
  }, []);

  const handleInput = async (digit: string) => {
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      if (next === storedPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 500);
      }
    }
  };

  const handleClear = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.lockIcon]}>🔒</Text>
      <Text style={[styles.title, { color: theme.text }]}>输入 PIN 码</Text>

      <View style={styles.dots}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[styles.dot, {
              backgroundColor: i < pin.length ? (error ? theme.error : theme.primary) : 'transparent',
              borderColor: error ? theme.error : theme.pixelBorder,
            }]}
          />
        ))}
      </View>

      {error && <Text style={[styles.error, { color: theme.error }]}>PIN 码错误</Text>}

      <View style={styles.keypad}>
        {digits.map((d, i) => {
          if (d === '') return <View key={i} style={styles.key} />;
          if (d === '⌫') {
            return (
              <PixelButton key={i} title="⌫" onPress={handleClear} variant="secondary" style={styles.key} />
            );
          }
          return (
            <PixelButton
              key={i}
              title={d}
              onPress={() => handleInput(d)}
              variant="secondary"
              style={styles.key}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  lockIcon: { fontSize: 48, marginBottom: 16 },
  title: { fontFamily: 'monospace', fontSize: 18, fontWeight: '700', marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  error: { fontFamily: 'monospace', fontSize: 12, marginBottom: 8 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12, justifyContent: 'center' },
  key: { width: 64, height: 48 },
});
