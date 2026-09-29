import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, type } from '../theme';

/** Tab placeholder until the screen is built in a later step. */
export const comingSoon = (title: string) => function ComingSoon() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={[type.largeTitle, { paddingHorizontal: 20 }]}>{title}</Text>
      <View style={styles.center}>
        <Text style={type.headline}>Coming in the next build</Text>
        <Text style={[type.subhead, { textAlign: 'center' }]}>This screen is designed and scheduled for the next step.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 40 },
});
