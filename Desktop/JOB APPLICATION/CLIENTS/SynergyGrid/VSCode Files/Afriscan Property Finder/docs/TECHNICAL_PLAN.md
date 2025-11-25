# Afriscan Property Finder – Technical Plan

## 1. Objectives
- Scrape and normalize property listings across Lagos, Abuja, Enugu, Ghana, etc.
- Compute revenue/ROI using ₦1M yearly rent baseline + 100-unit heuristic for missing data.
- Store the processed dataset + run log in Google Sheets for quick editing/verification.
- Ship a Cloudflare Pages dashboard (no auth yet) with scrape trigger, ROI ranking, filters, and manual overrides.

## 2. High-Level Architecture
| Layer | Service | Notes |
| --- | --- | --- |
| UI | React (Vite) on Cloudflare Pages | Pastel dashboard, uses `/api` endpoints, defaults to mock mode locally |
| API | Cloudflare Pages Functions | `POST /api/scrape` (triggers scraper), `GET /api/properties` (reads Sheets + filters) |
| Scraper engine | `backend/functions/src/index.ts` | Axios + Cheerio, imported by worker or run locally via Node |
| Storage | Google Sheets | Tabs `Listings` & `Runs`; worker reads/writes via service account |

## 3. Scraping & Normalization
1. `SCRAPE_SOURCES` config defines marketplace URLs, selectors, location hints, and heuristics.
2. Scraper fetches each page with a polite UA, retries failures, and keeps HTML snippets for audit.
3. Parser extracts price/rent/unit/type/location from structured + free text.
4. Normalizer converts ₦/$ text to numbers, infers rent/units when missing (₦1M + 100 units), categorizes building types, maps cities, and computes annual revenue + ROI + payback years + feasibility tags.
5. Persistence writes the normalized dataset to `Listings` (overwrites) and appends run metadata to `Runs` (run ID, timestamps, processed count, error summary).

## 4. Dashboard / UX
- Hero section with ROI context and “Fetch Latest Listings” button.
- Summary cards (“Strong candidates”, average ROI, last updated, etc.).
- Filters (location, building type, feasibility, search) feeding the table.
- Table highlights ROI %, payback years, feasibility badge, source, and includes “Override” button (future PATCH endpoint).
- Export buttons & manual override persistence planned for next iteration.

## 5. API Surface (current)
| Route | Method | Description |
| --- | --- | --- |
| `/api/scrape` | POST | Sets `process.env` with Cloudflare secrets, lazy-loads `runScrape`, executes, and returns `{ runId, startedAt?, completedAt?, processedListings, errorCount, errors }`. |
| `/api/properties` | GET | Reads the `Listings` tab via Google Sheets API, maps expected columns, applies query params (`location`, `buildingType`, `feasibility`, `search`), and returns `PropertyRecord[]`. |
| `/api/properties/{hash}` | PATCH | **Future** – apply manual overrides to a separate tab or in-place row. |
| `/api/export/csv` | GET | **Future** – stream CSV/JSON snapshots for travel packets. |

## 6. Google Sheets Schema
- `Listings`: `Hash, Source, Title, URL, Price, Price Currency, Rent, Rent Currency, Units, Building Type, Location, Annual Revenue, ROI, Payback Years, Feasibility, Price Source, Rent Source, Unit Source, Flags, Captured At`.
- `Runs`: `Run ID, Triggered By, Started At, Completed At, Processed Count, Error Count, Errors`.

## 7. Deployment Steps
1. **Google Cloud**: enable Sheets API, create service account, download JSON key, and share the target sheet with that email.
2. **Cloudflare Pages**: connect `SynergyGrid/AfriscanPropertyFinder`, build command `npm install && npm run build`, output `frontend/dist`.
3. **Secrets**: add (encrypted) environment variables under Pages → Settings → Environment variables:
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_SHEETS_LISTINGS_RANGE` (optional)
   - `GOOGLE_SHEETS_RUNS_RANGE` (optional)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_KEY` (paste JSON key, Cloudflare stores securely)
   - `VITE_API_BASE_URL=/api`
4. **Wrangler config**: `wrangler.toml` already sets `compatibility_date` and `nodejs_compat` so Functions can use Node APIs (`googleapis`, `crypto`). No separate Worker deployment is needed—the Pages Functions directory is bundled automatically.

## 8. Enhancements / Roadmap
- Build `/api/properties/:hash` to merge manual overrides back into Google Sheets.
- Add `/api/export/{csv,json}` for offline packets.
- Expand the scraper source list + add throttling/proxy support to avoid 403s.
- Cron-trigger `/api/scrape` (e.g., daily at 04:00 UTC) once stronger anti-block logic is in place.
- Introduce authentication / Cloudflare Access gates when the app is ready for a broader audience.

## 9. Inputs / Decisions Still Needed
- Finalize target marketplaces + selectors per city.
- Confirm the Google Sheet to use in production (and grant service-account access).
- Choose if/when to support override persistence + exports.
- Provide Cloudflare Pages project name/URL (for DNS + sharing with teammates).
