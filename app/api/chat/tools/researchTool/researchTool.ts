import { tool } from 'ai';
import { z } from 'zod';
import { searchExa } from './exaSearch/exaClient';

export const searchTool = tool({
  description:
    'Semantic web search — finds pages by meaning, not keywords. Returns results with highlighted excerpts. Make parallel calls for different search angles.',
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        'Describe the ideal document to find. Rich, descriptive queries outperform keywords.',
      ),
    includeText: z
      .string()
      .optional()
      .describe(
        'Term that MUST appear in results. Only for critical proper nouns or jargon. Max 5 words.',
      ),
    excludeText: z
      .string()
      .optional()
      .describe(
        'Term that MUST NOT appear in results. For filtering noise. Max 5 words.',
      ),
    category: z
      .enum(['research paper', 'news', 'personal site', 'pdf', 'people'])
      .optional()
      .describe(
        'Focus results on a specific content type. Use "people" to locate a specific figure\'s primary content surface, "personal site" for blogs/substacks, "research paper" for primary literature, "pdf" for documents, "news" for journalism.',
      ),
    maxAgeHours: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Freshness filter — only return content newer than this many hours. Use for time-sensitive queries.',
      ),
  }),
  execute: async ({ query, includeText, excludeText, category, maxAgeHours }) => {
    const start = Date.now();

    const response = await searchExa(query, {
      ...(includeText ? { includeText } : {}),
      ...(excludeText ? { excludeText } : {}),
      ...(category ? { category } : {}),
      ...(maxAgeHours ? { maxAgeHours } : {}),
    });

    const results = response.results.map((r) => ({
      url: r.url,
      title: r.title,
      highlights: r.highlights,
      publishedDate: r.publishedDate,
      author: r.author,
    }));

    const resultTokens = Math.round(JSON.stringify(results).length / 4);
    const filters = [
      category,
      includeText && `+${includeText}`,
      excludeText && `-${excludeText}`,
      maxAgeHours && `<${maxAgeHours}h`,
    ]
      .filter(Boolean)
      .join(' ');
    console.log(
      `[Search] "${query.substring(0, 80)}"${filters ? ` [${filters}]` : ''} → ${results.length} results · ${Date.now() - start}ms · ~${resultTokens} tok`,
    );
    results.forEach((r, i) => {
      let domain = '';
      try {
        domain = new URL(r.url).hostname.replace(/^www\./, '');
      } catch {
        /* */
      }
      console.log(`  ${i + 1}. ${domain} — ${r.title}`);
    });

    return results;
  },
});
