import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import axios from 'axios';
import * as cheerio from 'cheerio';
import currency from 'currency.js';
import { DateTime } from 'luxon';
import { createHash } from 'node:crypto';

if (!admin.apps.length) {
  admin.initializeApp();
}

type CurrencyCode = 'NGN' | 'USD';
type KnownLocation =
  | 'Lagos'
  | 'Abuja'
  | 'Enugu'
  | 'Ghana'
  | 'Accra'
  | 'Ibadan'
  | 'Casablanca'
  | 'Marrakesh';

type BuildingType = 'multipurpose' | 'hotel' | 'apartment' | 'other';
type FeasibilityTag = 'strong_candidate' | 'needs_review' | 'low_priority';

interface ScrapeSource {
  id: string;
  label: string;
  entryUrls: string[];
  selectors: {
    card: string;
    title?: string;
    price?: string;
    rent?: string;
    units?: string;
    location?: string;
    type?: string;
    description?: string;
  };
  locationHints: KnownLocation[];
}

interface ParsedListing {
  sourceId: string;
  sourceLabel: string;
  url: string;
  htmlSnippet: string;
  title?: string;
  priceText?: string;
  rentText?: string;
  unitText?: string;
  locationText?: string;
  typeText?: string;
}

interface NormalizedListing {
  hash: string;
  sourceId: string;
  sourceLabel: string;
  url: string;
  title?: string;
  priceValue?: number;
  priceCurrency?: CurrencyCode;
  rentPerUnit?: number;
  rentCurrency?: CurrencyCode;
  unitCount?: number;
  buildingType: BuildingType;
  location?: KnownLocation;
  annualRevenue?: number;
  roiRatio?: number;
  paybackYears?: number;
  feasibility: FeasibilityTag;
  priceSourceText?: string;
  rentSourceText?: string;
  unitSourceText?: string;
  flags: string[];
  rawSnippet: string;
}

interface MonetaryValue {
  amount: number;
  currency: CurrencyCode;
  sourceText: string;
}

const RENT_BASELINE = 1_000_000; // ₦1M yearly per tenant benchmark
const DEFAULT_UNIT_HINT = 100;
const USER_AGENT = 'AfriscanPropertyFinderBot/0.1 (+contact owner)';

const SCRAPE_SOURCES: ScrapeSource[] = [
  {
    id: 'propertypro_ng',
    label: 'PropertyPro (Nigeria)',
    entryUrls: ['https://www.propertypro.ng/property-for-sale'],
    selectors: {
      card: '.single-room-sale',
      title: '.content-title',
      price: '.content-title + .price',
      rent: '.content-title + .price span',
      units: '.description',
      location: '.content-title + .price + .location',
      description: '.description',
    },
    locationHints: ['Lagos', 'Abuja', 'Enugu', 'Ibadan'],
  },
  {
    id: 'meqasa_gh',
    label: 'Meqasa (Ghana)',
    entryUrls: ['https://meqasa.com/houses-for-sale-in-ghana'],
    selectors: {
      card: '.property-list-card',
      title: '.property-list-card-title',
      price: '.price',
      location: '.details-location',
      description: '.property-list-card-description',
    },
    locationHints: ['Ghana', 'Accra'],
  },
];

const LOCATION_ALIASES: Record<KnownLocation, RegExp[]> = {
  Lagos: [/lagos/i],
  Abuja: [/abuja/i],
  Enugu: [/enugu/i],
  Ghana: [/ghana/i],
  Accra: [/accra/i],
  Ibadan: [/ibadan/i],
  Casablanca: [/casablanca/i],
  Marrakesh: [/marrakech|marrakesh/i],
};

function sanitizeNumber(text?: string | null): number | null {
  if (!text) return null;
  const normalized = text.replace(/[,\s]/g, '');
  const num = Number(normalized);
  if (Number.isNaN(num)) return null;
  return num;
}

function parseMagnitude(text: string): number {
  const normalized = text.trim().toLowerCase();
  if (/(million|\bm\b)/.test(normalized)) return 1_000_000;
  if (/(thousand|\bk\b)/.test(normalized)) return 1_000;
  return 1;
}

