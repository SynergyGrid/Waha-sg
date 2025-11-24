import type { PropertyFilters, PropertyRecord, ScrapeStatus } from '../types/property';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

const mockProperties: PropertyRecord[] = [
  {
    hash: 'lagos-hotel',
    title: '100-unit Hotel - Victoria Island',
    sourceLabel: 'PropertyPro (Nigeria)',
    url: 'https://www.propertypro.ng/listing/sample-hotel',
    priceValue: 750_000_000,
    priceCurrency: 'NGN',
    rentPerUnit: 1_000_000,
    rentCurrency: 'NGN',
    unitCount: 100,
    buildingType: 'hotel',
    location: 'Lagos',
    annualRevenue: 100_000_000,
    roiRatio: 0.133,
    paybackYears: 7.5,
    feasibility: 'needs_review',
    flags: ['needs_negotiation'],
    updatedAt: new Date().toISOString(),
  },
  {
    hash: 'abuja-multipurpose',
    title: 'Multipurpose Office + Apartments',
    sourceLabel: 'Nigeria Property Centre',
    url: 'https://www.nigeriapropertycentre.com/sample',
    priceValue: 200_000_000,
    priceCurrency: 'NGN',
    rentPerUnit: 1_000_000,
    rentCurrency: 'NGN',
    unitCount: 90,
    buildingType: 'multipurpose',
    location: 'Abuja',
    annualRevenue: 90_000_000,
    roiRatio: 0.45,
    paybackYears: 2.2,
    feasibility: 'strong_candidate',
    flags: ['verify_documentation'],
    updatedAt: new Date().toISOString(),
  },
  {
    hash: 'ghana-apartment',
    title: 'Accra Temporary Apartments',
    sourceLabel: 'Meqasa',
    url: 'https://meqasa.com/sample',
    priceValue: 137_000,
    priceCurrency: 'USD',
    rentPerUnit: 1_000_000,
    rentCurrency: 'NGN',
    unitCount: 60,
    buildingType: 'apartment',
    location: 'Accra',
    annualRevenue: 60_000_000,
    roiRatio: 4.38,
    paybackYears: 0.23,
    feasibility: 'strong_candidate',
    flags: ['currency_conversion_needed'],
    updatedAt: new Date().toISOString(),
  },
];

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('API base URL not configured');
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchProperties(filters?: Partial<PropertyFilters>): Promise<PropertyRecord[]> {
  if (!API_BASE_URL) {
    return mockProperties.filter((property) => {
      if (filters?.location && filters.location !== 'all' && filters.location !== property.location) {
        return false;
      }
      if (filters?.buildingType && filters.buildingType !== 'all' && filters.buildingType !== property.buildingType) {
        return false;
      }
      if (filters?.feasibility && filters.feasibility !== 'all' && filters.feasibility !== property.feasibility) {
        return false;
      }
      if (filters?.search && !property.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }
  const query = new URLSearchParams();
  if (filters?.location && filters.location !== 'all') query.set('location', filters.location);
  if (filters?.buildingType && filters.buildingType !== 'all') query.set('buildingType', filters.buildingType);
  if (filters?.feasibility && filters.feasibility !== 'all') query.set('feasibility', filters.feasibility);
  if (filters?.search) query.set('search', filters.search);
  const queryString = query.toString();
  return request<PropertyRecord[]>(`/properties${queryString ? `?${queryString}` : ''}`);
}

export async function triggerScrape(triggeredBy = 'UI'): Promise<ScrapeStatus> {
  if (!API_BASE_URL) {
    const now = new Date().toISOString();
    return {
      runId: `mock-${Date.now()}`,
      startedAt: now,
      completedAt: now,
      processedListings: mockProperties.length,
      errorCount: 0,
    };
  }
  return request<ScrapeStatus>('/fetchPropertyListings', {
    method: 'POST',
    body: JSON.stringify({ triggeredBy }),
  });
}

export async function overrideProperty(hash: string, overrides: Partial<PropertyRecord>): Promise<PropertyRecord> {
  if (!API_BASE_URL) {
    const index = mockProperties.findIndex((item) => item.hash === hash);
    if (index === -1) {
      throw new Error('Property not found');
    }
    mockProperties[index] = { ...mockProperties[index], ...overrides };
    return mockProperties[index];
  }
  return request<PropertyRecord>(`/properties/${hash}`, {
    method: 'PATCH',
    body: JSON.stringify(overrides),
  });
}
