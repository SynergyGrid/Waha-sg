import { useMemo } from 'react';
import type { PropertyRecord } from '../types/property';
import './SummaryCards.css';

type Props = {
  properties: PropertyRecord[];
};

function formatNumber(value: number) {
  return value.toLocaleString('en-US');
}

function formatPercentage(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function SummaryCards({ properties }: Props) {
  const stats = useMemo(() => {
    if (!properties.length) {
      return {
        strong: 0,
        avgRoi: Number.NaN,
        avgPayback: Number.NaN,
        lastUpdated: '—',
      };
    }
    const strong = properties.filter((item) => item.feasibility === 'strong_candidate').length;
    const avgRoi =
      properties.reduce((sum, item) => sum + (item.roiRatio ?? 0), 0) / (properties.length || 1);
    const avgPayback =
      properties.reduce((sum, item) => sum + (item.paybackYears ?? 0), 0) / (properties.length || 1);
    const latest = properties.reduce((latestDate, item) => {
      if (!item.updatedAt) return latestDate;
      return item.updatedAt > latestDate ? item.updatedAt : latestDate;
    }, '');
    return {
      strong,
      avgRoi,
      avgPayback,
      lastUpdated: latest ? new Date(latest).toLocaleString() : '—',
    };
  }, [properties]);

  return (
    <section className="summary-cards">
      <article>
        <h3>Total listings</h3>
        <p>{properties.length ? formatNumber(properties.length) : '—'}</p>
      </article>
      <article>
        <h3>Strong candidates</h3>
        <p>{formatNumber(stats.strong)}</p>
      </article>
      <article>
        <h3>Avg ROI</h3>
        <p>{Number.isFinite(stats.avgRoi) ? formatPercentage(stats.avgRoi) : '—'}</p>
      </article>
      <article>
        <h3>Avg payback</h3>
        <p>{Number.isFinite(stats.avgPayback) ? `${stats.avgPayback.toFixed(1)} yrs` : '—'}</p>
      </article>
      <article>
        <h3>Last updated</h3>
        <p>{stats.lastUpdated}</p>
      </article>
    </section>
  );
}
