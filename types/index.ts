export type Category = '工作' | '学习' | '健康' | '生活' | '其他';
export type Priority = '高' | '中' | '低';
export type RecurringRule = 'none' | '每天' | '每周' | '每月' | '工作日' | '每两周';
export type SourceType = 'voice' | 'photo' | 'text';

export interface Task {
  id: string;
  title: string;
  description: string;
  datetime: string;
  planned_at?: string;
  due_at?: string;
  reminder_at?: string;
  priority: Priority;
  completed: boolean;
  postponed_count: number;
  current_blocker_reason: string;
  needs_precheck: boolean;
  precheck_message?: string;
  recurring: RecurringRule;
  category: Category;
  source: SourceType;
  source_id?: string;
  project_name: string;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;

export interface Capture {
  id: string;
  type: 'voice' | 'text' | 'photo' | 'screenshot';
  raw_text: string;
  image_uri?: string;
  audio_uri?: string;
  transcribed_text?: string;
  ocr_text?: string;
  processed_status: 'pending' | 'processing' | 'processed' | 'failed';
  created_at: string;
}

export interface Reminder {
  id: string;
  task_id: string;
  remind_at: string;
  remind_type: 'precheck' | 'due' | 'followup' | 'review';
  status: 'pending' | 'sent' | 'dismissed';
  notification_id?: string;
  created_at: string;
}

export interface AIActionRecord {
  id: string;
  action_type: string;
  payload_json: string;
  status: 'pending' | 'confirmed' | 'executed' | 'cancelled' | 'failed';
  user_confirmed_at?: string;
  executed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface Memory {
  id: string;
  memory_type: 'preference' | 'blocker' | 'rule' | 'project' | 'habit';
  content: string;
  source_id?: string;
  confidence: number;
  user_confirmed: boolean;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Reflection {
  id: string;
  date: string;
  planned_count: number;
  completed_count: number;
  completion_rate: number;
  overdue_count: number;
  main_blockers_json: string;
  ai_summary: string;
  ai_suggestion: string;
  created_at: string;
}

export interface Blocker {
  id: string;
  task_id: string;
  blocker_type: string;
  blocker_text: string;
  suggested_action: string;
  next_remind_at?: string;
  resolved: boolean;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: 'text' | 'image' | 'card' | 'action';
  related_task_id?: string;
  related_action_id?: string;
  created_at: string;
}

export type AIParseResult = {
  title: string;
  datetime: string | null;
  priority: Priority;
  recurring: RecurringRule;
  category: Category;
  notes: string;
};

export type ReminderAction = {
  action: 'snooze' | 'complete' | 'reschedule' | 'dismiss';
  snoozeMinutes: number | null;
  newDatetime: string | null;
  message: string;
};
