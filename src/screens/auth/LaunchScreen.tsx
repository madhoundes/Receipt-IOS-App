import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReceiptText } from 'lucide-react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Button } from '../../components/ui';
import { colors, fonts } from '../../theme';

export default function LaunchScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.ring, { width: 360, height: 360, right: -120, top: -80 }]} />
      <View style={[styles.ring, { width: 240, height: 240, right: -60, top: -20 }]} />
      <View style={styles.blob} />

      <View style={styles.center}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.logo}>
          <ReceiptText size={52} color={colors.accent} strokeWidth={2} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(150)} style={styles.title}>Receiptfy</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250)} style={styles.tagline}>Every receipt, captured and sorted.</Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(400)} style={styles.actions}>
        <Button title="Get Started" variant="onAccent" onPress={() => navigation.navigate('Onboarding')} />
        <Button title="I already have an account" variant="ghostOnAccent" onPress={() => navigation.navigate('Login')} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.accent, paddingHorizontal: 24 },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)' },
  blob: { position: 'absolute', left: -140, bottom: 170, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.06)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logo: {
    width: 96, height: 96, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#001E46', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 20 }, marginBottom: 10,
  },
  title: { fontFamily: fonts.extrabold, fontSize: 40, letterSpacing: -1.2, color: '#FFFFFF' },
  tagline: { fontFamily: fonts.regular, fontSize: 17, color: '#E3EEFF', textAlign: 'center' },
  actions: { gap: 6, paddingBottom: 16 },
});
