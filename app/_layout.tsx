import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { setupNotificationHandler, requestNotificationPermission } from '../services/notification';
import { ThemeProvider } from '../services/theme-context';
import ErrorBoundary from '../components/ErrorBoundary';

export default function RootLayout() {
  useEffect(() => {
    try { setupNotificationHandler(); } catch (e) { console.warn('通知处理器设置失败', e); }
    requestNotificationPermission().catch(e => console.warn('通知权限请求失败', e));
  }, []);

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-task" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reminder-popup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task-edit/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
