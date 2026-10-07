# Stubs

All your tickets in one place, on the right day. For the QR tickets that won't go into Apple Wallet: ferries, waterparks, gigs, trains.

- **Share → Stubs** from Mail, Files or Photos (or tap **+**).
- Codes are found on-device: QR, Aztec, PDF417, Data Matrix and barcodes, across every page of a PDF. One code per passenger becomes one swipeable ticket.
- Pick the date (and an optional time). That's it.
- A reminder at 8am on the day, or 2 hours before if there's a time. Tap it and the code is on screen at full brightness.
- Tidy by default: past tickets clear themselves after 30 days (or 1 week / 90 days / never). Swipe to delete, with undo.
- Nothing leaves the phone. No account, no server.

## Stack

Expo SDK 57 · Expo Router · TypeScript. iPhone first.

| Piece | Where |
| --- | --- |
| Screens | `src/app/` (home, ticket, add/edit, original, settings, share landing) |
| Ticket store, auto-clear, undo | `src/lib/store.ts` (JSON in the app's Documents folder) |
| Import pipeline | `src/lib/importer.ts` |
| Reminders | `src/lib/reminders.ts` |
| On-device scanner (Swift: PDFKit + Vision) | `modules/stubs-scanner/` |
| Design tokens (Tear-off) | `src/theme.ts` |

Receiving shares uses `expo-sharing`'s share extension (experimental on iOS in SDK 57). It needs the App Group `group.com.imriverjones.stubs`; EAS sets this up when it creates the credentials.

## Running it (no Mac needed)

The app uses native code (share extension, scanner), so it runs as a **development build**, not in Expo Go.

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # links a NEW Expo project for Stubs (separate from other apps)
npx eas-cli@latest device:create # register your iPhone once
npm run build:dev                # cloud build; install it from the link/QR EAS gives you
npm start                        # then open the Stubs dev build on your phone
```

For a build to try without the dev server: `npm run build:preview`.

## Checks

```bash
npm run typecheck
npm run lint
```

## Not in v1 (next up)

1. Auto-fill the date and title from the ticket text.
2. Apple Wallet export, home-screen widget, Live Activity.
3. iCloud backup.
4. Forward-to-email and inbox scanning.

Rotating codes (e.g. Ticketmaster SafeTix) can't work in any third-party app; those stay in the official app.
