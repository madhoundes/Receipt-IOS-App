import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
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
