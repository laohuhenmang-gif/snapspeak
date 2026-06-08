import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, ExpoWebSpeechRecognition } from 'expo-speech-recognition';
import type { ExpoSpeechRecognitionResultEvent, ExpoSpeechRecognitionErrorEvent } from 'expo-speech-recognition';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

// ──────────────────────────────────────
// TTS (existing, unchanged)
// ──────────────────────────────────────

export function speakReminder(text: string) {
  Speech.speak(text, {
    language: 'zh-CN',
    pitch: 1.0,
    rate: 0.85,
  });
}

export function stopSpeaking() {
  Speech.stop();
}

export async function playBeepSound(): Promise<void> {
  try {
    const player: AudioPlayer = createAudioPlayer({
      uri: require('../assets/audio/reminder.mp3'),
    });
    await player.play();
  } catch {
    // Beep failed silently
  }
}

// ──────────────────────────────────────
// Real STT via expo-speech-recognition
// ──────────────────────────────────────

let recognizer: ExpoWebSpeechRecognition | null = null;

/**
 * Check if speech recognition permission is granted.
 * If not, request it.
 */
export async function ensureSpeechPermission(): Promise<boolean> {
  try {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Start real speech recognition.
 * @param onPartial - callback with interim results (incremental text)
 * @param onResult - callback when recognition finishes with final text
 * @param onError - callback on error
 * @returns a cleanup function that stops recognition
 */
export function startListening(
  onPartial: (text: string) => void,
  onResult: (text: string) => void,
  onError: (error: string) => void,
  timeoutMs = 8000,
): () => void {
  let cancelled = false;
  let accumulatedText = '';
  let timedOut = false;

  // Create a new recognizer instance
  recognizer = new ExpoWebSpeechRecognition();
  recognizer.lang = 'zh-CN';
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;
  recognizer.requiresOnDeviceRecognition = false;

  // Timeout safeguard: if no result within timeoutMs, report timeout
  const timeoutId = setTimeout(() => {
    if (cancelled) return;
    timedOut = true;
    try {
      recognizer?.stop();
    } catch {}
    onError('语音识别超时，请重试');
  }, timeoutMs);

  const clearTimeoutGuard = () => {
    clearTimeout(timeoutId);
  };

  recognizer.onresult = (event: ExpoSpeechRecognitionResultEvent) => {
    if (cancelled || timedOut) return;
    clearTimeoutGuard();

    const transcript = event.results
      .map((r) => r.transcript)
      .join(' ');

    if (event.isFinal) {
      if (transcript.trim().length > 0) {
        onResult(transcript.trim());
      } else if (accumulatedText.trim().length > 0) {
        onResult(accumulatedText.trim());
      } else {
        onError('未能识别到语音内容');
      }
    } else {
      // interim - update partial text
      if (transcript.trim().length > accumulatedText.trim().length) {
        accumulatedText = transcript.trim();
        onPartial(accumulatedText);
      }
    }
  };

  recognizer.onerror = (event: ExpoSpeechRecognitionErrorEvent) => {
    if (cancelled || timedOut) return;
    clearTimeoutGuard();

    switch (event.error) {
      case 'no-speech':
        onError('未检测到语音，请重试');
        break;
      case 'not-allowed':
        onError('麦克风权限未开启，请在设置中授权');
        break;
      case 'network':
        onError('网络连接失败，请检查网络后重试');
        break;
      case 'aborted':
        // silently ignore - user cancelled
        break;
      case 'busy':
        onError('语音引擎正忙，请稍后重试');
        break;
      default:
        onError(`语音识别失败: ${event.message}`);
    }
  };

  recognizer.onend = () => {
    if (cancelled || timedOut) return;
    clearTimeoutGuard();

    // If we have accumulated text but no final result came through,
    // treat the accumulated text as the result
    if (accumulatedText.trim().length > 0) {
      onResult(accumulatedText.trim());
    }
  };

  try {
    recognizer.start();
  } catch (e: any) {
    clearTimeoutGuard();
    onError(`启动语音识别失败: ${e?.message || '未知错误'}`);
  }

  return () => {
    cancelled = true;
    clearTimeoutGuard();
    try {
      recognizer?.stop();
    } catch {
      // already stopped
    }
    recognizer = null;
  };
}

/**
 * Check if currently recognizing.
 */
export function isListening(): boolean {
  return recognizer !== null;
}

/**
 * Stop any active recognition.
 */
export function stopListening(): void {
  try {
    recognizer?.stop();
  } catch {
    // already stopped
  }
  recognizer = null;
}