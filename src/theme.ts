// Design tokens from the Receiptfy canvas. Screens use these instead of raw values.
export const colors = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  accent: '#0062CC',
  accentPressed: '#004FA3',
  accentSoft: '#E3EEFF',
  text: '#111114',
  textSecondary: '#55555C',
  textMuted: '#6B6B72',
  placeholder: '#8A8A90',
  separator: '#E5E5EA',
  border: '#D1D1D6',
  fill: '#E4E4EA',
  danger: '#C0271B',
  success: '#12805C',
  successSoft: '#DDF4EA',
  warnBg: '#FFF4E5',
  warnBorder: '#F5C98A',
  warnText: '#7A2A06',
  tax: '#C2410C',
  taxText: '#A3360A',
  taxSoft: '#FDEBDD',
  dark: '#0B0B0D',
};

export const radius = { sm: 10, md: 12, lg: 16, xl: 20, pill: 999 };

// Custom fonts need one family per weight; fontWeight is ignored on Android.
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
};

export const type = {
  largeTitle: { fontFamily: fonts.extrabold, fontSize: 34, letterSpacing: -1, color: colors.text },
  title: { fontFamily: fonts.extrabold, fontSize: 28, letterSpacing: -0.6, color: colors.text },
  headline: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, color: colors.text },
  subhead: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.textSecondary },
  caption: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' as const, color: colors.textSecondary },
  money: { fontFamily: fonts.mono, fontSize: 16, color: colors.text },
};
