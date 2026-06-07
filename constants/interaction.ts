/**
 * SnapSpeak 统一交互状态机
 * 所有点击必须有反馈，不允许静默失败
 */

// 主交互状态
export type InteractionState =
  | 'idle'            // 等待用户输入
  | 'listening'       // 正在录音
  | 'transcribing'    // 语音转文字中
  | 'capturing'       // 正在拍照/选图
  | 'recognizing'     // OCR 识别中
  | 'sending'         // 正在发送
  | 'thinking'        // AI 正在理解
  | 'action_pending'  // AI 已生成动作，等待用户确认
  | 'executing'       // 正在执行动作
  | 'success'         // 执行成功
  | 'error';          // 执行失败，可重试

// 错误类型
export type ErrorType =
  | 'no_key'              // API Key 未配置 (简洁别名)
  | 'api_key_missing'    // API Key 未配置
  | 'network'            // 网络不可用
  | 'ai_service'         // AI 服务失败
  | 'ocr'                // OCR 失败 (简洁别名)
  | 'ocr_failed'         // OCR 失败
  | 'voice_permission'   // 语音权限未授权
  | 'camera_permission'  // 相机权限未授权
  | 'notification_permission' // 通知权限未开启
  | 'storage_full'       // 存储空间不足
  | 'data_save_failed'   // 数据保存失败
  | 'unknown';           // 未知错误

export interface InteractionError {
  type: ErrorType;
  message: string;
  retryable: boolean;
}

// 错误信息模板
export const ERROR_MESSAGES: Record<ErrorType, InteractionError> = {
  no_key: {
    type: 'no_key',
    message: 'AI 服务未配置，请在设置中填入 API Key',
    retryable: false,
  },
  api_key_missing: {
    type: 'api_key_missing',
    message: 'AI 服务未配置，请在设置中填入 API Key',
    retryable: false,
  },
  network: {
    type: 'network',
    message: '网络连接失败，请检查网络后重试',
    retryable: true,
  },
  ai_service: {
    type: 'ai_service',
    message: 'AI 服务暂时不可用，请稍后重试',
    retryable: true,
  },
  ocr: {
    type: 'ocr',
    message: '图片识别失败，请确认图片清晰后重试',
    retryable: true,
  },
  ocr_failed: {
    type: 'ocr_failed',
    message: '图片识别失败，请确认图片清晰后重试',
    retryable: true,
  },
  voice_permission: {
    type: 'voice_permission',
    message: '需要麦克风权限才能使用语音输入，请在系统设置中开启',
    retryable: false,
  },
  camera_permission: {
    type: 'camera_permission',
    message: '需要相机权限才能拍照，请在系统设置中开启',
    retryable: false,
  },
  notification_permission: {
    type: 'notification_permission',
    message: '需要通知权限才能接收提醒，请在系统设置中开启',
    retryable: false,
  },
  storage_full: {
    type: 'storage_full',
    message: '存储空间不足，请清理后重试',
    retryable: false,
  },
  data_save_failed: {
    type: 'data_save_failed',
    message: '数据保存失败，请重试',
    retryable: true,
  },
  unknown: {
    type: 'unknown',
    message: '发生未知错误，请重试',
    retryable: true,
  },
};

// 输入模式
export type InputMode = 'text' | 'voice' | 'camera';

// 输入栏提示文字
export const INPUT_HINT_IDLE = '输入任务、备忘或问 AI…';
export const INPUT_HINT_LISTENING = '🎤 正在听你说…';
export const INPUT_HINT_SENDING = '📤 发送中…';
export const INPUT_HINT_THINKING = '🤔 AI 正在理解…';
export const INPUT_HINT_EXECUTING = '⚡ 执行中…';
export const INPUT_HINT_ERROR = '❌ 出错了，请重试';

/**
 * 根据错误类型获取用户可读的错误消息
 * @param key 错误类型标识
 * @param detail 可选附加详情
 * @returns 格式化后的错误消息
 */
export function getErrorMessage(key: ErrorType, detail?: string): string {
  const base = ERROR_MESSAGES[key]?.message || ERROR_MESSAGES.unknown.message;
  return detail ? `${base}（${detail}）` : base;
}
