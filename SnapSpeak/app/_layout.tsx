import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Platform } from 'react-native';
import { setupNotificationHandler, requestNotificationPermission } from '../services/notification';
import { setupReminderService, teardownReminderService } from '../services/reminder-service';
import { ThemeProvider } from '../services/theme-context';
import ErrorBoundary from '../components/ErrorBoundary';

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
    try { setupReminderService(); } catch (e) { console.warn('提醒服务启动失败', e); }
    requestNotificationPermission().catch(e => console.warn('通知权限请求失败', e));
    return () => {
      try { teardownReminderService(); } catch {}
    };
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="knowledge" />
          <Stack.Screen name="privacy" />
        </Stack>
        {onboardingDone === false && <Redirect href="/onboarding" />}
      </ErrorBoundary>
    </ThemeProvider>
  );
}
