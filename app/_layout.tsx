import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { setupNotificationHandler, requestNotificationPermission } from '../services/notification';
import { ThemeProvider } from '../services/theme-context';

export default function RootLayout() {
  useEffect(() => {
    try { setupNotificationHandler(); } catch (e) { console.warn('通知处理器设置失败', e); }
    requestNotificationPermission().catch(e => console.warn('通知权限请求失败', e));
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}