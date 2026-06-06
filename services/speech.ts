import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

// 语音识别 - 使用系统语音输入法
// 实际实现通过 TextInput 的语音输入按钮触发系统STT

// 文字转语音 (TTS) - 用于提醒播报
export function speakReminder(text: string) {
  Speech.speak(text, {
    language: 'zh-CN',
    pitch: 1.0,
    rate: 0.85,
  });
}

// 播放预录真人提醒语音
const REMINDER_SOUNDS = {
  default: require('../assets/audio/reminder.wav'),
};

let sound: Audio.Sound | null = null;

export async function playReminderSound(): Promise<void> {
  try {
    if (sound) {
      await sound.replayAsync();
      return;
    }
    const { sound: newSound } = await Audio.Sound.createAsync(
      REMINDER_SOUNDS.default,
      { shouldPlay: true }
    );
    sound = newSound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound?.unloadAsync();
        sound = null;
      }
    });
  } catch (e) {
    console.warn('播放提醒语音失败:', e);
  }
}
