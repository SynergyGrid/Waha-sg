import type { PropertyFilters } from '../types/property';
import './PropertyFilters.css';

type Props = {
  filters: PropertyFilters;
  onUpdate: (next: PropertyFilters) => void;
};

const LOCATIONS = ['all', 'Lagos', 'Abuja', 'Enugu', 'Accra', 'Ghana'];
const BUILDING_TYPES = ['all', 'multipurpose', 'hotel', 'apartment', 'other'];
const FEASIBILITY = ['all', 'strong_candidate', 'needs_review', 'low_priority'];

export function PropertyFilters({ filters, onUpdate }: Props) {
  const update = (key: keyof PropertyFilters, value: string) => {
    onUpdate({ ...filters, [key]: value });
  };

  return (
    <section className="filters">
      <select value={filters.location} onChange={(event) => update('location', event.target.value)}>
        {LOCATIONS.map((value) => (
          <option key={value} value={value}>
            {value === 'all' ? 'All locations' : value}
          </option>
        ))}
      </select>
      <select value={filters.buildingType} onChange={(event) => update('buildingType', event.target.value)}>
        {BUILDING_TYPES.map((value) => (
          <option key={value} value={value}>
            {value === 'all' ? 'All building types' : value}
          </option>
        ))}
      </select>
      <select value={filters.feasibility} onChange={(event) => update('feasibility', event.target.value)}>
        {FEASIBILITY.map((value) => (
          <option key={value} value={value}>
            {value === 'all' ? 'All feasibility' : value.replace('_', ' ')}
          </option>
        ))}
      </select>
      <input
        type="search"
        placeholder="Search title or city"
        value={filters.search}
        onChange={(event) => update('search', event.target.value)}
      />
    </section>
  );
}
