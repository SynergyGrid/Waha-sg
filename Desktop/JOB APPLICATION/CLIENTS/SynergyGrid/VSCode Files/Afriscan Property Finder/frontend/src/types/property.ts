export type BuildingType = 'multipurpose' | 'hotel' | 'apartment' | 'other';
export type Feasibility = 'strong_candidate' | 'needs_review' | 'low_priority';

export interface PropertyRecord {
  hash: string;
  title: string;
  sourceLabel: string;
  url: string;
  priceValue?: number;
  priceCurrency?: 'NGN' | 'USD';
  rentPerUnit?: number;
  rentCurrency?: 'NGN' | 'USD';
  unitCount?: number;
  buildingType: BuildingType;
  location?: string;
  annualRevenue?: number;
  roiRatio?: number;
  paybackYears?: number;
  feasibility: Feasibility;
  flags: string[];
  updatedAt?: string;
}

export interface PropertyFilters {
  location: string;
  buildingType: string;
  feasibility: string;
  search: string;
}

export interface ScrapeStatus {
  runId: string;
  startedAt: string;
  completedAt?: string;
  processedListings: number;
  errorCount: number;
}
