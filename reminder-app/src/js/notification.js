import { listen } from '@tauri-apps/api/event';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

export async function initNotification() {
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  if (permissionGranted) {
    await listen('reminder', (event) => {
      const task = event.payload;
      sendNotification({
        title: `⏰ 提醒: ${task.title}`,
        body: task.description || '任务即将到期',
      });
    });
    console.log('Notification listener ready');
  }
}
