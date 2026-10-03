import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from '../../components/icons';
import { Button, Divider, Field, FieldGroup } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { AuthError, isValidEmail, MIN_PASSWORD_LENGTH } from '../../services/auth';
import { triggerHaptic } from '../../utils/nativeUtils';
import { colors, font, type } from '../../theme';

export default function SignUpScreen({ navigation }: any) {
  const { signUp, signInWithApple } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState<'email' | 'apple' | null>(null);

  const submit = async () => {
    const next = {
      name: name.trim() ? undefined : 'Enter your name.',
      email: isValidEmail(email) ? undefined : 'Enter a valid email address.',
      password: password.length >= MIN_PASSWORD_LENGTH ? undefined : `At least ${MIN_PASSWORD_LENGTH} characters.`,
    };
    setErrors(next);
    if (next.name || next.email || next.password) { triggerHaptic('error'); return; }
    setLoading('email');
    try {
      await signUp(name, email, password);
      triggerHaptic('success');
    } catch (e) {
      triggerHaptic('error');
      Alert.alert('Could not create account', e instanceof AuthError ? e.message : 'Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const apple = async () => {
    setLoading('apple');
    try { await signInWithApple(); } catch { Alert.alert('Apple sign in failed', 'Please try again.'); } finally { setLoading(null); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.nav}>
            {navigation.canGoBack() && (
              <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back} hitSlop={6}>
                <ChevronLeft size={22} color={colors.text} />
              </Pressable>
            )}
          </View>
          <Text style={type.largeTitle} accessibilityRole="header">Create your account</Text>
          <Text style={styles.sub}>Your receipts sync to every device you sign in on.</Text>

          <Button title="Sign up with Apple" variant="dark" onPress={apple} loading={loading === 'apple'} disabled={!!loading} />
          <Divider label="or" />

          <FieldGroup>
            <Field label="Name" placeholder="Your name" value={name} onChangeText={setName}
              autoComplete="name" textContentType="name" error={errors.name} returnKeyType="next" />
            <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" error={errors.email} />
            <Field label="Password" placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} value={password} onChangeText={setPassword}
              secure autoComplete="new-password" textContentType="newPassword" error={errors.password} onSubmitEditing={submit} />
          </FieldGroup>
          <Text style={styles.terms}>By continuing you agree to the Terms and Privacy Policy. Totals are for your records, not tax advice.</Text>

          <Button title="Create Account" onPress={submit} loading={loading === 'email'} disabled={!!loading} />

          <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="link" style={styles.switch}>
            <Text style={styles.switchText}>Already have an account? <Text style={styles.switchLink}>Log In</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 24 },
  nav: { height: 44, justifyContent: 'center', marginBottom: 6 },
  back: { width: 44, height: 44, justifyContent: 'center' },
  sub: { ...font.regular, fontSize: 17, color: colors.textSecondary, marginTop: 6, marginBottom: 16 },
  terms: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16, marginTop: 8, marginBottom: 14 },
  switch: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 8 },
  switchText: { ...font.regular, fontSize: 15, color: colors.textSecondary },
  switchLink: { ...font.semibold, color: colors.accent },
});
