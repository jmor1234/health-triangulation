import Exa from 'exa-js';
import { exaRateLimiter } from './rateLimiter';
import type { ExaSearchResponse, ExaSearchResult, SearchOptions } from './types';

const exa = new Exa(process.env.EXA_API_KEY);

export async function searchExa(
  query: string,
  options?: SearchOptions,
): Promise<ExaSearchResponse> {
  return exaRateLimiter.schedule(async () => {
    const response = await exa.search(query, {
      type: 'auto' as const,
      numResults: 3,
      contents: {
        highlights: { maxCharacters: 1250 },
      },
      ...(options?.includeText ? { includeText: [options.includeText] } : {}),
      ...(options?.excludeText ? { excludeText: [options.excludeText] } : {}),
      ...(options?.category ? { category: options.category } : {}),
      ...(options?.maxAgeHours ? { maxAgeHours: options.maxAgeHours } : {}),
    });

    const results: ExaSearchResult[] = response.results.map((r) => ({
      url: r.url,
      title: r.title ?? '',
      publishedDate: r.publishedDate ?? null,
      author: r.author ?? null,
      highlights: ((r as Record<string, unknown>).highlights as string[]) ?? [],
    }));

    const costObj = (response as Record<string, unknown>).costDollars as
      | Record<string, unknown>
      | undefined;
    const cost = typeof costObj?.total === 'number' ? costObj.total : 0;

    return { results, costDollars: cost };
  });
}

export async function getContents(
  url: string,
  maxCharacters: number = 400_000,
): Promise<string> {
  return exaRateLimiter.schedule(async () => {
    const response = await exa.getContents([url], {
      text: { maxCharacters },
    });

    const result = response.results[0];
    const text = (result as Record<string, unknown>)?.text as string | undefined;
    if (!text) {
      throw new Error(`No content retrieved from ${url}`);
    }

    return text;
  });
}

export async function getHighlights(
  url: string,
  query: string,
  maxCharacters: number = 10_000,
): Promise<{ url: string; title: string; highlights: string[] }> {
  return exaRateLimiter.schedule(async () => {
    const response = await exa.getContents([url], {
      highlights: { maxCharacters, query },
    });

    const result = response.results[0];
    const highlights =
      ((result as Record<string, unknown>).highlights as string[]) ?? [];

    return {
      url: result.url,
      title: result.title ?? '',
      highlights,
    };
  });
}
