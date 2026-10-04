import React from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { kit } from '../components/kit';
import { Button, NavBar } from '../components/ui';
import { config, hasSupportEmail } from '../config';
import { colors, font, themedStyles } from '../theme';

type Block = { q: string; a: string };

// Describes what this version of the app actually does. Review it with a lawyer before release.
const PRIVACY: Block[] = [
  { q: 'What the app stores', a: 'Your receipts: the original photo and the digital copy (store, date, items, amounts, category, notes). Your name, email and settings.' },
  { q: 'Where it is stored', a: 'On this device, inside the app. Original photos are kept in the app’s own folder and are never edited.' },
  // TODO(ocr): once a real reading service is connected, say here where the photo is sent and how long it is kept.
  { q: 'Reading a receipt', a: 'This version reads receipts with built-in sample data, so no photo leaves your device.' },
  { q: 'Sharing', a: 'Nothing is shared unless you choose to: exporting a PDF, CSV or JSON file, or sharing a receipt or its photo, opens the share sheet and you pick where it goes.' },
  { q: 'Notifications', a: 'Return reminders and the weekly summary are scheduled on your device. They are not sent from a server.' },
  { q: 'Deleting your data', a: 'Delete a receipt from its screen, or use Profile → Delete All Receipts. Removing the app removes everything stored in it.' },
  { q: 'Tax figures', a: 'Totals come from the tax read on each receipt. The app is a record-keeping tool, not tax advice. Check with your accountant before filing.' },
];

const HELP: Block[] = [
  { q: 'How do I add a receipt?', a: 'Tap the round Scan button, fit the whole receipt in the frame and take the photo. You can also import a photo or enter a receipt by hand.' },
  { q: 'Why does a receipt say “HST to review”?', a: 'No tax amount was read. Open it and tap “Add” to use the suggested amount, or “No tax” if the purchase had none. Until then it stays out of your HST total.' },
  { q: 'What are the two copies?', a: 'The Original is the photo exactly as captured, kept as proof for returns, warranty claims or a CRA review. The Digital copy is the record you search, edit and export.' },
  { q: 'How do return reminders work?', a: 'Open a receipt and tap “Add return reminder”. You get a notification before the window closes. Change the window and the lead time in Profile → Return Reminders.' },
  { q: 'How do I send receipts to my accountant?', a: 'Go to HST → Export, pick the period and the format (PDF summary, CSV or JSON), then share the file.' },
  { q: 'Why is there no HST on groceries?', a: 'Basic groceries are zero-rated in Canada, so that category is set to “None”. Change a category’s tax behaviour in Categories → Manage.' },
];

/** In-app Privacy Policy and Help. */
export default function InfoScreen({ route, navigation }: any) {
  const help = route.params?.kind === 'help';
  const blocks = help ? HELP : PRIVACY;
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar onBack={() => navigation.goBack()} title={help ? 'Help and FAQ' : 'Privacy Policy'} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={kit.card}>
          {blocks.map((b, i) => (
            <View key={b.q} style={[styles.block, i > 0 && kit.rowBorder]}>
              <Text style={styles.q}>{b.q}</Text>
              <Text style={styles.a}>{b.a}</Text>
            </View>
          ))}
        </View>
        {help && hasSupportEmail() && (
          <Button title="Email Support" variant="tinted" onPress={() => Linking.openURL(`mailto:${config.supportEmail}`)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 8, paddingBottom: 48, gap: 16 },
  block: { padding: 16, gap: 4, backgroundColor: colors.card },
  q: { ...font.semibold, fontSize: 17, color: colors.text },
  a: { ...font.regular, fontSize: 15, lineHeight: 21, color: colors.textSecondary },
}));