function parseMonetaryValue(text?: string | null): MonetaryValue | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  const match = cleaned.match(/(?:(₦|\$)\s*)?([\d,.]+)(\s*(k|m|million|thousand))?/i);
  if (!match) return null;
  const symbol = match[1];
  const numericPortion = match[2];
  const magnitudeSuffix = match[3];
  let currencyCode: CurrencyCode = 'NGN';
  if (symbol === '$' || /usd|\$/i.test(cleaned)) {
    currencyCode = 'USD';
  }
  const multiplier = magnitudeSuffix ? parseMagnitude(magnitudeSuffix) : 1;
  const base = sanitizeNumber(numericPortion);
  if (base === null) return null;
  const amount = currency(Number(base).valueOf()).multiply(multiplier).value;
  return {
    amount,
    currency: currencyCode,
    sourceText: cleaned,
  };
}

function parseUnitCount(text?: string | null): { value: number; source: string } | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/(\d{1,4})\s*(units|rooms|tenants|apartments)?/i);
  if (match) {
    return { value: Number(match[1]), source: cleaned };
  }
  if (/hundred/i.test(cleaned)) {
    return { value: 100, source: cleaned };
  }
  return null;
}

function detectLocation(text?: string | null): KnownLocation | undefined {
  if (!text) return undefined;
  for (const [location, patterns] of Object.entries(LOCATION_ALIASES) as [KnownLocation, RegExp[]][]) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return location;
    }
  }
  return undefined;
}

function normalizeBuildingType(text?: string | null): BuildingType {
  if (!text) return 'other';
  const cleaned = text.toLowerCase();
  if (/multipurpose|multi-purpose|office/.test(cleaned)) return 'multipurpose';
  if (/hotel/.test(cleaned)) return 'hotel';
  if (/apartment|self-contained/.test(cleaned)) return 'apartment';
  return 'other';
}

function evaluateFeasibility(paybackYears?: number | null): FeasibilityTag {
  if (!paybackYears || Number.isNaN(paybackYears)) {
    return 'needs_review';
  }
  if (paybackYears >= 2 && paybackYears <= 5) {
    return 'strong_candidate';
  }
  if (paybackYears <= 10) {
    return 'needs_review';
  }
  return 'low_priority';
}

function buildListingHash(sourceId: string, url: string, title?: string): string {
  return createHash('sha256')
    .update(`${sourceId}|${url}|${title ?? ''}`)
    .digest('hex');
}

function normalizeListing(parsed: ParsedListing): NormalizedListing {
  const priceValue = parseMonetaryValue(parsed.priceText);
  let rentValue = parseMonetaryValue(parsed.rentText);
  const flags: string[] = [];
  if (!rentValue && /₦?1\s?m/i.test(parsed.htmlSnippet)) {
    rentValue = {
      amount: RENT_BASELINE,
      currency: 'NGN',
      sourceText: 'Heuristic ₦1M tenant baseline',
    };
    flags.push('rent_estimated_from_baseline');
  }
  const unitInfo = parseUnitCount(parsed.unitText ?? parsed.htmlSnippet);
  const derivedLocation = detectLocation(parsed.locationText ?? parsed.htmlSnippet);
  const buildingType = normalizeBuildingType(parsed.typeText ?? parsed.htmlSnippet);
  const rentPerUnit = rentValue?.amount;
  const unitCount = unitInfo?.value ?? (rentPerUnit ? DEFAULT_UNIT_HINT : undefined);
  if (!unitInfo?.value && rentPerUnit) {
    flags.push('unit_count_assumed_baseline');
  }
  const annualRevenue = rentPerUnit && unitCount ? rentPerUnit * unitCount : undefined;
  const roiRatio = annualRevenue && priceValue?.amount ? annualRevenue / priceValue.amount : undefined;
  const paybackYears = annualRevenue && priceValue?.amount ? priceValue.amount / annualRevenue : undefined;
  const feasibility = evaluateFeasibility(paybackYears);
  const hash = buildListingHash(parsed.sourceId, parsed.url, parsed.title);
  if (!priceValue) {
    flags.push('missing_price');
  }
  if (!rentValue) {
    flags.push('missing_rent');
  }
  if (!unitCount) {
    flags.push('missing_units');
  }
  return {
    hash,
    sourceId: parsed.sourceId,
    sourceLabel: parsed.sourceLabel,
    url: parsed.url,
    title: parsed.title,
    priceValue: priceValue?.amount,
    priceCurrency: priceValue?.currency,
    rentPerUnit,
    rentCurrency: rentValue?.currency,
    unitCount,
    buildingType,
    location: derivedLocation,
    annualRevenue,
    roiRatio,
    paybackYears,
    feasibility,
    priceSourceText: priceValue?.sourceText,
    rentSourceText: rentValue?.sourceText,
    unitSourceText: unitInfo?.source,
    flags,
    rawSnippet: parsed.htmlSnippet,
  };
}

