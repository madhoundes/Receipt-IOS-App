import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from './icons';
import { colors, font, radius } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'dark' | 'ghost' | 'destructive' | 'onAccent' | 'ghostOnAccent';

export function Button({
  title, onPress, variant = 'primary', loading = false, disabled = false, icon, style, compact = false,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  /** Smaller button for side-by-side pairs. */
  compact?: boolean;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border ?? v.bg },
        compact && { height: 46, borderRadius: 23, paddingHorizontal: 8, gap: 6 },
        (disabled || loading) && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, compact && { fontSize: 14 }, { color: v.fg }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.accent, fg: '#FFFFFF' },
  secondary: { bg: colors.accentSoft, fg: colors.accent },
  tinted: { bg: colors.accentSoft, fg: colors.accent },
  dark: { bg: '#000000', fg: '#FFFFFF' },
  ghost: { bg: 'transparent', fg: colors.accent },
  destructive: { bg: colors.dangerSoft, fg: colors.danger },
  onAccent: { bg: '#FFFFFF', fg: colors.accent },
  ghostOnAccent: { bg: 'transparent', fg: '#FFFFFF' },
};

/** Grouped iOS-style field: small label above the input. */
export function Field({
  label, error, secure, ...input
}: TextInputProps & { label: string; error?: string; secure?: boolean }) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          {...input}
          secureTextEntry={hidden}
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          style={styles.fieldInput}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden(h => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.eye}
            hitSlop={8}
          >
            {hidden ? <Eye size={20} color={colors.textMuted} /> : <EyeOff size={20} color={colors.textMuted} />}
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

export function FieldGroup({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View style={styles.group}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <View style={styles.separator} />}
          {child}
        </View>
      ))}
    </View>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50, borderRadius: 25, borderWidth: 0, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20,
  },
  buttonText: { ...font.semibold, fontSize: 17 },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 16 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 8, minHeight: 48 },
  fieldLabel: { ...font.regular, fontSize: 17, color: colors.text, width: 92 },
  fieldInput: { ...font.regular, flex: 1, fontSize: 17, color: colors.text, paddingVertical: 10, minWidth: 0 },
  fieldError: { ...font.regular, fontSize: 13, color: colors.danger, paddingHorizontal: 16, paddingBottom: 8 },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#C6C6C8' },
  dividerText: { ...font.regular, fontSize: 13, color: colors.textMuted },
});

/** iOS segmented control. */
export function Segmented<T extends string>({ options, value, onChange, compact }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; compact?: boolean;
}) {
  return (
    <View style={seg.wrap} accessibilityRole="tablist">
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[seg.item, on && seg.on]}
            accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[seg.text, compact && { fontSize: 13 }, on && seg.textOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Top bar with a back button, optional title and right-side action. */
export function NavBar({ onBack, backLabel = 'Back', title, right }: {
  onBack: () => void; backLabel?: string; title?: string; right?: React.ReactNode;
}) {
  return (
    <View style={seg.nav}>
      <Pressable onPress={onBack} style={seg.navBack} accessibilityRole="button" accessibilityLabel={backLabel} hitSlop={6}>
        <ChevronLeft size={20} color={colors.text} />
      </Pressable>
      {!!title && <Text style={seg.navTitle} numberOfLines={1}>{title}</Text>}
      <View style={seg.navRight}>{right}</View>
    </View>
  );
}

/** Settings-style row: label on the left, value / switch / chevron on the right. */
export function SettingRow({ label, value, onPress, toggle, onToggle, danger, first, icon, sub }: {
  label: string; value?: string; onPress?: () => void; toggle?: boolean; onToggle?: (v: boolean) => void;
  danger?: boolean; first?: boolean; icon?: React.ReactNode; sub?: string;
}) {
  const content = (
    <View style={[seg.row, !first && seg.rowBorder]}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[seg.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
        {!!sub && <Text style={seg.rowSub}>{sub}</Text>}
      </View>
      {!!value && <Text style={seg.rowValue}>{value}</Text>}
      {toggle !== undefined && (
        <Switch value={toggle} onValueChange={onToggle} trackColor={{ true: '#0B7A55', false: '#D1D1D6' }}
          thumbColor="#FFFFFF" ios_backgroundColor="#D1D1D6" accessibilityLabel={label} />
      )}
      {onPress && toggle === undefined && !danger && <ChevronRight size={16} color="#AEAEB2" />}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{content}</Pressable> : content;
}

export function Section({ title, children, footer }: { title?: string; children: React.ReactNode; footer?: string }) {
  return (
    <View style={{ gap: 8 }}>
      {!!title && <Text style={seg.sectionTitle}>{title}</Text>}
      <View style={seg.sectionBody}>{children}</View>
      {!!footer && <Text style={seg.footer}>{footer}</Text>}
    </View>
  );
}

const seg = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 9, padding: 2 },
  item: { flex: 1, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  on: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  text: { ...font.regular, fontSize: 13, color: colors.text },
  textOn: { ...font.semibold, color: colors.text },
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  navBack: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  navText: { ...font.medium, fontSize: 17, color: colors.accent },
  navTitle: { position: 'absolute', left: 80, right: 80, textAlign: 'center', ...font.semibold, fontSize: 17, color: colors.text },
  navRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 48, paddingVertical: 8, backgroundColor: colors.card },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  rowLabel: { ...font.regular, fontSize: 17, color: colors.text },
  rowSub: { ...font.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rowValue: { ...font.regular, fontSize: 17, color: colors.textSecondary },
  sectionTitle: { ...font.regular, fontSize: 13, textTransform: 'uppercase', color: colors.textSecondary, paddingHorizontal: 16 },
  sectionBody: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  footer: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16 },
});
