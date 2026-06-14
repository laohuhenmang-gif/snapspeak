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

const forest: ThemeColors = {
  ...pixel,
  background: '#f0f4e8',
  surface: '#ffffff',
  surfaceAlt: '#e8f0dc',
  primary: '#2e7d32',
  primaryLight: '#c8e6c9',
  accent: '#ff8f00',
  pixelBorder: '#1b5e20',
  pixelShadow: '#a5d6a7',
};

const forestDark: ThemeColors = {
  ...forest,
  background: '#1a2e1a',
  surface: '#253525',
  surfaceAlt: '#1e2e1e',
  text: '#e8f5e9',
  textSecondary: '#a5d6a7',
  textMuted: '#66bb6a',
  border: '#3a5a3a',
  pixelShadow: '#0e1e0e',
};

const ocean: ThemeColors = {
  ...pixel,
  background: '#e8f4f8',
  surface: '#ffffff',
  surfaceAlt: '#dceef5',
  primary: '#0277bd',
  primaryLight: '#b3e5fc',
  accent: '#ff6d00',
  pixelBorder: '#01579b',
  pixelShadow: '#81d4fa',
};

const oceanDark: ThemeColors = {
  ...ocean,
  background: '#1a2a3e',
  surface: '#253545',
  surfaceAlt: '#1e2e3e',
  text: '#e1f5fe',
  textSecondary: '#81d4fa',
  textMuted: '#4fc3f7',
  border: '#3a4a5a',
  pixelShadow: '#0e1e2e',
};

const sunset: ThemeColors = {
  ...pixel,
  background: '#fdf2e8',
  surface: '#ffffff',
  surfaceAlt: '#fde8d0',
  primary: '#e65100',
  primaryLight: '#ffccbc',
  accent: '#6a1b9a',
  pixelBorder: '#bf360c',
  pixelShadow: '#ffab91',
};

const sunsetDark: ThemeColors = {
  ...sunset,
  background: '#2e1a0e',
  surface: '#3e2518',
  surfaceAlt: '#351e12',
  text: '#fbe9e7',
  textSecondary: '#ffccbc',
  textMuted: '#ff8a65',
  border: '#5a3a2a',
  pixelShadow: '#1e0e06',
};

const lavender: ThemeColors = {
  ...pixel,
  background: '#f3e8f9',
  surface: '#ffffff',
  surfaceAlt: '#ede0f5',
  primary: '#7b1fa2',
  primaryLight: '#e1bee7',
  accent: '#00897b',
  pixelBorder: '#4a148c',
  pixelShadow: '#ce93d8',
};

const lavenderDark: ThemeColors = {
  ...lavender,
  background: '#1e1a2e',
  surface: '#2a2540',
  surfaceAlt: '#231e36',
  text: '#f3e5f5',
  textSecondary: '#ce93d8',
  textMuted: '#ba68c8',
  border: '#4a3a5a',
  pixelShadow: '#0e0a1e',
};

const themes: ThemeDef[] = [
  { id: 'pixel', label: '像素风', colors: pixel },
  { id: 'pixel-dark', label: '像素风（暗色）', colors: pixelDark },
  { id: 'forest', label: '森林绿', colors: forest },
  { id: 'forest-dark', label: '森林绿（暗色）', colors: forestDark },
  { id: 'ocean', label: '海洋蓝', colors: ocean },
  { id: 'ocean-dark', label: '海洋蓝（暗色）', colors: oceanDark },
  { id: 'sunset', label: '日落橙', colors: sunset },
  { id: 'sunset-dark', label: '日落橙（暗色）', colors: sunsetDark },
  { id: 'lavender', label: '薰衣紫', colors: lavender },
  { id: 'lavender-dark', label: '薰衣紫（暗色）', colors: lavenderDark },
];

export function getThemeById(id: string): ThemeDef | undefined {
  return themes.find(t => t.id === id);
}

export default themes;
