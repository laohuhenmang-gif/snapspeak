import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { setupNotificationHandler, requestNotificationPermission } from '../services/notification';
import { ThemeProvider } from '../services/theme-context';

export default function RootLayout() {
  useEffect(() => {
    setupNotificationHandler();
    requestNotificationPermission();
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-task" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reminder-popup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task-edit/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
