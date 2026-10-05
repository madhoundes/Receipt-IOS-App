import React from 'react';
import { View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Button } from '../../components/ui';
import { colors, font, themedStyles } from '../../theme';

// A1 Launch
export default function LaunchScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.logo}>
          <Image source={require('../../../assets/brand-mark.png')} style={styles.mark} resizeMode="contain" accessibilityLabel="Maplestub" />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(150)} style={styles.title}>Maplestub</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250)} style={styles.tagline}>Every receipt, captured and sorted.</Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(400)} style={styles.actions}>
        <Button title="Get Started" variant="onAccent" onPress={() => navigation.navigate('Onboarding')} />
        <Button title="I already have an account" variant="ghostOnAccent" onPress={() => navigation.navigate('Login')}
          style={{ height: 44 }} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.accentFill, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  logo: {
    width: 108, height: 108, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 36, shadowOffset: { width: 0, height: 16 }, elevation: 8,
  },
  mark: { width: 62, height: 78 },
  title: { ...font.bold, fontSize: 34, letterSpacing: -0.4, color: '#FFFFFF' },
  tagline: { ...font.regular, fontSize: 17, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  actions: { gap: 6, paddingBottom: 12 },
}));
