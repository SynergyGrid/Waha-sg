# Afriscan Property Finder – Technical Plan

## 1. Objectives
- Continuously discover, scrape, and normalize property listings covering Lagos, Abuja, Enugu, Ghana, and other trip targets.
- Compute revenue + ROI using ₦1M/year rent baseline and 100-unit heuristic when explicit data is missing.
- Rank/filter listings and expose a pastel-themed dashboard for non-technical teammates (no auth for MVP).
- Offer CSV/JSON exports and manual override controls for ambiguous listings.
- Respect free-tier constraints (Cloudflare Pages, Firebase, GitHub) and avoid paid services.

## 2. High-Level Architecture
| Layer | Service | Notes |
| --- | --- | --- |
| UI | React (Vite) on Cloudflare Pages | Button-driven scrape trigger, ROI table, filters, manual override modal |
| API | Firebase HTTPS Function | Endpoint `/fetchPropertyListings` that triggers scraping + returns run status |
| Scheduler | Firebase Pub/Sub (cron) | Daily refresh + ad-hoc UI trigger |
| Storage | Firestore | Collections `scrape_runs`, `listings_raw`, `listings_processed`, `overrides` |
| File store | Cloud Storage (optional) | Save HTML snippets for audit |

## 3. Scraping & Normalization Pipeline
1. **Source Registry** (`SCRAPE_SOURCES`): JSON config with id, label, entry URLs, selectors, location hints, and politeness (rate limits/headers).
2. **Fetcher** (`axios` + `cheerio`): requests each entry URL, retries 3× with exponential backoff, stores HTML snippet.
3. **Parser**: extracts text for price, rent, units, building type, and location. If selectors miss, fallback to heuristics scanning the card HTML.
4. **Normalizer**: 
   - Parse ₦/$ values, apply magnitude (k/M) multipliers, convert to numeric fields.
   - Fallback rent = ₦1M per unit if price is present but rent is missing.
   - Fallback unit count = 100 when rent exists but units missing.
   - Map building types + cities via alias tables; flag ambiguous entries.
5. **Calculator**: 
   - `annualRevenue = rentPerUnit * unitCount`
   - `roiRatio = annualRevenue / price`
   - `paybackYears = price / annualRevenue`
   - `feasibility` = strong (2–5y), needs review (≤10y), low priority (>10y).
6. **Persistence**: Upsert into Firestore keyed by SHA-256 hash of source + URL + title. Store raw snippet + normalized record + flags. Log run metadata (start/end/error counts).

## 4. Frontend Functionality
- **Dashboard landing**: Title, subtitle, latest scrape status.
- **Scrape controls**: CTA button + status readout (wired to HTTPS endpoint).
- **Summary cards**: total listings, strong candidates, avg ROI, avg payback, last updated time.
- **Filters**: location, building type, feasibility, search box.
- **Table view**: price, rent, units, revenue, ROI, feasibility badges, source link.
- **Manual override modal**: edit price/rent/units/location; persists to Firestore overrides collection and merges back into table.
- **Exports**: download filtered dataset as CSV/JSON (to be implemented via Cloud Function or client-side formatting).

## 5. API Endpoints (planned)
| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/fetchPropertyListings` | POST | Trigger scrape, return run summary |
| `/properties` | GET | Query processed listings with filters (location, type, feasibility, search, order) |
| `/properties/{hash}` | PATCH | Persist manual overrides |
| `/exports/csv` | GET | Stream filtered CSV (future) |

## 6. Data Model (Firestore)
- `scrape_runs/{runId}`: `{ status, triggeredBy, startedAt, completedAt, processedListings, errorCount, errors[] }`
- `listings_raw/{hash}`: `{ sourceId, url, rawSnippet, runId, updatedAt }`
- `listings_processed/{hash}`: normalized data + calculations + flags + timestamps.
- `overrides/{hash}`: `{ priceValue?, rentPerUnit?, unitCount?, location?, updatedBy, updatedAt }` merged over processed data when present.

## 7. Deployment Steps (Free-tier)
1. **Firebase**: create project → enable Firestore + Cloud Functions → set `firebase login` locally → `firebase init functions` (use existing `backend/functions`).
2. **Cloudflare Pages**: create new project → connect GitHub repo → set build command `npm install && npm run build && npm run build -w frontend` → output dir `frontend/dist`.
3. **Secrets**:
   - `VITE_API_BASE_URL` (Cloudflare Pages) pointing to Firebase Function URL.
   - Firebase env config for HTTP auth tokens if needed later.
4. **CI**: optional GitHub Action building + deploying automatically when `main` updates.

## 8. Future Enhancements
- Auto-discovery crawler (seeded by search queries) storing candidate domains for approval.
- Rate limit + robots.txt enforcement matrix per site.
- Notification hooks (email/Slack/Webhook) when new strong candidates appear.
- Role-based auth (Firebase Auth + Cloudflare Access) once user sign-in is required.
- Multi-language currency handling (€, CFA) as expansion.

## 9. Open Items / Inputs Needed
- Confirm final marketplace list + selectors per city.
- Provide Firebase + Cloudflare project names once created.
- Decide on export format priorities (CSV vs JSON first) and manual override workflow (approval log?).
