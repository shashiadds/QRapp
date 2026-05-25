# QRApp / Smart Mudra Project Notes

Last reviewed: 2026-05-24

## Current shape

- This project is a React + Vite app named `smart-mudra`.
- The product is a QR-based customer reward/cashback flow for shops.
- The frontend can run in local seed-data mode, or connect to Google Sheets through a Google Apps Script web app using `VITE_GOOGLE_SCRIPT_URL`.
- Google Sheets is used as the backend database for shops, transactions, fraud signals, admins, sessions, and archived transactions.

## Important files

- `src/App.tsx`: Main UI and flow for customer scan, admin dashboard, shop dashboard, login/session handling, shop management, CSV export, and reward reveal.
- `src/rewardEngine.ts`: Frontend reward calculation and reward submission validation.
- `src/customRules.json`: Source of custom per-shop reward slabs.
- `apps-script/Code.gs`: Google Apps Script backend API, sheet setup, auth, sessions, shop CRUD, reward submission, fraud blocking, custom reward rules, and archiving helpers.
- `src/sheetsApi.ts`: Frontend client wrapper for Apps Script actions.
- `src/types.ts`: Shared frontend types for shops, transactions, sessions, fraud signals, and visitor context.
- `scripts/sync-rules.cjs`: Copies `src/customRules.json` into the marked custom-rules block in `apps-script/Code.gs`.
- `scripts/reward-rules.test.cjs`: Cross-checks frontend reward logic against Apps Script reward logic.
- `src/rewardEngine.test.ts`: Vitest coverage for reward calculation, validation, caps, and custom rules.
- `GOOGLE_SHEETS_SETUP.md`: Setup guide for creating and deploying the Sheets/App Script backend.

## Major changes already made

- Added real Google Sheets/App Script backend support.
- Added admin and shop login using usernames/passwords, session tokens, and role-based data filtering.
- Added `shopAdmin` behavior so individual shops only see their own shop and transactions.
- Added transaction archive support with `transactions_archive`.
- Added customer metadata capture: customer name, address, IP/location, latitude, longitude, mobile, bill amount, reward, rule, and reward details.
- Added public bootstrap loading so customer QR pages can load public shop data without admin login.
- Added admin shop management with generated shop credentials.
- Admin dashboard can expose shop passwords through `shopPasswords`.
- Removed visible `costPerScan` usage from admin/shop dashboards, though the field still exists in the data model and sheet schema.
- Removed the Fraud Monitoring panel from admin UI, while backend fraud sheet support still exists.
- Added auto-logout behavior when the backend reports an invalid or expired session.
- Added reward reveal/gift-box animation and supporting CSS.
- Added stronger tests for reward caps and custom shop rules.

## Reward rules summary

- Universal minimum reward is `10`.
- Universal maximum reward is `1000`.
- Reward points are capped by:
  - shop max reward,
  - global max reward,
  - purchase total.
- Percentage rewards round down to the nearest 10, then respect the minimum/caps.
- Default percentage slabs apply when a shop does not provide usable percentage rules.
- Fixed reward bands are still supported, mainly for test/demo shops or explicit fixed-band configs.
- `src/customRules.json` currently defines custom slabs for:
  - `srujankidshouse`
  - `sandeshagro`
  - `rahulagency`
- Safety fallback max rewards are embedded for important shops:
  - `srujankidshouse`, `sandeshagro`, `rahulagency`: fallback to `1000` if sheet data has `0`, missing, or legacy `100`.
  - `kalemedical`: fallback to `600` if sheet data has `0` or legacy `100`.

## Current uncommitted changes

- `package.json` and `package-lock.json` add `@google/clasp` as a dev dependency.
- `.clasp.json` was added with:
  - `scriptId`: `YOUR_SCRIPT_ID`
  - `rootDir`: `apps-script`
- This suggests the project is being prepared for Apps Script deploy/push workflows using `clasp`.

## Things to keep in mind

- `GOOGLE_SHEETS_SETUP.md` still says setup creates three tabs, but `Code.gs` now expects more sheets: `shops`, `transactions`, `transactions_archive`, `fraud`, `admins`, and `sessions`.
- `@google/clasp@3.3.0` requires Node `>=20`; check the local/deploy Node version before relying on clasp commands.
- `src/customRules.json` is the source of truth for custom rules, but `apps-script/Code.gs` must be synchronized with `npm run sync-rules` before deploying Apps Script.
- Admin-visible plain text shop passwords are intentional in recent commits, but they are security-sensitive. Treat sheet/app access carefully.
- Backend fraud support still exists even though the visible admin Fraud Monitoring panel was removed.

## Useful commands

```bash
npm run dev
npm run build
npm test
npm run test:reward-rules
npm run sync-rules
```
