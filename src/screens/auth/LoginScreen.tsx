import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { Button, Divider, Field, FieldGroup } from '../../components/ui';
import { AppleIcon } from '../../components/AppleIcon';
import { useAuth } from '../../context/AuthContext';
import { AuthError, isValidEmail } from '../../services/auth';
import { triggerHaptic } from '../../utils/nativeUtils';
import { colors, fonts, type } from '../../theme';

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
          {navigation.canGoBack() && (
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
              <ChevronLeft size={24} color={colors.accent} />
            </Pressable>
          )}
          <Text style={type.largeTitle}>Welcome back</Text>
          <Text style={[type.subhead, styles.sub]}>Log in to pick up where you left off.</Text>

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

          <Button title="Log In" onPress={submit} loading={loading === 'email'} disabled={!!loading}
            icon={<ArrowRight size={20} color="#FFFFFF" />} />
          <Divider label="or" />
          <Button title="Continue with Apple" variant="dark" onPress={apple} loading={loading === 'apple'} disabled={!!loading}
            icon={<AppleIcon color="#FFFFFF" />} />

          <View style={{ flex: 1, minHeight: 32 }} />
          <Pressable onPress={() => navigation.navigate('SignUp')} accessibilityRole="link" style={styles.switch}>
            <Text style={styles.switchText}>New to Receiptfy? <Text style={styles.link}>Create an account</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  back: { width: 44, height: 44, marginLeft: -10, justifyContent: 'center', alignItems: 'center' },
  sub: { marginTop: 8, marginBottom: 24, fontSize: 17 },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger, marginTop: 10, paddingHorizontal: 4 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 12 },
  switch: { alignItems: 'center', paddingVertical: 12 },
  switchText: { fontFamily: fonts.regular, fontSize: 15, color: '#3A3A40' },
  link: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent },
});
