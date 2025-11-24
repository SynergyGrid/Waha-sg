import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { ManualOverrideModal } from './components/ManualOverrideModal';
import type { PropertyFilters as FiltersType, PropertyRecord, ScrapeStatus } from './types/property';
import { PropertyFilters } from './components/PropertyFilters';
import { PropertyTable } from './components/PropertyTable';
import { ScrapeControls } from './components/ScrapeControls';
import { SummaryCards } from './components/SummaryCards';
import { fetchProperties, overrideProperty, triggerScrape } from './lib/api';

const DEFAULT_FILTERS: FiltersType = {
  location: 'all',
  buildingType: 'all',
  feasibility: 'all',
  search: '',
};

function App() {
  const [filters, setFilters] = useState<FiltersType>(DEFAULT_FILTERS);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>();
  const [selected, setSelected] = useState<PropertyRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProperties = useCallback(
    async (criteria?: FiltersType) => {
      try {
        setLoading(true);
        const data = await fetchProperties(criteria ?? filters);
        setProperties(data);
        setError(null);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Unable to load listings';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    loadProperties(DEFAULT_FILTERS);
  }, [loadProperties]);

  const handleFilterUpdate = (next: FiltersType) => {
    setFilters(next);
    loadProperties(next);
  };

  const handleScrape = async () => {
    try {
      setScrapeLoading(true);
      const status = await triggerScrape('dashboard');
      setScrapeStatus(status);
      await loadProperties(filters);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Scrape failed';
      setError(message);
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleOverride = async (overrides: Partial<PropertyRecord>) => {
    if (!selected) return;
    await overrideProperty(selected.hash, overrides);
    await loadProperties(filters);
  };

  const tableData = useMemo(() => properties, [properties]);

  return (
    <main className="app-shell">
      <header>
        <div>
          <p className="eyebrow">Afriscan Property Finder</p>
          <h1>Pre-trip property radar</h1>
          <p className="subtitle">
            Scrape, normalize, and rank listings across Lagos, Abuja, Enugu, and Ghana in one quick sweep.
          </p>
        </div>
      </header>

      <ScrapeControls status={scrapeStatus} loading={scrapeLoading} onTrigger={handleScrape} />
      <SummaryCards properties={properties} />
      <PropertyFilters filters={filters} onUpdate={handleFilterUpdate} />

      {error && <p className="error-banner">{error}</p>}

      {loading ? <p>Loading listings...</p> : <PropertyTable properties={tableData} onOverride={setSelected} />}

      <ManualOverrideModal property={selected} onClose={() => setSelected(null)} onSave={handleOverride} />
    </main>
  );
}

export default App;
