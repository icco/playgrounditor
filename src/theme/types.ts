export type ThemeName = 'playgrounditor' | 'dracula' | 'solarized' | 'nord' | 'github';
export type AppearanceMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  primaryBg: string;
  primaryBorder: string;
  placeholder: string;
  danger: string;
  dangerBg: string;
  dangerText: string;
  inputBg: string;
  badgeBg: string;
  badgeText: string;
  overlay: string;
  cardShadow: string;
  // Syntax tokens for PR 2 & preview
  syntaxComment: string;
  syntaxKeyword: string;
  syntaxString: string;
  syntaxNumber: string;
  syntaxVariable: string;
  syntaxFunction: string;
}

export interface Theme {
  name: ThemeName;
  mode: 'light' | 'dark';
  displayName: string;
  colors: ThemeColors;
}
