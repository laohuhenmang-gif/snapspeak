import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function hapticLight(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
}

export async function hapticMedium(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
}

export async function hapticSuccess(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
}

export async function hapticWarning(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
}

export async function hapticError(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
}
