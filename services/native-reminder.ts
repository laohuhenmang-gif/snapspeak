import { NativeModules, Platform } from 'react-native';

const { NativeReminder } = NativeModules;

export interface PermissionStatus {
  notification: boolean;
  battery_optimization: boolean;
  exact_alarm: boolean;
}

export async function scheduleNativeAlarm(
  taskId: string,
  triggerAtMillis: number,
  title: string,
  body: string,
): Promise<boolean> {
  if (Platform.OS !== 'android' || !NativeReminder) return false;
  return NativeReminder.scheduleAlarm(taskId, triggerAtMillis, title, body);
}

export async function cancelNativeAlarm(taskId: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !NativeReminder) return false;
  return NativeReminder.cancelAlarm(taskId);
}

export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !NativeReminder) return true;
  return NativeReminder.canScheduleExactAlarms();
}

export function openExactAlarmSettings(): void {
  if (Platform.OS === 'android' && NativeReminder) {
    NativeReminder.openExactAlarmSettings();
  }
}

export async function isBatteryOptimizationIgnored(): Promise<boolean> {
  if (Platform.OS !== 'android' || !NativeReminder) return true;
  return NativeReminder.isBatteryOptimizationIgnored();
}

export function requestIgnoreBatteryOptimization(): void {
  if (Platform.OS === 'android' && NativeReminder) {
    NativeReminder.requestIgnoreBatteryOptimization();
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !NativeReminder) return true;
  return NativeReminder.hasNotificationPermission();
}

export function openNotificationSettings(): void {
  if (Platform.OS === 'android' && NativeReminder) {
    NativeReminder.openNotificationSettings();
  }
}

export async function getPermissionsStatus(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android' || !NativeReminder) {
    return { notification: true, battery_optimization: true, exact_alarm: true };
  }
  return NativeReminder.getPermissionsStatus();
}
