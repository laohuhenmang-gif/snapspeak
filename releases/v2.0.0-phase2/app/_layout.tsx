import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../services/theme-context';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { setupNotificationHandler } from '../services/notification';
import { setupReminderService, teardownReminderService } from '../services/reminder-service';
import { rescheduleAllReminders } from '../services/notification';
import { loadTasks } from '../services/storage';
import { processQueue } from '../services/offline-queue';
import ErrorBoundary from '../components/ErrorBoundary';
import Onboarding, { isOnboarded } from '../components/Onboarding';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    setupNotificationHandler();
    setupReminderService();
    loadTasks().then(tasks => rescheduleAllReminders(tasks)).catch(() => {});
    isOnboarded().then(v => { setNeedsOnboarding(!v); setReady(true); });
    processQueue(async (req) => {
      console.log('Processing queued request:', req.type, req.id);
      return true;
    }).catch(() => {});
    return () => { teardownReminderService(); };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f0e8' }}>
        <ActivityIndicator size="large" color="#4a90d9" />
      </View>
    );
  }

  if (needsOnboarding) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <Onboarding onFinish={() => setNeedsOnboarding(false)} />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="task/[id]" options={{ headerShown: true, title: '任务详情', presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
