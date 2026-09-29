import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useReceipts } from '../context/ReceiptContext';
import { confirmAction } from '../utils/nativeUtils';
import { colors, fonts, radius, type } from '../theme';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

/** Account basics for the prototype; full settings come in a later step. */
export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { userProfile } = useReceipts();

  const confirmSignOut = () => confirmAction('Sign out?', undefined, 'Sign Out', signOut);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.largeTitle, { paddingHorizontal: 4 }]}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(user?.name ?? '')}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>
        <View style={styles.group}>
          <Row label="Currency" value={userProfile.currency} />
          <Row label="Default Tax %" value={`${userProfile.hstDefaultPercent}%`} border />
          <Row label="Signed in with" value={user?.provider === 'apple' ? 'Apple' : 'Email'} border />
        </View>
        <Pressable style={styles.signOut} onPress={confirmSignOut} accessibilityRole="button">
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ label, value, border }: { label: string; value: string; border?: boolean }) => (
  <View style={[styles.row, border && styles.rowBorder]}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 22 },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 24, color: '#FFFFFF' },
  name: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.text },
  email: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, minHeight: 52 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowLabel: { fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  rowValue: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary },
  signOut: { height: 52, borderRadius: radius.lg, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  signOutText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.danger },
});
