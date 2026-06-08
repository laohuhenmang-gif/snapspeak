import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';
import { setupNotificationHandler, requestNotificationPermission } from '../services/notification';
import { ThemeProvider } from '../services/theme-context';

const ONBOARDING_DONE_KEY = '@snapspeak_onboarding_done';

export default function RootLayout() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DONE_KEY).then(val => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  useEffect(() => {
    try { setupNotificationHandler(); } catch (e) { console.warn('通知处理器设置失败', e); }
    requestNotificationPermission().catch(e => console.warn('通知权限请求失败', e));
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      {onboardingDone === null ? (
        <View style={{ flex: 1, backgroundColor: '#000' }} />
      ) : (
        <>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="knowledge" />
          </Stack>
          {!onboardingDone && <Redirect href="/onboarding" />}
        </>
      )}
    </ThemeProvider>
  );
}