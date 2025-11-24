# Afriscan Property Finder – Technical Plan

## 1. Objectives
- Discover, scrape, and normalize listings across Lagos, Abuja, Enugu, and Ghana.
- Compute revenue + ROI using ₦1M/year rent baseline and 100-unit heuristic for missing data.
- Persist the normalized dataset plus run history in Google Sheets (free tier) so teammates can review/edit without databases.
- Provide a Cloudflare Pages dashboard with scrape trigger, ranking/filtering, and manual overrides.

## 2. High-Level Architecture
| Layer | Service | Notes |
| --- | --- | --- |
| UI | React (Vite) on Cloudflare Pages | No auth for MVP; pastel theme + override modal |
| Scraper | Cloudflare Worker/Pages Function (Node runtime) | Imports `runScrape` from `backend/functions`; exposes HTTP + scheduled endpoints |
| Storage | Google Sheets | Tabs `Listings` (latest dataset) + `Runs` (scrape history/errors) |
| Version control | GitHub | Deploy hooks to Cloudflare Pages; worker bundle via Wrangler/Pages Functions |

## 3. Scraping & Normalization Pipeline
1. **Source Registry** (`SCRAPE_SOURCES`): JSON config with IDs, URLs, selectors, location hints, and rate-limit metadata.
2. **Fetcher** (`axios` + `cheerio`): Requests each listing page with custom UA, retries politely, captures snippets for auditing.
3. **Parser & Normalizer**: Extracts price/rent/unit/type/location, converts ₦/$ text to numbers, infers missing rent/unit using ₦1M + 100-unit rules, categorizes building types and locations, and computes ROI/payback + feasibility tags.
4. **Sheets Persistence**:
   - `Listings` tab overwritten each run with header + normalized rows.
   - `Runs` tab appended with run metadata (start/end time, processed count, error log).

## 4. Frontend Functionality
- Dashboard hero copy + “Fetch Latest Listings” CTA.
- Summary cards (total listings, strong candidates, average ROI/payback, last update timestamp from sheet data).
- Filters (location, building type, feasibility, search) feeding the table component.
- Table view with ROI and payback columns, feasibility badges, source links, manual override button.
- Manual override modal storing edits (future: push updates back to Sheets via worker endpoint).
- Export buttons (future) calling a worker route to download CSV/JSON generated from Sheets data.

## 5. Backend Interfaces (planned Cloudflare Worker routes)
| Route | Method | Purpose |
| --- | --- | --- |
| `/scrape` | POST | Calls `runScrape(triggeredBy)` and returns run metadata + listing count |
| `/properties` | GET | Reads from Google Sheets, applies query params (location/type/feasibility/search), returns JSON |
| `/properties/{hash}` | PATCH | Applies manual overrides (writes to Sheets or a supplementary tab) |
| `/export/csv` | GET | Streams CSV built from the latest sheet data |

## 6. Google Sheets Schema
- `Listings` tab columns: Hash, Source, Title, URL, Price, Price Currency, Rent, Rent Currency, Units, Building Type, Location, Annual Revenue, ROI, Payback Years, Feasibility, Price Source, Rent Source, Unit Source, Flags, Captured At.
- `Runs` tab columns: Run ID, Triggered By, Started At, Completed At, Processed Count, Error Count, Errors.

## 7. Deployment Steps (all free tiers)
1. **Google Cloud / Service Account**: Create a service account, enable Google Sheets API, generate a JSON key. Share the target sheet with the service account email. Export environment variables (`GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`).
2. **Cloudflare Pages (frontend)**: Point to repo, configure `npm install && npm run build`, output `frontend/dist`, add env var `VITE_API_BASE_URL` for worker endpoint.
3. **Cloudflare Worker (scraper/API)**: Use Wrangler or Pages Functions to wrap `runScrape`. Set secrets for all Google vars. Add Cron Triggers for scheduled scrapes.
4. **GitHub Actions (optional)**: On push to `main`, run `npm run build` for verification, then auto-deploy Pages/Worker.

## 8. Future Enhancements
- Auto-discovery crawler for new listing domains with approval queue.
- Rate-limit + robots.txt enforcement per site.
- Notifications (email/Slack) when runs produce new strong candidates or failures.
- Authentication + role-based overrides once needed.
- Additional export formats (PDF summary, map visualization).

## 9. Inputs Needed
- Final list of high-priority marketplaces per city/country.
- Google Sheet URL to connect, plus confirmation of service account sharing.
- Cloudflare project name once worker deployment is ready.
