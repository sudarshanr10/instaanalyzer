# InstaAnalyzer

A Chrome extension that analyzes your Instagram followers and following in real time, then opens a beautiful React dashboard showing exactly who doesn't follow you back, who your fans are, and who your mutual connections are — all without ever sending your data to a server.

## Features

- **Live analysis** — fetches your followers and following directly from Instagram while you're logged in
- **5 relationship views** — Don't Follow Back, Fans Only, Mutuals, All Followers, All Following
- **Search & filter** — find any user instantly across all views
- **Export** — download any list as CSV or JSON
- **Beautiful UI** — animated React dashboard with glassmorphism, gradient cards, and smooth transitions
- **100% private** — all data stays in your browser via Chrome local storage

## Installation

> **Note:** This extension is not yet on the Chrome Web Store. Load it manually in developer mode.

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the `extension/` folder

The InstaAnalyzer icon will appear in your toolbar.

## Usage

1. Go to [instagram.com](https://www.instagram.com) and log in
2. Click the **InstaAnalyzer** extension icon
3. Click **Analyze My Followers**
4. Wait for the progress bar to complete (time depends on follower count)
5. The dashboard opens automatically in a new tab

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
cd react-app
npm install
```

### Rebuild the dashboard

After making changes to the React app, rebuild it into the extension:

```bash
cd react-app
npm run build
```

The build outputs directly to `extension/dashboard/`.

### Live development (standalone mode)

```bash
cd react-app
npm run dev
```

This runs the React app in standalone mode with file upload support and demo data — no extension required.

### Project structure

```
├── extension/          # Chrome extension (load this folder in Chrome)
│   ├── manifest.json   # Extension manifest (MV3)
│   ├── popup.html/js   # Extension popup
│   ├── content.js      # Runs on instagram.com, fetches data
│   ├── dashboard/      # Built React dashboard (auto-generated)
│   └── icons/          # Extension icons
└── react-app/          # React source for the dashboard
    └── src/App.jsx     # Main dashboard component
```

## How it works

The content script (`content.js`) runs on `instagram.com` and calls Instagram's internal GraphQL API to paginate through your followers and following lists. Results are saved to `chrome.storage.local`, then the React dashboard reads them and calculates relationships using Set-based lookups for O(1) performance.

No data ever leaves your browser.

## Privacy

- No accounts, no sign-up, no backend
- Data is stored only in Chrome's local extension storage
- Clicking "Refresh" clears all stored data
