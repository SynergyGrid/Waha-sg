# Afriscan Property Finder

Hosted automation that scrapes African property marketplaces, normalizes financials into Google Sheets, and serves a pastel React dashboard with scrape controls, ROI ranking, and manual overrides.

## Architecture
- **Frontend**: React + Vite (TypeScript) deployed on Cloudflare Pages. Uses `/api` endpoints to trigger scrapes, fetch listings, and (later) persist overrides.
- **Serverless API**: Cloudflare Pages Functions under `functions/` that expose `POST /api/scrape` (run scraper) and `GET /api/properties` (read from Google Sheets). Functions use the same Google service account credentials as the local CLI.
- **Scraper engine**: `backend/functions/src/index.ts` (Axios + Cheerio) that scrapes target marketplaces, normalizes rent/unit data, computes ROI, and writes to Google Sheets.
- **Data store**: Google Sheets (free tier). Tabs:
  - `Listings`: always overwritten by the latest normalized dataset.
  - `Runs`: append-only run log (timestamp, counts, errors).

## Repository Layout
```
├── package.json            # Workspace + root deps (googleapis, etc.)
├── wrangler.toml           # Cloudflare compatibility + Pages output dir
├── functions/              # Cloudflare Pages Functions (API routes)
│   ├── api/properties.ts   # GET /api/properties (reads Sheets)
│   ├── api/scrape.ts       # POST /api/scrape (runs scraper)
│   └── _shared/sheets.ts   # Google Sheets helper
├── frontend/               # React UI (src/, components, styles)
└── backend/functions/      # Scraper module (run locally or imported by worker)
    ├── src/index.ts
    └── tsconfig.json
```

## Development Workflow
1. Install dependencies at the repo root:
   ```bash
   npm install
   ```
2. Run the dashboard locally:
   ```bash
   npm run dev:frontend
   ```
3. (Optional) Trigger a local scrape that writes to Google Sheets:
   ```bash
   cd backend/functions
   GOOGLE_SHEETS_ID=... \
   GOOGLE_SERVICE_ACCOUNT_EMAIL=... \
   GOOGLE_SERVICE_ACCOUNT_KEY=... \
   npm run build && node lib/index.js
   ```
4. Cloudflare Pages deploys automatically from `main` (build command `npm install && npm run build`, output `frontend/dist`).

## Environment Variables
| Variable | Used By | Description |
| --- | --- | --- |
| `GOOGLE_SHEETS_ID` | CLI + Functions | Spreadsheet ID (value after `/d/` in the sheet URL). |
| `GOOGLE_SHEETS_LISTINGS_RANGE` | CLI + Functions | Optional range for listings (default `Listings!A1`). |
| `GOOGLE_SHEETS_RUNS_RANGE` | CLI + Functions | Optional range for run log (default `Runs!A1`). |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | CLI + Functions | Service account email (shared on the sheet). |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | CLI + Functions | Service account private key (store with literal `\n` sequences; functions convert to real newlines). |
| `VITE_API_BASE_URL` | Frontend | Defaults to `/api`. Set to `mock` to keep using the built-in placeholder data.

## Cloudflare Configuration
1. **Pages project**
   - Build command: `npm install && npm run build`
   - Output directory: `frontend/dist`
   - Add environment variables under *Settings → Environment variables*:
     - `VITE_API_BASE_URL=/api`
     - `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_LISTINGS_RANGE`, `GOOGLE_SHEETS_RUNS_RANGE`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY` (mark as encrypted secrets)
2. **Functions**
   - `wrangler.toml` already sets `compatibility_date` and `nodejs_compat` so Pages Functions can use Node-style modules (`googleapis`, `crypto`, etc.).
   - `POST /api/scrape` sets `process.env` before lazily importing the scraper module and returns `{ runId, processedListings, errorCount, ... }`.
   - `GET /api/properties` reads the `Listings` tab, applies query filters (location, buildingType, feasibility, search), and returns data the React table expects.

## Google Sheets Setup
1. Create a sheet with tabs `Listings` and `Runs` (leave empty; the scraper writes headers automatically).
2. Share the sheet with the service account email (Editor role).
3. When testing locally, keep credentials in `.env.local` (already gitignored) and run the CLI command above.

## Next Steps / Ideas
- Add PATCH `/api/properties/:hash` to persist manual overrides back into the sheet.
- Build CSV/JSON export routes that stream directly from the latest sheet snapshot.
- Expand the scraper source list + add rate limiting or proxy rotation to avoid 403s.
- Schedule the Cloudflare worker via Cron Triggers if you want daily refreshes without pressing the “Fetch Latest Listings” button.
