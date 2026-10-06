// App switches and links. Fill in the TODO values before submitting to the App Store.
export const config = {
  /**
   * Fill an empty install with sample receipts so every screen has data.
   * On while developing (`npx expo start`), off in App Store and TestFlight builds.
   */
  seedDemoData: __DEV__,
  /**
   * Shows the Developer section in Profile (Replay Onboarding, sample receipts).
   * TODO(release): set to false before submitting to the App Store.
   */
  showDeveloperTools: true,
  // TODO(release): your real support address. While it is an example.com address, the app hides "Email Support".
  supportEmail: 'support@example.com',
  // TODO(release): the public web pages the App Store listing needs. The app itself shows these texts on its own screens.
  termsUrl: 'https://example.com/terms',
  privacyUrl: 'https://example.com/privacy',
};

export const hasSupportEmail = () => !config.supportEmail.endsWith('@example.com');
