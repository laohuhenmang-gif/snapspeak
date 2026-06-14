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
import { shouldAutoBackup, performAutoBackup } from '../services/auto-backup';
import ErrorBoundary from '../components/ErrorBoundary';
import SplashScreen from '../components/SplashScreen';
import Onboarding, { isOnboarded } from '../components/Onboarding';
import AppLock, { isAppLockEnabled } from '../components/AppLock';

export default function RootLayout() {
  const [phase, setPhase] = useState<'splash' | 'lock' | 'onboarding' | 'ready'>('splash');
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    setupNotificationHandler();
    setupReminderService();
    loadTasks().then(tasks => rescheduleAllReminders(tasks)).catch(() => {});
    shouldAutoBackup().then(yes => { if (yes) performAutoBackup(); });
    processQueue(async (req) => {
      console.log('Processing queued request:', req.type, req.id);
      return true;
    }).catch(() => {});
    return () => { teardownReminderService(); };
  }, []);

  const handleSplashFinish = async () => {
    const onboarded = await isOnboarded();
    if (!onboarded) {
      setPhase('onboarding');
      return;
    }
    const lockEnabled = await isAppLockEnabled();
    if (lockEnabled) {
      setPhase('lock');
    } else {
      setPhase('ready');
    }
  };

  const handleUnlock = () => {
    setLocked(false);
    setPhase('ready');
  };

  if (phase === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (phase === 'lock' && locked) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <AppLock onUnlock={handleUnlock} />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  if (phase === 'onboarding') {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <Onboarding onFinish={() => setPhase('ready')} />
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
