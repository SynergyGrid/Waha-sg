import { google, sheets_v4 } from 'googleapis';

export type SheetsEnv = {
  GOOGLE_SHEETS_ID: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_KEY: string;
  GOOGLE_SHEETS_LISTINGS_RANGE?: string;
  GOOGLE_SHEETS_RUNS_RANGE?: string;
};

const SHEET_HEADERS = [
  'Hash',
  'Source',
  'Title',
  'URL',
  'Price',
  'Price Currency',
  'Rent',
  'Rent Currency',
  'Units',
  'Building Type',
  'Location',
  'Annual Revenue',
  'ROI',
  'Payback Years',
  'Feasibility',
  'Price Source',
  'Rent Source',
  'Unit Source',
  'Flags',
  'Captured At',
];

export async function getSheetsClient(env: SheetsEnv): Promise<sheets_v4.Sheets> {
  const key = env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

export async function fetchListingRows(env: SheetsEnv) {
  const sheets = await getSheetsClient(env);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: env.GOOGLE_SHEETS_LISTINGS_RANGE ?? 'Listings!A1',
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const values = response.data.values ?? [];
  if (!values.length) {
    return [];
  }
  return values;
}

export { SHEET_HEADERS };
