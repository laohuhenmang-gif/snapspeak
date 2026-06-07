export const COLORS = {
  primary: '#000000',
  primaryDark: '#000000',
  primaryLight: '#E0E0E0',
  danger: '#CC3333',
  success: '#22863A',
  warning: '#B08800',
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  textLight: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  priorityHigh: '#000000',
  priorityMedium: '#666666',
  priorityLow: '#999999',
  inputBg: '#F5F5F5',
  chatBubbleUser: '#000000',
  chatBubbleUserText: '#FFFFFF',
  chatBubbleAI: '#F0F0F0',
  chatBubbleAIText: '#000000',
};

// 深色模式颜色
export const DARK_COLORS = {
  bg: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#636366',
  border: '#38383A',
  inputBg: '#2C2C2E',
  chatBubbleUser: '#0A84FF',
  chatBubbleUserText: '#FFFFFF',
  chatBubbleAI: '#2C2C2E',
  chatBubbleAIText: '#FFFFFF',
  priorityHigh: '#FF453A',
  priorityMedium: '#FF9F0A',
  priorityLow: '#30D158',
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
  '工作': '#000000',
  '学习': '#444444',
  '健康': '#888888',
  '生活': '#BBBBBB',
  '其他': '#CCCCCC',
};

export const CATEGORY_LABELS = ['工作', '学习', '健康', '生活', '其他'] as const;

export const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', label: 'V3 Chat (文本+图片)' },
  { id: 'deepseek-reasoner', label: 'V3 Reasoner (推理)' },
] as const;
