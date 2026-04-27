export interface ExaSearchResult {
  url: string;
  title: string;
  publishedDate: string | null;
  author: string | null;
  highlights: string[];
}

export interface ExaSearchResponse {
  results: ExaSearchResult[];
  costDollars: number;
}

export type SearchCategory =
  | 'research paper'
  | 'news'
  | 'personal site'
  | 'pdf'
  | 'people';

export interface SearchOptions {
  includeText?: string;
  excludeText?: string;
  category?: SearchCategory;
  maxAgeHours?: number;
}
