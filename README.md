# Receipt TaX (V2)

Snap a receipt, read the total and HST with OCR, keep the original photo, and see HST totals by week, month, quarter or year for tax time.

> **V2.** This branch rebuilds the app on the new design in `design/` (green brand, system font, Iconsax icons, steady Lottie illustrations), in Light and Dark Mode (Profile → Appearance: System, Light or Dark). All six flows are converted: A (onboarding and account), B (capture), C (receipts, search, digital copy and original photo, return reminders with local notifications), D (Home, Insights, HST summary, export as PDF, CSV or JSON), E (categories, with reordering) and F (profile). Tabs are Home, Receipts, Categories and HST with a round Scan button; Profile opens from the avatar on Home. Run `npm install` after pulling: this version adds `@react-native-community/datetimepicker`, `expo-print` and `expo-notifications`. Still mock: receipt reading (OCR) and sign-in. Not built: cropping the original photo.

This is an **Expo (SDK 51) / React Native** prototype. The UI and on-device logic work end to end with mock auth and demo data, ready for a developer to connect the real backend, auth and store release.

The earlier web version (Vite + Gemini) lives in `legacy-web/` for reference only; it is not part of the app build.

## Run it

```bash
npm install
npx expo start          # press i for iOS simulator, a for Android, or scan the QR code with Expo Go
npm test                # HST calculation tests
npx tsc --noEmit        # type-check
```

## What works today

| Area | Status |
|---|---|
| Launch → 5-slide walkthrough → Sign Up / Log In | Built, validated forms, mock auth |
| Returning users | Skip the walkthrough and land on Log In |
| History | Grouped by Today / This week / month, search, CSV export, "HST this month" card, empty state |
| Scan flow | Camera Access → Scan (flash, import, manual entry) → Reading (progress, failure state) → Review with **Original** / **Digital copy** tabs, tax check and category sheet → Saved (also New Receipt for manual entry). Original photo is copied into app storage. Totals check with one-tap fixes for missing or mismatched HST |
| HST Summary | Week / month / quarter / year totals, chart, by-category, fix receipts whose tax wasn't read, CSV export |
| Receipt Detail | Items, subtotal / HST / total, tax review banner, notes, share, CSV, delete |
| Categories | Spend per category (This Month / 30 Days / YTD / All Time), search, detail with subcategory filter, Manage (pinned / all / hidden), create & edit (name, color, icon, subcategories, tax rule, keywords, priority, visibility, pin), merge, delete. Renaming or deleting moves the receipts |
| Insights | Total spend, receipts, average, HST (opens HST Summary), trend chart, top categories, tips |
| Profile | Avatar + Edit Profile (name, email, photo), currency, default tax %, manage categories, camera & OCR options, notifications, haptics, export (CSV month / all, JSON backup), delete all receipts, change password, help, privacy, about, sign out |

Saved but not acted on yet: **Auto-Crop**, **Show Brand Logos**, **OCR Confidence** (pass it to your OCR service), **Reduce Motion**, and the **notification** switches (needs `expo-notifications` + a server for weekly insights). Auto-Categorize and Haptic Feedback work today.

## Where to plug in the real services

| What | Where | Notes |
|---|---|---|
| **Auth** | `src/services/auth.ts` | Implement the `AuthService` interface (email, Apple, password reset, sign out) and point `auth` at it. Screens only use `useAuth()` from `src/context/AuthContext.tsx`. |
| **Sign in with Apple** | `auth.signInWithApple()` | Add `expo-apple-authentication`; Apple requires it when other social logins exist. |
| **Receipt storage** | `src/context/ReceiptContext.tsx` | Today: AsyncStorage on the device, not tied to a user. Move to your backend and scope data per user. |
| **OCR** | `src/services/ocr.ts` | Implement `OcrService.scanReceipt(imageUri)`. The mock rotates through three sample results (clean read, tax not printed, numbers that don't add up) so every state can be demoed. The legacy web app called Gemini (`legacy-web/components/CameraCaptureView.tsx`); call OCR from your server so the API key stays private. |
| **Receipt photos** | `src/utils/photos.ts` | Originals are copied to the app's documents folder (`receipts/<id>.jpg`) and deleted with the receipt. Upload to your storage and save the URL. |
| **Profile / password** | `auth.updateProfile()`, `auth.sendPasswordReset()` | Edit Profile and Change Password call these. |
| **Support & legal** | `src/config.ts` | `supportEmail`, `termsUrl`, `privacyUrl` are placeholders. |
| **Demo data** | `src/config.ts` → `seedDemoData` | Turn off for production. |
| **App identity** | `app.json` | `bundleIdentifier` / `package` are placeholders (`com.receiptfy.app`). Add icon and splash images. |

## Project layout

```
App.tsx                      fonts, providers, navigator
src/
  theme.ts                   colors, fonts, type scale from the design
  components/ui.tsx          Button, Field, FieldGroup, Divider, Segmented, NavBar, SettingRow, Section
  navigation/AppNavigator    auth-gated stack + tabs
  context/                   AuthContext, ReceiptContext
  services/auth.ts           AuthService interface + mock
  utils/tax.ts               HST rules and period totals (unit-tested)
  utils/spend.ts             spend ranges, per-category totals, trend, tips (unit-tested)
  screens/auth/              Launch, Onboarding, SignUp, Login
  screens/                   History, Camera, ScanResult, ScanSaved, ReceiptDetail, TaxSummary, Insights, Profile, EditProfile
  screens/categories/        Categories, CategoryDetail, ManageCategories, EditCategory
  services/ocr.ts            OcrService interface + mock
  data/demoReceipts.ts       sample receipts
```

## HST rules (`src/utils/tax.ts`)

- A receipt with a positive `hstAmount` counts toward HST.
- A category whose tax rule is `none` (e.g. Groceries), or a receipt the user marked "no tax", counts as no tax.
- Anything else is **flagged for review** instead of silently counting as $0, with a suggested amount from the category's rate.

Totals are for the user's records; they are not tax advice.

## Release checklist (for the developer)

1. Replace mock auth and storage; scope receipts per user.
2. Server-side OCR endpoint; wire it into the camera flow.
3. Real bundle IDs, icon, splash, privacy policy and terms URLs.
4. `npx eas build --platform ios` then `eas submit` (needs an Apple Developer account).
