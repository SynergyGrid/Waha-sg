interface SheetsEnv {
  GOOGLE_SHEETS_ID: string;
  GOOGLE_SHEETS_LISTINGS_RANGE?: string;
  GOOGLE_SHEETS_RUNS_RANGE?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_KEY: string;
}

let scraperModule: Promise<typeof import('../../backend/functions/src/index')> | null = null;

function ensureProcessEnv(env: SheetsEnv) {
  if (!globalThis.process) {
    (globalThis as any).process = { env: {} };
  }
  const target = (globalThis.process as any).env as Record<string, string>;
  target.GOOGLE_SHEETS_ID = env.GOOGLE_SHEETS_ID;
  if (env.GOOGLE_SHEETS_LISTINGS_RANGE) target.GOOGLE_SHEETS_LISTINGS_RANGE = env.GOOGLE_SHEETS_LISTINGS_RANGE;
  if (env.GOOGLE_SHEETS_RUNS_RANGE) target.GOOGLE_SHEETS_RUNS_RANGE = env.GOOGLE_SHEETS_RUNS_RANGE;
  target.GOOGLE_SERVICE_ACCOUNT_EMAIL = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  target.GOOGLE_SERVICE_ACCOUNT_KEY = env.GOOGLE_SERVICE_ACCOUNT_KEY;
}

async function getScraper(env: SheetsEnv) {
  if (!scraperModule) {
    ensureProcessEnv(env);
    scraperModule = import('../../backend/functions/src/index');
  }
  return scraperModule;
}

export const onRequestPost = async (context: { request: Request; env: SheetsEnv }) => {
  try {
    const scraper = await getScraper(context.env);
    let body: { triggeredBy?: string } = {};
    try {
      body = (await context.request.json()) as { triggeredBy?: string };
    } catch (error) {
      // ignore JSON parse errors
    }
    const triggeredBy = body.triggeredBy ?? 'pages-ui';
    const result = await scraper.runScrape(triggeredBy);
    return new Response(
      JSON.stringify({
        runId: result.runId,
        startedAt: (result as any).startedAt ?? null,
        completedAt: (result as any).completedAt ?? null,
        processedListings: result.listings.length,
        errorCount: result.errors.length,
        errors: result.errors,
      }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
