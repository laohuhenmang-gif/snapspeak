export const COLORS = {
  primary: '#7C5CFC',
  primaryDark: '#5B3EE8',
  danger: '#FF6B6B',
  success: '#2ED573',
  warning: '#FF9F43',
  bg: '#F5F0FF',
  card: '#FFFFFF',
  text: '#2D1B69',
  textLight: '#7B6BAE',
  textMuted: '#A89CC8',
  border: '#E8E0F0',
  priorityHigh: '#FF6B6B',
  priorityMedium: '#FF9F43',
  priorityLow: '#2ED573',
  inputBg: '#F0ECFF',
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
  '工作': '#7C5CFC',
  '学习': '#A78BFA',
  '健康': '#2ED573',
  '生活': '#FF9F43',
  '其他': '#A89CC8',
};

export const CATEGORY_LABELS = ['工作', '学习', '健康', '生活', '其他'] as const;

export const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', label: 'V3 Chat (文本)' },
  { id: 'deepseek-reasoner', label: 'V3 Reasoner (推理)' },
  { id: 'deepseek-v4-flash', label: 'V4 Flash (文本+图片)' },
  { id: 'deepseek-v4-pro', label: 'V4 Pro (文本+图片)' },
] as const;