async function persistNormalizedListing(listing: NormalizedListing, runId: string): Promise<void> {
  const db = admin.firestore();
  const timestamp = DateTime.utc().toISO();
  await db.collection('listings_processed').doc(listing.hash).set(
    {
      ...listing,
      runId,
      updatedAt: timestamp,
    },
    { merge: true }
  );
  await db.collection('listings_raw').doc(listing.hash).set(
    {
      sourceId: listing.sourceId,
      url: listing.url,
      rawSnippet: listing.rawSnippet,
      runId,
      updatedAt: timestamp,
    },
    { merge: true }
  );
}

async function crawlSource(source: ScrapeSource): Promise<ParsedListing[]> {
  const listings: ParsedListing[] = [];
  for (const url of source.entryUrls) {
    const response = await axios.get<string>(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    const html = response.data;
    const $ = cheerio.load(html);
    const cards = $(source.selectors.card);
    if (!cards.length) {
      listings.push({
        sourceId: source.id,
        sourceLabel: source.label,
        url,
        htmlSnippet: html.slice(0, 6000),
        locationText: source.locationHints.join(', '),
      });
      continue;
    }
    cards.each((_, element) => {
      const node = $(element);
      const parsed: ParsedListing = {
        sourceId: source.id,
        sourceLabel: source.label,
        url,
        htmlSnippet: node.html()?.slice(0, 6000) ?? '',
        title: source.selectors.title ? node.find(source.selectors.title).text().trim() : undefined,
        priceText: source.selectors.price ? node.find(source.selectors.price).text().trim() : undefined,
        rentText: source.selectors.rent ? node.find(source.selectors.rent).text().trim() : undefined,
        unitText: source.selectors.units ? node.find(source.selectors.units).text().trim() : undefined,
        locationText: source.selectors.location ? node.find(source.selectors.location).text().trim() : undefined,
        typeText: source.selectors.type ? node.find(source.selectors.type).text().trim() : undefined,
      };
      listings.push(parsed);
    });
  }
  return listings;
}

async function runScrape(triggeredBy: string) {
  const db = admin.firestore();
  const runRef = db.collection('scrape_runs').doc();
  const runId = runRef.id;
  const startedAt = DateTime.utc().toISO();
  await runRef.set({
    status: 'running',
    triggeredBy,
    startedAt,
    totalSources: SCRAPE_SOURCES.length,
  });
  const normalizedListings: NormalizedListing[] = [];
  const errors: string[] = [];
  for (const source of SCRAPE_SOURCES) {
    try {
      const parsedListings = await crawlSource(source);
      for (const parsed of parsedListings) {
        const normalized = normalizeListing(parsed);
        normalizedListings.push(normalized);
        await persistNormalizedListing(normalized, runId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${source.id}: ${message}`);
    }
  }
  const completedAt = DateTime.utc().toISO();
  await runRef.set(
    {
      status: 'completed',
      completedAt,
      processedListings: normalizedListings.length,
      errorCount: errors.length,
      errors,
    },
    { merge: true }
  );
  return { runId, normalizedListings, errors };
}

export const fetchPropertyListings = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response<any>) => {
    try {
      const triggeredBy = (req.body && req.body.triggeredBy) || 'manual';
      const result = await runScrape(triggeredBy);
      res.status(200).json({
        runId: result.runId,
        listings: result.normalizedListings,
        errorCount: result.errors.length,
        errors: result.errors,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });

export const scheduledPropertyRefresh = functions.pubsub
  .schedule('0 4 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    await runScrape('scheduler');
  });
