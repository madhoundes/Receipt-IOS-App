import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { colors, fonts, radius } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'onAccent' | 'ghostOnAccent';

export function Button({
  title, onPress, variant = 'primary', loading = false, disabled = false, icon, style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
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
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.accent, fg: '#FFFFFF' },
  secondary: { bg: '#FFFFFF', fg: colors.text, border: colors.border },
  dark: { bg: colors.text, fg: '#FFFFFF' },
  ghost: { bg: 'transparent', fg: colors.accent },
  onAccent: { bg: '#FFFFFF', fg: '#0B2A55' },
  ghostOnAccent: { bg: 'transparent', fg: '#FFFFFF' },
};

/** Grouped iOS-style field: small label above the input. */
export function Field({
  label, error, secure, ...input
}: TextInputProps & { label: string; error?: string; secure?: boolean }) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={styles.field}>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          {...input}
          secureTextEntry={hidden}
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          style={styles.fieldInput}
        />
        {!!error && <Text style={styles.fieldError}>{error}</Text>}
      </View>
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
    height: 56, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20,
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 17 },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 },
  field: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, minHeight: 64 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  fieldInput: { fontFamily: fonts.regular, fontSize: 17, color: colors.text, paddingVertical: 4 },
  fieldError: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginTop: 2 },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
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
            <Text style={[seg.text, compact && { fontSize: 13 }, on && seg.textOn]} numberOfLines={1}>{o.label}</Text>
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
      <Pressable onPress={onBack} style={seg.navBack} accessibilityRole="button" accessibilityLabel={backLabel}>
        <ChevronLeft size={24} color={colors.accent} />
        <Text style={seg.navText} numberOfLines={1}>{backLabel}</Text>
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
        <Switch value={toggle} onValueChange={onToggle} trackColor={{ true: '#1F8F4E', false: '#D1D1D6' }}
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
  wrap: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 10, padding: 2 },
  item: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  on: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  text: { fontFamily: fonts.semibold, fontSize: 14, color: '#3A3A40' },
  textOn: { fontFamily: fonts.bold, color: colors.text },
  nav: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  navBack: { flexDirection: 'row', alignItems: 'center', height: 44, paddingRight: 8, maxWidth: '40%' },
  navText: { fontFamily: fonts.medium, fontSize: 17, color: colors.accent },
  navTitle: { position: 'absolute', left: 100, right: 100, textAlign: 'center', fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  navRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, paddingVertical: 8, backgroundColor: colors.card },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowLabel: { fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  rowSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rowValue: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textSecondary, paddingHorizontal: 8 },
  sectionBody: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  footer: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 8 },
});
