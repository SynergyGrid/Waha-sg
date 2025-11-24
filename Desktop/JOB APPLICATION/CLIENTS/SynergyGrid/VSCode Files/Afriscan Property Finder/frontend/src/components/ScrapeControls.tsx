import type { ScrapeStatus } from '../types/property';
import './ScrapeControls.css';

type Props = {
  status?: ScrapeStatus;
  loading: boolean;
  onTrigger: () => void;
};

export function ScrapeControls({ status, loading, onTrigger }: Props) {
  return (
    <section className="scrape-controls">
      <div>
        <h2>Data Collection</h2>
        <p>Kick off a fresh scrape run whenever you need the latest property intel.</p>
        {status && (
          <div className="scrape-status">
            <p>
              Last run: <strong>{new Date(status.completedAt ?? status.startedAt).toLocaleString()}</strong>
            </p>
            <p>
              Processed <strong>{status.processedListings}</strong> listings · Errors {status.errorCount}
            </p>
          </div>
        )}
      </div>
      <button className="primary" onClick={onTrigger} disabled={loading}>
        {loading ? 'Fetching...' : 'Fetch Latest Listings'}
      </button>
    </section>
  );
}
