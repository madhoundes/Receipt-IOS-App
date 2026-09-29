import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { Button, Divider, Field, FieldGroup } from '../../components/ui';
import { AppleIcon } from '../../components/AppleIcon';
import { useAuth } from '../../context/AuthContext';
import { AuthError, isValidEmail, MIN_PASSWORD_LENGTH } from '../../services/auth';
import { triggerHaptic } from '../../utils/nativeUtils';
import { colors, fonts, type } from '../../theme';

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
          {navigation.canGoBack() && (
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
              <ChevronLeft size={24} color={colors.accent} />
            </Pressable>
          )}
          <Text style={type.largeTitle}>Create Account</Text>
          <Text style={[type.subhead, styles.sub]}>Start tracking your expenses today.</Text>

          <FieldGroup>
            <Field label="Full name" placeholder="Jane Appleseed" value={name} onChangeText={setName}
              autoComplete="name" textContentType="name" error={errors.name} returnKeyType="next" />
            <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" error={errors.email} />
            <Field label="Password" placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} value={password} onChangeText={setPassword}
              secure autoComplete="new-password" textContentType="newPassword" error={errors.password} onSubmitEditing={submit} />
          </FieldGroup>

          <Button title="Sign Up" onPress={submit} loading={loading === 'email'} disabled={!!loading}
            icon={<ArrowRight size={20} color="#FFFFFF" />} style={{ marginTop: 20 }} />
          <Divider label="or" />
          <Button title="Continue with Apple" variant="dark" onPress={apple} loading={loading === 'apple'} disabled={!!loading}
            icon={<AppleIcon color="#FFFFFF" />} />

          <View style={{ flex: 1, minHeight: 32 }} />
          <Text style={styles.terms}>By signing up, you agree to our Terms of Service and Privacy Policy.</Text>
          <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="link" style={styles.switch}>
            <Text style={styles.switchText}>Already have an account? <Text style={styles.link}>Log In</Text></Text>
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
  terms: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  switch: { alignItems: 'center', paddingVertical: 12 },
  switchText: { fontFamily: fonts.regular, fontSize: 15, color: '#3A3A40' },
  link: { fontFamily: fonts.bold, color: colors.accent },
});
