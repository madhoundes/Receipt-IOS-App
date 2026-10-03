// Design tokens from the Receipt TaX V2 canvas (design/tokens.json). Screens use these instead of raw values.
import { Platform } from 'react-native';

export const colors = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  accent: '#0B7A55',
  accentPressed: '#08603F',
  accentSoft: '#E4F3EC',
  text: '#111113',
  textSecondary: '#6C6C70',
  textMuted: '#6C6C70',
  placeholder: '#8E8E93',
  separator: '#E0E0E5',
  border: '#D1D1D6',
  fill: 'rgba(118,118,128,0.12)',
  danger: '#D70015',
  dangerSoft: '#FDE7E9',
  success: '#0B7A55',
  successSoft: '#E4F3EC',
  warnBg: '#FFF8EE',
  warnBorder: '#F3D9B5',
  warnText: '#7A3F00',
  tax: '#B35C00',
  taxText: '#B35C00',
  taxSoft: '#FFF1DE',
  paper: '#FFFDF7',
  paperEdge: '#E9E4D6',
  paperInk: '#23211C',
  dark: '#0C0C0D',
};

export const radius = { sm: 8, md: 12, lg: 14, xl: 22, pill: 999 };
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 };

// SF Pro on iOS (the system font), the platform sans elsewhere. Weight comes from fontWeight.
const sans = Platform.select({ ios: 'System', android: 'sans-serif', default: '-apple-system, "SF Pro Display", system-ui, sans-serif' }) as string;
const monoFamily = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, "SF Mono", Menlo, monospace' }) as string;

/** Spread into a style: `{ ...font.bold, fontSize: 17 }`. */
export const font = {
  regular: { fontFamily: sans, fontWeight: '400' as const },
  medium: { fontFamily: sans, fontWeight: '500' as const },
  semibold: { fontFamily: sans, fontWeight: '600' as const },
  bold: { fontFamily: sans, fontWeight: '700' as const },
  extrabold: { fontFamily: sans, fontWeight: '700' as const },
  mono: { fontFamily: monoFamily, fontWeight: '500' as const },
  monoBold: { fontFamily: monoFamily, fontWeight: '700' as const },
};

// iOS Dynamic Type scale (Large).
export const type = {
  largeTitle: { ...font.bold, fontSize: 34, lineHeight: 41, letterSpacing: -0.4, color: colors.text },
  title: { ...font.bold, fontSize: 28, lineHeight: 34, color: colors.text },
  title2: { ...font.bold, fontSize: 22, lineHeight: 28, color: colors.text },
  title3: { ...font.semibold, fontSize: 20, lineHeight: 25, color: colors.text },
  headline: { ...font.semibold, fontSize: 17, lineHeight: 22, color: colors.text },
  body: { ...font.regular, fontSize: 17, lineHeight: 22, color: colors.text },
  subhead: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.textSecondary },
  footnote: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  caption: { ...font.medium, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  sectionLabel: { ...font.regular, fontSize: 13, textTransform: 'uppercase' as const, color: colors.textSecondary },
  money: { ...font.semibold, fontSize: 17, fontVariant: ['tabular-nums' as const], color: colors.text },
};
