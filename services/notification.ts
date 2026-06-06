import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task } from '../types';

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleTaskReminder(task: Task): Promise<string | undefined> {
  const triggerDate = new Date(task.datetime);
  if (isNaN(triggerDate.getTime()) || triggerDate <= new Date()) return;

  await Notifications.cancelScheduledNotificationAsync(task.id);

  const id = await Notifications.scheduleNotificationAsync({
    identifier: task.id,
    content: {
      title: '⏰ 提醒: ' + task.title,
      body: task.description || '任务即将到期',
      data: { taskId: task.id },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(taskId);
}

export async function rescheduleAllReminders(tasks: Task[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const task of tasks) {
    if (!task.completed) {
      await scheduleTaskReminder(task);
    }
  }
}

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
