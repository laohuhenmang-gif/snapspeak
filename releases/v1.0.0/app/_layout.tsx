import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../services/theme-context';
import { useEffect } from 'react';
import { setupNotificationHandler } from '../services/notification';
import { setupReminderService, teardownReminderService } from '../services/reminder-service';

export default function RootLayout() {
  useEffect(() => {
    setupNotificationHandler();
    setupReminderService();
    return () => { teardownReminderService(); };
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="task/[id]" options={{ headerShown: true, title: '任务详情', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: '设置', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
