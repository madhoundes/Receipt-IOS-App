// Design tokens from the Maplestub V2 canvas (design/tokens.json), in Light and Dark.
// Screens read `colors` and build their styles with `themedStyles`, so both follow the active scheme.
import { ImageStyle, Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

export type Scheme = 'light' | 'dark';

const light = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  /** Raised surfaces: round header buttons, chips, the tab bar. */
  elevated: '#FFFFFF',
  pressed: '#F7F7FA',
  /** Brand colour for text and icons. */
  accent: '#0B7A55',
  /** Brand colour as a fill behind white text. */
  accentFill: '#0B7A55',
  accentPressed: '#08603F',
  accentSoft: '#E4F3EC',
  accentSoftText: '#0B5C40',
  accentBar: '#A9D8C5',
  text: '#111113',
  textSecondary: '#6C6C70',
  textMuted: '#6C6C70',
  placeholder: '#8E8E93',
  chevron: '#AEAEB2',
  grabber: '#C7C7CC',
  separator: '#E0E0E5',
  border: '#D1D1D6',
  fill: 'rgba(118,118,128,0.12)',
  segmentOn: '#FFFFFF',
  danger: '#D70015',
  dangerSoft: '#FDE7E9',
  success: '#0B7A55',
  successSoft: '#E4F3EC',
  warnBg: '#FFF8EE',
  warnBorder: '#F3D9B5',
  warnText: '#7A3F00',
  /** HST colour for text and icons. */
  tax: '#B35C00',
  /** HST colour as a fill behind white text. */
  taxFill: '#B35C00',
  taxText: '#B35C00',
  taxSoft: '#FFF1DE',
  taxBar: '#F1CFA3',
  paper: '#FFFDF7',
  paperEdge: '#E9E4D6',
  paperInk: '#23211C',
  paperMuted: '#6B675C',
  paperRule: '#CFC9B8',
  backdrop: 'rgba(0,0,0,0.35)',
  tabBar: 'rgba(255,255,255,0.96)',
  /** Camera and photo surfaces stay dark in both schemes. */
  dark: '#0C0C0D',
};

const dark: typeof light = {
  bg: '#000000',
  card: '#1C1C1E',
  elevated: '#2C2C2E',
  pressed: '#2C2C2E',
  accent: '#34C98E',
  accentFill: '#0F7F58',
  accentPressed: '#0B6748',
  accentSoft: '#0F2E22',
  accentSoftText: '#9BE3C4',
  accentBar: '#1F5A43',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#AEAEB2',
  placeholder: '#8E8E93',
  chevron: '#636366',
  grabber: '#48484A',
  separator: '#38383A',
  border: '#48484A',
  fill: 'rgba(118,118,128,0.24)',
  segmentOn: '#636366',
  danger: '#FF6961',
  dangerSoft: '#3A1517',
  success: '#34C98E',
  successSoft: '#0F2E22',
  warnBg: '#2A1D0C',
  warnBorder: '#5A3D17',
  warnText: '#FFD9A8',
  tax: '#FFB057',
  taxFill: '#B35C00',
  taxText: '#FFB057',
  taxSoft: '#3A2710',
  taxBar: '#5A3D17',
  paper: '#1F1E1A',
  paperEdge: '#33312A',
  paperInk: '#ECE8DC',
  paperMuted: '#A9A493',
  paperRule: '#4A473D',
  backdrop: 'rgba(0,0,0,0.6)',
  tabBar: 'rgba(44,44,46,0.96)',
  dark: '#0C0C0D',
};

const PALETTES: Record<Scheme, typeof light> = { light, dark };

/** The active palette. It is updated in place, so read it at render time, not at module load. */
export const colors: typeof light = { ...light };

let scheme: Scheme = 'light';
let version = 0;

export const getScheme = (): Scheme => scheme;
export const isDark = () => scheme === 'dark';

/** Switch palette. The app remounts its tree afterwards so every screen picks the change up. */
export function setScheme(next: Scheme) {
  if (next === scheme) return;
  scheme = next;
  Object.assign(colors, PALETTES[next]);
  version += 1;
}

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Drop-in for StyleSheet.create that rebuilds the sheet when the scheme changes:
 * `const styles = themedStyles(() => ({ ... }))`.
 */
export function themedStyles<T extends NamedStyles<T>>(make: () => T): T {
  let built = -1;
  let sheet = {} as T;
  return new Proxy({} as T, {
    get(_, key) {
      if (built !== version) { sheet = StyleSheet.create(make()); built = version; }
      return sheet[key as keyof T];
    },
  });
}

/**
 * Category and brand accents are picked for Light Mode. In Dark Mode they are lightened so they
 * stay readable on dark tints.
 */
export function tone(hex: string): string {
  if (scheme === 'light' || !/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.55);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
/** Soft background behind a colour that has already been through `tone`. */
export const soft = (hex: string): string => `${hex}${scheme === 'dark' ? '2E' : '1F'}`;

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

// iOS Dynamic Type scale (Large). Colours follow the active scheme.
const makeType = () => ({
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
});
type TypeScale = ReturnType<typeof makeType>;
let typeBuilt = -1;
let typeCache = makeType();
export const type: TypeScale = new Proxy({} as TypeScale, {
  get(_, key) {
    if (typeBuilt !== version) { typeCache = makeType(); typeBuilt = version; }
    return typeCache[key as keyof TypeScale];
  },
});
