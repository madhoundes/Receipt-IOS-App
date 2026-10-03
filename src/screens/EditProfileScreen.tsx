import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { useReceipts } from '../context/ReceiptContext';
import { Field, FieldGroup, Section, SettingRow } from '../components/ui';
import { AuthError, isValidEmail } from '../services/auth';
import { persistReceiptPhoto } from '../utils/photos';
import { triggerHaptic } from '../utils/nativeUtils';
import { initials } from './ProfileScreen';
import { colors, font, type } from '../theme';

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateProfile: updateAccount } = useAuth();
  const { userProfile, updateProfile } = useReceipts();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatar, setAvatar] = useState(userProfile.avatar);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 };
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError('Camera access is needed to take a headshot.'); return; }
    }
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) setAvatar(res.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return; }
    setSaving(true);
    try {
      await updateAccount({ name, email });
      const stored = avatar && avatar !== userProfile.avatar ? await persistReceiptPhoto(avatar, `avatar_${Date.now()}`) : avatar;
      updateProfile({ ...userProfile, avatar: stored });
      triggerHaptic('success');
      navigation.goBack();
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Could not save your profile.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.navBtn} accessibilityRole="button"><Text style={styles.navText}>Cancel</Text></Pressable>
        <Text style={type.headline}>Edit Profile</Text>
        <Pressable onPress={save} disabled={saving} style={[styles.navBtn, { alignItems: 'flex-end' }]} accessibilityRole="button">
          <Text style={[styles.navText, { ...font.bold }, saving && { opacity: 0.5 }]}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 10 }}>
            {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials(name)}</Text></View>
            )}
            <Pressable onPress={() => pick('library')} accessibilityRole="button"><Text style={styles.link}>Change Photo</Text></Pressable>
          </View>
          <FieldGroup>
            <Field label="Name" value={name} onChangeText={t => { setName(t); setError(undefined); }} autoComplete="name" />
            <Field label="Email" value={email} onChangeText={t => { setEmail(t); setError(undefined); }}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          </FieldGroup>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Text style={{ ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16, marginTop: -8 }}>Your email is used to sign in and to send exports you request.</Text>
          <Section title="Photo options">
            <SettingRow first label="Take Headshot" onPress={() => pick('camera')} icon={<Camera size={20} color={colors.accent} />} />
            <SettingRow label="Choose from Library" onPress={() => pick('library')} icon={<ImageIcon size={20} color={colors.accent} />} />
            {!!avatar && <SettingRow label="Remove Photo" danger onPress={() => setAvatar(undefined)} />}
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  navBtn: { minWidth: 70, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  navText: { ...font.regular, fontSize: 17, color: colors.accent },
  content: { padding: 16, gap: 24, paddingTop: 20 },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...font.bold, fontSize: 38, color: colors.accent },
  link: { ...font.regular, fontSize: 17, color: colors.accent, padding: 6 },
  error: { ...font.medium, fontSize: 14, color: colors.danger, paddingHorizontal: 4 },
});
