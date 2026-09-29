# Receiptfy

Snap a receipt, read the total and HST with OCR, keep the original photo, and see HST totals by week, month, quarter or year for tax time.

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
| History | Receipt list, search, "HST this month" card |
| HST Summary | Week / month / quarter / year totals, chart, by-category, fix receipts whose tax wasn't read, CSV export |
| Receipt Detail | Items, subtotal / HST / total, tax review banner, notes, share, CSV, delete |
| Profile | Account info, sign out |
| Camera | Captures a photo; OCR is still a stub (see below) |
| Categories, Insights | Placeholders; designed, not built yet |

## Where to plug in the real services

| What | Where | Notes |
|---|---|---|
| **Auth** | `src/services/auth.ts` | Implement the `AuthService` interface (email, Apple, password reset, sign out) and point `auth` at it. Screens only use `useAuth()` from `src/context/AuthContext.tsx`. |
| **Sign in with Apple** | `auth.signInWithApple()` | Add `expo-apple-authentication`; Apple requires it when other social logins exist. |
| **Receipt storage** | `src/context/ReceiptContext.tsx` | Today: AsyncStorage on the device, not tied to a user. Move to your backend and scope data per user. |
| **OCR** | `src/screens/CameraCaptureScreen.tsx` (`handleCapture`) | Currently returns a hard-coded receipt. The legacy web app called Gemini (`legacy-web/components/CameraCaptureView.tsx`); call OCR from your server, not from the app, so the API key stays private. |
| **Receipt photos** | `imageName` on each receipt | Currently a local file URI. Upload to storage and save the URL. |
| **Demo data** | `src/config.ts` → `seedDemoData` | Turn off for production. |
| **App identity** | `app.json` | `bundleIdentifier` / `package` are placeholders (`com.receiptfy.app`). Add icon and splash images. |

## Project layout

```
App.tsx                      fonts, providers, navigator
src/
  theme.ts                   colors, fonts, type scale from the design
  components/ui.tsx          Button, Field, FieldGroup, Divider
  navigation/AppNavigator    auth-gated stack + tabs
  context/                   AuthContext, ReceiptContext
  services/auth.ts           AuthService interface + mock
  utils/tax.ts               HST rules and period totals (unit-tested)
  screens/auth/              Launch, Onboarding, SignUp, Login
  screens/                   History, Camera, ReceiptDetail, TaxSummary, Profile
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
