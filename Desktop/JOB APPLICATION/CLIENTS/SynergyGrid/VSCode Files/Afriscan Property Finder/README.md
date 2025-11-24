# Afriscan Property Finder

Hosted automation that scrapes African property marketplaces, normalizes financials, writes the results to Google Sheets, and renders a browser dashboard for quick ROI ranking.

## Architecture
- **Frontend**: React + Vite (TypeScript) deployed to Cloudflare Pages. Provides scrape controls, ROI table, CSV/JSON export hooks, and manual overrides.
- **Scraper/Backend**: Server-agnostic TypeScript module (`backend/functions/src/index.ts`) that can run via Cloudflare Workers/Pages Functions or any Node runtime. It scrapes sources (Axios + Cheerio), normalizes values, computes ROI/payback, then writes rows to Google Sheets via a service account.
- **Data Store**: Google Sheets (free tier). Two tabs recommended: `Listings` (latest normalized dataset) and `Runs` (history/alerts).

## Repository Layout
```
├── package.json            # Workspace scripts (build/test)
├── frontend/               # Cloudflare Pages-ready UI
│   └── src/                # React components, mock API layer, styling
└── backend/functions/      # Scraper + Sheets writer
    ├── src/index.ts        # Entry point (runScrape + CLI hook)
    └── tsconfig.json
```

## Development Workflow
1. Install dependencies from the repo root:
   ```bash
   npm install
   ```
2. Run the frontend dev server:
   ```bash
   npm run dev:frontend
   ```
3. Execute a local scrape (writes to Google Sheets when env vars are set):
   ```bash
   cd backend/functions
   GOOGLE_SHEETS_ID=... \
   GOOGLE_SERVICE_ACCOUNT_EMAIL=... \
   GOOGLE_SERVICE_ACCOUNT_KEY=... \
   npm run build && node lib/index.js
   ```
   The CLI entry automatically invokes `runScrape()` and logs run status.

## Environment Variables (Backend)
| Variable | Description |
| --- | --- |
| `GOOGLE_SHEETS_ID` | Target spreadsheet ID (the value after `/d/` in the URL). |
| `GOOGLE_SHEETS_LISTINGS_RANGE` | Optional range for the listings table (default `Listings!A1`). |
| `GOOGLE_SHEETS_RUNS_RANGE` | Optional range for the run log (default `Runs!A1`). |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email of the Google service account with write access to the sheet. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Private key for the service account (newline characters must be preserved; replace `\n` with real line breaks). |

## Deployment Notes
- **Cloudflare Pages (frontend)**: connect the repo, set build command `npm install && npm run build`, output directory `frontend/dist`. Configure `VITE_API_BASE_URL` to point to the backend trigger (Cloudflare Worker/Function URL).
- **Cloudflare Worker / Pages Function (backend)**: import `runScrape` from `backend/functions/lib/index.js` and expose it behind an HTTP route + scheduled trigger. Provide the Google Sheets env vars via Cloudflare secrets.
- **Google Sheets setup**: create tabs `Listings` and `Runs`. Share the sheet with the service account email so it can write data.

## Next Steps
- Implement a Cloudflare Worker wrapper that calls `runScrape()` on demand and via cron.
- Wire the frontend `fetchProperties`/`triggerScrape` helpers to that Worker once deployed.
- Add CSV/JSON export endpoints (worker routes that read from Google Sheets or cached JSON).
- Expand the scraper source list and add politeness controls (rate limit + robots.txt awareness).
