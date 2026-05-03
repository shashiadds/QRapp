# Smart Mudra Google Sheets Setup

## 1. Create the sheet

1. Open Google Sheets and create a blank spreadsheet.
2. Rename it to `Smart Mudra MVP`.
3. Go to `Extensions > Apps Script`.
4. Paste the contents of `apps-script/Code.gs`.
5. Run `setupSmartMudraSheet` once and approve permissions.

This creates three tabs:

- `shops`
- `transactions`
- `fraud`

## 2. Deploy the Apps Script API

1. In Apps Script, click `Deploy > New deployment`.
2. Select type `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Deploy and copy the Web app URL ending in `/exec`.

## 3. Connect the React app

Create a `.env` file in this project:

```bash
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Then restart the dev server:

```bash
npm run dev -- --port 5173
```

When connected, the top-left status changes from `Local demo mode` to `Google Sheets connected`.

## 4. Test

Open:

```text
http://localhost:5173/?shop=KaleMedical
```

Submit a mobile number and bill amount. A new row should appear in the `transactions` sheet.

Submitting the same mobile number again on the same day for the same shop should be blocked and logged in the `fraud` sheet.
