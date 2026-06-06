export const COLORS = {
  primary: '#4A90D9',
  primaryDark: '#2980B9',
  danger: '#E74C3C',
  success: '#27AE60',
  warning: '#F39C12',
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E0E0',
  priorityHigh: '#E74C3C',
  priorityMedium: '#F39C12',
  priorityLow: '#27AE60',
};

export const PRIORITY_LABELS = ['高', '中', '低'] as const;

export const RECURRING_LABELS: Record<string, string> = {
  none: '不重复',
  '每天': '每天',
  '每周': '每周',
  '每月': '每月',
  '工作日': '工作日',
  '每两周': '每两周',
};

export const CATEGORY_COLORS: Record<string, string> = {
  '工作': '#4A90D9',
  '学习': '#9B59B6',
  '健康': '#27AE60',
  '生活': '#F39C12',
  '其他': '#95A5A6',
};

export const CATEGORY_LABELS = ['工作', '学习', '健康', '生活', '其他'] as const;

export const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', label: 'V3 Chat (文本)' },
  { id: 'deepseek-reasoner', label: 'V3 Reasoner (推理)' },
  { id: 'deepseek-v4-flash', label: 'V4 Flash (文本+图片)' },
  { id: 'deepseek-v4-pro', label: 'V4 Pro (文本+图片)' },
] as const;
