export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  primaryLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  categoryWork: string;
  categoryStudy: string;
  categoryHealth: string;
  categoryLife: string;
  categoryOther: string;
  pixelBorder: string;
  pixelShadow: string;
}

export interface ThemeDef {
  id: string;
  label: string;
  colors: ThemeColors;
}

const pixel: ThemeColors = {
  background: '#f5f0e8',
  surface: '#ffffff',
  surfaceAlt: '#f0ebe0',
  primary: '#4a90d9',
  primaryLight: '#d0e4f7',
  text: '#2d2d2d',
  textSecondary: '#5a5a5a',
  textMuted: '#9a9a9a',
  border: '#d4cfc4',
  accent: '#ff6b35',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  priorityHigh: '#f44336',
  priorityMedium: '#ff9800',
  priorityLow: '#4caf50',
  categoryWork: '#4a90d9',
  categoryStudy: '#7c3aed',
  categoryHealth: '#4caf50',
  categoryLife: '#ff6b35',
  categoryOther: '#9e9e9e',
  pixelBorder: '#000000',
  pixelShadow: '#c0b8a8',
};

const pixelDark: ThemeColors = {
  ...pixel,
  background: '#1a1a2e',
  surface: '#252540',
  surfaceAlt: '#1e1e36',
  text: '#e8e8e8',
  textSecondary: '#b0b0b0',
  textMuted: '#707070',
  border: '#3a3a5a',
  pixelShadow: '#0e0e1e',
};

const themes: ThemeDef[] = [
  { id: 'pixel', label: '像素风（亮色）', colors: pixel },
  { id: 'pixel-dark', label: '像素风（暗色）', colors: pixelDark },
];

export function getThemeById(id: string): ThemeDef | undefined {
  return themes.find(t => t.id === id);
}

export default themes;
