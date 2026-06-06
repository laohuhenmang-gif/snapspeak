import * as Speech from 'expo-speech';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

export function speakReminder(text: string) {
  Speech.speak(text, {
    language: 'zh-CN',
    pitch: 1.0,
    rate: 0.85,
  });
}

let sound: AudioPlayer | null = null;

export function playReminderSound(): void {
  try {
    if (sound) {
      sound.seekTo(0);
      sound.play();
      return;
    }
    sound = createAudioPlayer(require('../assets/audio/reminder.wav'));
    sound.play();
  } catch (e) {
    console.warn('播放提醒语音失败:', e);
  }
}
