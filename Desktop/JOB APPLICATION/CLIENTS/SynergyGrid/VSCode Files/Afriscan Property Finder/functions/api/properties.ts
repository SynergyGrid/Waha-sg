import { createHash } from 'node:crypto';
import { fetchListingRows, SHEET_HEADERS, type SheetsEnv } from '../_shared/sheets';

interface PropertyRecord {
  hash: string;
  title: string;
  sourceLabel: string;
  url: string;
  priceValue?: number;
  priceCurrency?: string;
  rentPerUnit?: number;
  rentCurrency?: string;
  unitCount?: number;
  buildingType: string;
  location?: string;
  annualRevenue?: number;
  roiRatio?: number;
  paybackYears?: number;
  feasibility: string;
  flags: string[];
  updatedAt?: string;
}

const columnIndex = Object.fromEntries(SHEET_HEADERS.map((header, index) => [header, index] as const));

const toNumber = (value?: string | number) => {
  if (value === undefined || value === '') return undefined;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? Number(num) : undefined;
};

const parseSource = (cell?: string) => {
  if (!cell) return { label: 'Unknown source', id: 'unknown' };
  const match = cell.match(/^(.*)\s+\((.*)\)$/);
  if (match) {
    return { label: match[1].trim(), id: match[2].trim() };
  }
  return { label: cell, id: cell };
};

function mapRow(row: (string | number | undefined)[]): PropertyRecord {
  const sourceCell = row[columnIndex['Source']] as string | undefined;
  const { label: sourceLabel } = parseSource(sourceCell);
  const hash = (row[columnIndex['Hash']] as string | undefined) ?? createHash('md5').update(JSON.stringify(row)).digest('hex');
  return {
    hash,
    title: (row[columnIndex['Title']] as string | undefined) ?? 'Untitled property',
    sourceLabel,
    url: (row[columnIndex['URL']] as string | undefined) ?? '',
    priceValue: toNumber(row[columnIndex['Price']] as string | number | undefined),
    priceCurrency: row[columnIndex['Price Currency']] as string | undefined,
    rentPerUnit: toNumber(row[columnIndex['Rent']] as string | number | undefined),
    rentCurrency: row[columnIndex['Rent Currency']] as string | undefined,
    unitCount: toNumber(row[columnIndex['Units']] as string | number | undefined),
    buildingType: (row[columnIndex['Building Type']] as string | undefined) ?? 'other',
    location: row[columnIndex['Location']] as string | undefined,
    annualRevenue: toNumber(row[columnIndex['Annual Revenue']] as string | number | undefined),
    roiRatio: toNumber(row[columnIndex['ROI']] as string | number | undefined),
    paybackYears: toNumber(row[columnIndex['Payback Years']] as string | number | undefined),
    feasibility: (row[columnIndex['Feasibility']] as string | undefined) ?? 'needs_review',
    flags: ((row[columnIndex['Flags']] as string | undefined) ?? '')
      .split(',')
      .map((flag) => flag.trim())
      .filter(Boolean),
    updatedAt: row[columnIndex['Captured At']] as string | undefined,
  };
}

function filterListings(listings: PropertyRecord[], url: URL) {
  const location = url.searchParams.get('location');
  const buildingType = url.searchParams.get('buildingType');
  const feasibility = url.searchParams.get('feasibility');
  const search = url.searchParams.get('search');
  return listings.filter((listing) => {
    if (location && location !== 'all' && listing.location !== location) return false;
    if (buildingType && buildingType !== 'all' && listing.buildingType !== buildingType) return false;
    if (feasibility && feasibility !== 'all' && listing.feasibility !== feasibility) return false;
    if (search) {
      const target = `${listing.title} ${listing.location ?? ''} ${listing.sourceLabel}`.toLowerCase();
      if (!target.includes(search.toLowerCase())) return false;
    }
    return true;
  });
}

export const onRequestGet = async (context: { request: Request; env: SheetsEnv }) => {
  try {
    const rows = await fetchListingRows(context.env);
    if (!rows.length) {
      return new Response(JSON.stringify([]), { headers: { 'content-type': 'application/json' } });
    }
    const [, ...dataRows] = rows;
    const listings = dataRows.map(mapRow);
    const filtered = filterListings(listings, new URL(context.request.url));
    return new Response(JSON.stringify(filtered), { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
