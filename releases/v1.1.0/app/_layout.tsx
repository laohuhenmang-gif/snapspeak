import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../services/theme-context';
import { useEffect } from 'react';
import { setupNotificationHandler } from '../services/notification';
import { setupReminderService, teardownReminderService } from '../services/reminder-service';
import { rescheduleAllReminders } from '../services/notification';
import { loadTasks } from '../services/storage';

export default function RootLayout() {
  useEffect(() => {
    setupNotificationHandler();
    setupReminderService();
    loadTasks().then(tasks => rescheduleAllReminders(tasks)).catch(() => {});
    return () => { teardownReminderService(); };
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/[id]" options={{ headerShown: true, title: '任务详情', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
