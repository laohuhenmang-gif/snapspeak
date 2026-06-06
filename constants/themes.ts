export interface ThemeColors {
  primary: string;
  primaryLight: string;
  bg: string;
  card: string;
  text: string;
  textLight: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  chatBubbleAI: string;
  chatBubbleUser: string;
  chatBubbleAIText: string;
  chatBubbleUserText: string;
  headerBg: string;
  headerText: string;
  tabBarActive: string;
  inputBg: string;
  gradientStart: string;
  gradientEnd: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  colors: ThemeColors;
}

const themes: ThemeDefinition[] = [
  {
    id: 'doubao',
    name: '豆包橙',
    colors: {
      primary: '#FF6B35',
      primaryLight: '#FFF0E8',
      bg: '#F7F7F7',
      card: '#FFFFFF',
      text: '#1A1A2E',
      textLight: '#666680',
      textMuted: '#9999AA',
      border: '#EEEEF0',
      danger: '#E74C3C',
      success: '#27AE60',
      warning: '#F39C12',
      chatBubbleAI: '#FFFFFF',
      chatBubbleUser: '#FF6B35',
      chatBubbleAIText: '#1A1A2E',
      chatBubbleUserText: '#FFFFFF',
      headerBg: '#FF6B35',
      headerText: '#FFFFFF',
      tabBarActive: '#FF6B35',
      inputBg: '#F0F0F3',
      gradientStart: '#F7F7F7',
      gradientEnd: '#FFF0E8',
    },
  },
  {
    id: 'mint',
    name: '薄荷绿',
    colors: {
      primary: '#00BFA5',
      primaryLight: '#E0F7F3',
      bg: '#F5FAF8',
      card: '#FFFFFF',
      text: '#1A2E2A',
      textLight: '#5A7A72',
      textMuted: '#8AA8A0',
      border: '#E0EDE8',
      danger: '#E74C3C',
      success: '#27AE60',
      warning: '#F39C12',
      chatBubbleAI: '#FFFFFF',
      chatBubbleUser: '#00BFA5',
      chatBubbleAIText: '#1A2E2A',
      chatBubbleUserText: '#FFFFFF',
      headerBg: '#00BFA5',
      headerText: '#FFFFFF',
      tabBarActive: '#00BFA5',
      inputBg: '#EDF5F2',
      gradientStart: '#F5FAF8',
      gradientEnd: '#E0F7F3',
    },
  },
  {
    id: 'lavender',
    name: '芋泥紫',
    colors: {
      primary: '#8B5CF6',
      primaryLight: '#F3EEFF',
      bg: '#F8F7FC',
      card: '#FFFFFF',
      text: '#1E1B3A',
      textLight: '#6E6A8A',
      textMuted: '#9690B0',
      border: '#EBE8F2',
      danger: '#E74C3C',
      success: '#27AE60',
      warning: '#F39C12',
      chatBubbleAI: '#FFFFFF',
      chatBubbleUser: '#8B5CF6',
      chatBubbleAIText: '#1E1B3A',
      chatBubbleUserText: '#FFFFFF',
      headerBg: '#8B5CF6',
      headerText: '#FFFFFF',
      tabBarActive: '#8B5CF6',
      inputBg: '#EFECF5',
      gradientStart: '#F8F7FC',
      gradientEnd: '#F3EEFF',
    },
  },
  {
    id: 'ocean',
    name: '深海蓝',
    colors: {
      primary: '#2D6BFF',
      primaryLight: '#E8EEFF',
      bg: '#F5F7FC',
      card: '#FFFFFF',
      text: '#1A2342',
      textLight: '#5A6A8A',
      textMuted: '#8A95B0',
      border: '#E4E8F0',
      danger: '#E74C3C',
      success: '#27AE60',
      warning: '#F39C12',
      chatBubbleAI: '#FFFFFF',
      chatBubbleUser: '#2D6BFF',
      chatBubbleAIText: '#1A2342',
      chatBubbleUserText: '#FFFFFF',
      headerBg: '#2D6BFF',
      headerText: '#FFFFFF',
      tabBarActive: '#2D6BFF',
      inputBg: '#EDF0F5',
      gradientStart: '#F5F7FC',
      gradientEnd: '#E8EEFF',
    },
  },
  {
    id: 'midnight',
    name: '暗夜黑',
    colors: {
      primary: '#6C7AFF',
      primaryLight: '#1E1E3A',
      bg: '#0E0E1A',
      card: '#1A1A2E',
      text: '#E8E8F0',
      textLight: '#9090AA',
      textMuted: '#606078',
      border: '#2A2A40',
      danger: '#FF6B6B',
      success: '#51CF66',
      warning: '#FFD43B',
      chatBubbleAI: '#1A1A2E',
      chatBubbleUser: '#6C7AFF',
      chatBubbleAIText: '#E8E8F0',
      chatBubbleUserText: '#FFFFFF',
      headerBg: '#141428',
      headerText: '#E8E8F0',
      tabBarActive: '#6C7AFF',
      inputBg: '#1A1A2E',
      gradientStart: '#0E0E1A',
      gradientEnd: '#1A1A2E',
    },
  },
  {
    id: 'dribbble',
    name: 'Dribbble 紫',
    colors: {
      primary: '#7C5CFC',
      primaryLight: '#EDE9FF',
      bg: '#F5F0FF',
      card: '#FFFFFF',
      text: '#2D1B69',
      textLight: '#7B6BAE',
      textMuted: '#A89CC8',
      border: '#E8E0F0',
      danger: '#FF6B6B',
      success: '#2ED573',
      warning: '#FF9F43',
      chatBubbleAI: '#FFFFFF',
      chatBubbleUser: '#7C5CFC',
      chatBubbleAIText: '#2D1B69',
      chatBubbleUserText: '#FFFFFF',
      headerBg: '#7C5CFC',
      headerText: '#FFFFFF',
      tabBarActive: '#7C5CFC',
      inputBg: '#F0ECFF',
      gradientStart: '#F5F0FF',
      gradientEnd: '#E8DFFF',
    },
  },
];

export default themes;

export function getThemeById(id: string): ThemeDefinition {
  return themes.find(t => t.id === id) || themes[0];
}
