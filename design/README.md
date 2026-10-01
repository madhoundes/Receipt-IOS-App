# Receipt TaX · iOS Design (V2)

Native iOS redesign of the Receiptfy MVP for the SwiftUI rebuild. Light Mode is complete; Dark Mode is next.

- Font: **SF Pro Display** (SF Mono on the receipt paper surface only)
- Icons: **SF Symbols** (names are listed on every screen spec and in `tokens.json`)
- Look: Apple Human Interface Guidelines, iOS 26 floating Liquid Glass tab bar, "digital paper receipt" surface

## What's in this folder

| Path | What it is |
|---|---|
| `tokens.json` | Colors (light and dark pairs), type scale, spacing, radius, motion rules. Map these into the Xcode asset catalog and a `Theme.swift`. |
| `canvas/` | Source of the design canvas: one `.dc.html` file per artboard plus `canvas.json` (layout, titles, flow rows). These are design files, not app code. |
| `lottie/steady/` | The app's animations (no morph). Use these with lottie-ios. |

## Navigation

Tab bar: **Home · Receipts · Categories · HST**, with a separate round **Scan** button.
Profile and Settings open from the avatar at the top of Home.

## Screens and flows

The canvas is laid out in rows, one row per flow. Codes match the artboard titles.

**A · Onboarding & Account**
A1 Launch → A2 Welcome (1 of 5) → A3 Walkthrough (3 of 5) → A4 Sign Up / A5 Log In → D1 Home

**B · Capture: Scan → Read → Review → Save**
B1 Camera Access (first run) → B2 Scan → B3 Reading Receipt → B4 Review Details → B8 Receipt Saved
- B5 Review · Tax Check: "No tax line found" with one-tap **Add $X** / **No tax**, Original and Digital copy tabs
- B6 Category Picker (sheet from Review or Manual Entry)
- B7 Manual Entry (no photo)

**C · Receipts**
C1 Receipts History → C4 Receipt · Digital Copy ⇄ C5 Receipt · Original → C6 Original Photo (full screen)
- C2 Receipts Empty, C3 Search Results, C7 Return Reminders

**D · Home, Insights & HST**
D1 Home → D2 Insights, D3 HST Summary → D4 Export for Accountant

**E · Categories**
E1 Categories → E2 Category Detail → E4 Edit Category; E3 Manage Categories (pinned, all, hidden)

**F · Profile**
F1 Profile & Settings → F2 Edit Profile

## Two copies of every receipt

Each scan keeps:
1. **Original**: the photo exactly as captured. It is never edited, so it stays valid as proof for returns, warranty claims or a CRA review.
2. **Digital copy**: the structured record (store, date, items, subtotal, HST, total, category) that the user searches, edits and exports.

Store the original as its own write-once file and link the digital record to it by receipt ID. Edits to the digital copy never touch the original.

## Motion (steady system)

Shapes never change form. Only position, scale, opacity and drawn-on strokes animate.

| File | State | Used on |
|---|---|---|
| `steady_hero_scan.json` | Hero | A2 Welcome |
| `steady_empty_receipts.json` | Empty | C2 Receipts Empty |
| `steady_all_caught_up.json` | Success | B8 Saved, C7 no reminders |
| `steady_no_results.json` | Empty | C3 Search with no matches |
| `steady_no_data.json` | Empty | D2 Insights, D3 HST Summary with no data |
| `steady_export_ready.json` | Success | D4 Export finished |
| `steady_scan_failed.json` | Warning | B3 when OCR fails |
| `steady_camera_denied.json` | Blocked | B1 when camera permission is off |
| `steady_sync_failed.json` | Error | Offline or iCloud error banner |

All files: Lottie 5.7, 60 fps, 240 × 240.

```swift
import Lottie

LottieView(animation: .named("steady_hero_scan"))
    .playing(loopMode: .loop)
    .frame(width: 240, height: 240)
```

Rules: ease-in-out (0.35, 0, 0.65, 1) for movement, ease-out (0.2, 0, 0.3, 1) for arrivals, errors shake once (4 pt, 0.5 s) then rest. With Reduce Motion on, show a still frame.

## Notes for the build

- Use the native `SignInWithAppleButton` instead of the drawn black button.
- Merchant rows use an initials avatar as a logo slot. Fill it at runtime only with logos you are licensed to use.
- HST defaults to Ontario 13%. Zero-rated groceries stay out of the HST total; receipts with no tax line are flagged for review instead of counting as $0.
- Sample stores and amounts in the designs are placeholders.
