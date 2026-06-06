export type Category = '工作' | '学习' | '健康' | '生活' | '其他';
export type Priority = '高' | '中' | '低';
export type RecurringRule = 'none' | '每天' | '每周' | '每月' | '工作日' | '每两周';

export interface Task {
  id: string;
  title: string;
  description: string;
  datetime: string;
  priority: Priority;
  completed: boolean;
  recurring: RecurringRule;
  category: Category;
  source: 'voice' | 'photo' | 'text';
  createdAt: string;
  completedAt?: string;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt'>;

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
