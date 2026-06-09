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
    id: 'pixel',
    name: '像素黑白',
    colors: {
      primary: '#000', primaryLight: '#F0F0F0', bg: '#FFF', card: '#FFF',
      text: '#000', textLight: '#666', textMuted: '#999', border: '#000',
      danger: '#000', success: '#000', warning: '#000',
      chatBubbleAI: '#FFF', chatBubbleUser: '#000', chatBubbleAIText: '#000', chatBubbleUserText: '#FFF',
      headerBg: '#000', headerText: '#FFF', tabBarActive: '#000', inputBg: '#F5F5F5',
      gradientStart: '#FFF', gradientEnd: '#FFF',
    },
  },
  {
    id: 'pixel-dark',
    name: '像素暗黑',
    colors: {
      primary: '#FFF', primaryLight: '#222', bg: '#000', card: '#111',
      text: '#FFF', textLight: '#999', textMuted: '#666', border: '#FFF',
      danger: '#FFF', success: '#FFF', warning: '#FFF',
      chatBubbleAI: '#111', chatBubbleUser: '#FFF', chatBubbleAIText: '#FFF', chatBubbleUserText: '#000',
      headerBg: '#FFF', headerText: '#000', tabBarActive: '#FFF', inputBg: '#222',
      gradientStart: '#000', gradientEnd: '#000',
    },
  },
  {
    id: 'pixel-news',
    name: '像素新闻',
    colors: {
      primary: '#000', primaryLight: '#F5F0E8', bg: '#F8F6F0', card: '#FFF',
      text: '#111', textLight: '#666', textMuted: '#999', border: '#000',
      danger: '#000', success: '#000', warning: '#000',
      chatBubbleAI: '#FFF', chatBubbleUser: '#000', chatBubbleAIText: '#000', chatBubbleUserText: '#FFF',
      headerBg: '#000', headerText: '#FFF', tabBarActive: '#000', inputBg: '#F0EDE5',
      gradientStart: '#F8F6F0', gradientEnd: '#F5F0E8',
    },
  },
  {
    id: 'pixel-grid',
    name: '像素网格',
    colors: {
      primary: '#000', primaryLight: '#EEE', bg: '#FFF', card: '#FFF',
      text: '#000', textLight: '#555', textMuted: '#888', border: '#000',
      danger: '#000', success: '#000', warning: '#000',
      chatBubbleAI: '#FFF', chatBubbleUser: '#000', chatBubbleAIText: '#000', chatBubbleUserText: '#FFF',
      headerBg: '#000', headerText: '#FFF', tabBarActive: '#000', inputBg: '#F0F0F0',
      gradientStart: '#FFF', gradientEnd: '#FFF',
    },
  },
  {
    id: 'pixel-green',
    name: '像素绿屏',
    colors: {
      primary: '#0F0', primaryLight: '#001100', bg: '#001100', card: '#002200',
      text: '#0F0', textLight: '#0A0', textMuted: '#060', border: '#0F0',
      danger: '#0F0', success: '#0F0', warning: '#0F0',
      chatBubbleAI: '#002200', chatBubbleUser: '#0F0', chatBubbleAIText: '#0F0', chatBubbleUserText: '#000',
      headerBg: '#0F0', headerText: '#000', tabBarActive: '#0F0', inputBg: '#001A00',
      gradientStart: '#001100', gradientEnd: '#002200',
    },
  },
  {
    id: 'pixel-amber',
    name: '像素琥珀',
    colors: {
      primary: '#000', primaryLight: '#FFF8E8', bg: '#FFFAF0', card: '#FFF',
      text: '#111', textLight: '#777', textMuted: '#AAA', border: '#000',
      danger: '#000', success: '#000', warning: '#000',
      chatBubbleAI: '#FFF', chatBubbleUser: '#000', chatBubbleAIText: '#000', chatBubbleUserText: '#FFF',
      headerBg: '#000', headerText: '#FFF', tabBarActive: '#000', inputBg: '#FFF4E0',
      gradientStart: '#FFFAF0', gradientEnd: '#FFF8E8',
    },
  },
];

export default themes;

export function getThemeById(id: string): ThemeDefinition {
  return themes.find(t => t.id === id) || themes[0];
}
