import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from '../../components/icons';
import { Button, Divider, Field, FieldGroup } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { AuthError, isValidEmail } from '../../services/auth';
import { triggerHaptic } from '../../utils/nativeUtils';
import { colors, font, type } from '../../theme';

export default function LoginScreen({ navigation }: any) {
  const { signIn, signInWithApple, sendPasswordReset, completeOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState<'email' | 'apple' | 'reset' | null>(null);

  const submit = async () => {
    if (!isValidEmail(email) || !password) { setError('Enter your email and password.'); triggerHaptic('error'); return; }
    setError(undefined);
    setLoading('email');
    try {
      // Returning users skip the walkthrough next time.
      await completeOnboarding();
      await signIn(email, password);
      triggerHaptic('success');
    } catch (e) {
      triggerHaptic('error');
      setError(e instanceof AuthError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const apple = async () => {
    setLoading('apple');
    try { await completeOnboarding(); await signInWithApple(); } catch { Alert.alert('Apple sign in failed', 'Please try again.'); } finally { setLoading(null); }
  };

  const forgot = async () => {
    if (!isValidEmail(email)) { setError('Enter your email first, then tap “Forgot password?”.'); return; }
    setLoading('reset');
    try {
      await sendPasswordReset(email);
      Alert.alert('Check your inbox', `We sent a reset link to ${email.trim()}.`);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Could not send the reset email.');
    } finally {
      setLoading(null);
    }
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
          <Text style={type.largeTitle} accessibilityRole="header">Welcome back</Text>
          <Text style={styles.sub}>Log in to pick up where you left off.</Text>

          <Button title="Continue with Apple" variant="dark" onPress={apple} loading={loading === 'apple'} disabled={!!loading} />
          <Divider label="or" />

          <FieldGroup>
            <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
            <Field label="Password" placeholder="Your password" value={password} onChangeText={setPassword}
              secure autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
          </FieldGroup>
          {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}

          <Pressable onPress={forgot} disabled={!!loading} style={styles.forgot} accessibilityRole="button">
            <Text style={styles.link}>{loading === 'reset' ? 'Sending…' : 'Forgot password?'}</Text>
          </Pressable>

          <Button title="Log In" onPress={submit} loading={loading === 'email'} disabled={!!loading} />

          <Pressable onPress={() => navigation.navigate('SignUp')} accessibilityRole="link" style={styles.switch}>
            <Text style={styles.switchText}>New to Receipt TaX? <Text style={styles.switchLink}>Create an account</Text></Text>
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
  error: { ...font.regular, fontSize: 13, color: colors.danger, marginTop: 8, paddingHorizontal: 16 },
  forgot: { alignSelf: 'flex-end', height: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { ...font.regular, fontSize: 15, color: colors.accent },
  switch: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 8 },
  switchText: { ...font.regular, fontSize: 15, color: colors.textSecondary },
  switchLink: { ...font.semibold, color: colors.accent },
});
