# Afriscan Property Finder

Hosted automation that scrapes African property marketplaces, normalizes financials, and serves a browser-based dashboard so the team can rank opportunities before traveling.

## Architecture
- **Frontend**: React + Vite (TypeScript) deployed to Cloudflare Pages. Provides scrape controls, ROI ranking, CSV/JSON export hooks, and manual override UI.
- **Backend**: Firebase Cloud Functions (TypeScript) with Firestore and Cloud Storage for storing scrape runs, normalized listings, and raw HTML snippets.
- **Scraping Flow**: Config-driven crawler (Axios + Cheerio) fetches marketplace pages, parses key text, normalizes values (currencies, rent, units), computes annual revenue/ROI, applies feasibility heuristics, and persists data. Scheduled Pub/Sub job plus manual HTTP trigger from the UI.

## Repository Layout
```
├── package.json            # Workspace scripts (build/test) for the monorepo
├── frontend/               # Cloudflare Pages-ready UI
│   └── src/                # React components, mock API layer, styling
└── backend/functions/      # Firebase Functions source (TypeScript)
    ├── src/index.ts        # Scraping + normalization pipeline
    └── tsconfig.json
```

## Development Workflow
1. Install dependencies once from the repo root:
   ```bash
   npm install
   ```
2. Run the frontend dev server:
   ```bash
   npm run dev:frontend
   ```
3. Implement backend logic inside `backend/functions/src` and build via:
   ```bash
   npm run build -w backend/functions
   ```

## Building & Deployment
- `npm run build` (run at the repo root) builds every workspace. The CI/CD workflow can hook into this command before deploying to Cloudflare Pages (frontend) and Firebase (`firebase deploy --only functions`).
- Cloudflare Pages: point to `frontend`, set build command `npm run build && npm run build -w frontend` or reuse the root workspace install/build.
- Firebase Functions: initialize a new Firebase project (free tier), configure Firestore + Cloud Storage, then deploy the compiled `backend/functions/lib` output.

## Configuration To-Dos
- Provision new Firebase + Cloudflare projects dedicated to Afriscan Property Finder (free tier).
- Add `.env` (or Cloudflare/Firebase secrets) for API base URLs, admin emails, and scraping headers.
- Populate `SCRAPE_SOURCES` with the real production site selectors and rate limit policies.
- Implement Firestore security rules only if/when authentication is added (currently UI is open per requirements).

## Next Steps
- Hook the frontend API layer to the deployed Firebase HTTPS endpoint and implement CSV/JSON export buttons.
- Add persistence for manual overrides (FireStore `overrides` collection) and expose them in the UI.
- Expand crawler discovery logic to find additional marketplaces automatically, respecting robots.txt and ToS.
- Wire up notifications/alerts for scrape anomalies (e.g., empty result sets, ROI anomalies).
