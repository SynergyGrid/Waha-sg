import type { PropertyRecord } from '../types/property';
import './PropertyTable.css';

type Props = {
  properties: PropertyRecord[];
  onOverride: (record: PropertyRecord) => void;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatCurrency(value?: number, currencyCode?: string) {
  if (!value || !currencyCode) return '—';
  if (currencyCode === 'NGN') {
    return `₦${value.toLocaleString('en-NG')}`;
  }
  return currencyFormatter.format(value);
}

function formatRoi(roi?: number) {
  if (!roi && roi !== 0) return '—';
  return `${(roi * 100).toFixed(1)}%`;
}

function formatPayback(years?: number) {
  if (!years) return '—';
  return `${years.toFixed(1)} yrs`;
}

function feasibilityBadge(tag: PropertyRecord['feasibility']) {
  const labelMap = {
    strong_candidate: 'Strong fit',
    needs_review: 'Needs review',
    low_priority: 'Low priority',
  } as const;
  return labelMap[tag];
}

export function PropertyTable({ properties, onOverride }: Props) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Price</th>
            <th>Rent (per unit)</th>
            <th>Units</th>
            <th>Revenue</th>
            <th>ROI</th>
            <th>Feasibility</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.hash}>
              <td>
                <div className="title-cell">
                  <a href={property.url} target="_blank" rel="noreferrer">
                    {property.title}
                  </a>
                  <span className="meta">
                    {property.location ?? 'Unknown'} · {property.buildingType}
                  </span>
                  <span className="meta">Source: {property.sourceLabel}</span>
                </div>
              </td>
              <td>{formatCurrency(property.priceValue, property.priceCurrency)}</td>
              <td>{formatCurrency(property.rentPerUnit, property.rentCurrency)}</td>
              <td>{property.unitCount ?? '—'}</td>
              <td>{formatCurrency(property.annualRevenue, property.rentCurrency ?? 'NGN')}</td>
              <td>
                <div className="roi">
                  {formatRoi(property.roiRatio)}
                  <span>{formatPayback(property.paybackYears)}</span>
                </div>
              </td>
              <td>
                <span className={`badge ${property.feasibility}`}>{feasibilityBadge(property.feasibility)}</span>
              </td>
              <td>
                <button onClick={() => onOverride(property)}>Override</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {properties.length === 0 && <p className="empty">No properties match the current filters.</p>}
    </div>
  );
}
