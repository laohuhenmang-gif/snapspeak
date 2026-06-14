import * as Notifications from 'expo-notifications';
import { speakReminder } from './speech';
import { AppState } from 'react-native';

let _cleanup: (() => void) | null = null;

export function setupReminderService(): void {
  if (_cleanup) return;

  const receivedSub = Notifications.addNotificationReceivedListener(notification => {
    const { title, body } = notification.request.content;
    const textToSpeak = title || body || '';
    if (textToSpeak && AppState.currentState === 'active') {
      speakReminder(textToSpeak);
    }
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    const { taskId } = response.notification.request.content.data || {};
    if (taskId) {
      // Could navigate to task detail here in future
    }
  });

  _cleanup = () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

export function teardownReminderService(): void {
  _cleanup?.();
  _cleanup = null;
}
