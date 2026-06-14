import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkNetwork } from './network';

const QUEUE_KEY = '@snapspeak_offline_queue';

export interface QueuedRequest {
  id: string;
  type: 'chat' | 'ocr' | 'review';
  payload: any;
  timestamp: number;
  retries: number;
}

export async function enqueueRequest(type: QueuedRequest['type'], payload: any): Promise<string> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const queue = await loadQueue();
  queue.push({ id, type, payload, timestamp: Date.now(), retries: 0 });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return id;
}

export async function loadQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function removeRequest(id: string): Promise<void> {
  const queue = await loadQueue();
  const filtered = queue.filter(r => r.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function processQueue(
  processor: (req: QueuedRequest) => Promise<boolean>,
): Promise<{ processed: number; failed: number }> {
  const isConnected = await checkNetwork();
  if (!isConnected) return { processed: 0, failed: 0 };

  const queue = await loadQueue();
  let processed = 0;
  let failed = 0;

  for (const req of queue) {
    try {
      const success = await processor(req);
      if (success) {
        await removeRequest(req.id);
        processed++;
      } else {
        req.retries++;
        if (req.retries >= 3) {
          await removeRequest(req.id);
          failed++;
        }
      }
    } catch {
      req.retries++;
      if (req.retries >= 3) {
        await removeRequest(req.id);
        failed++;
      }
    }
  }

  return { processed, failed };
}

export async function getQueueSize(): Promise<number> {
  const queue = await loadQueue();
  return queue.length;
}
