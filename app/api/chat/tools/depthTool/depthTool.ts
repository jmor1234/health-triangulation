import { tool } from 'ai';
import { z } from 'zod';
import { getContents } from '../researchTool/exaSearch/exaClient';
import { extractFromDocument } from './extraction/agent';
import type { DepthToolOutput } from './types';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export const depthTool = tool({
  description:
    "Extract targeted information from a URL's full content. Returns structured findings with evidence. Use when excerpts aren't enough and you need to mine a long or dense document.",
  inputSchema: z.object({
    url: z.string().url().describe('The URL to extract information from.'),
    objective: z
      .string()
      .describe('What specific information to look for in this source.'),
  }),
  execute: async ({ url, objective }): Promise<DepthToolOutput> => {
    const start = Date.now();
    const currentDate = dateFormatter.format(new Date());
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      /* */
    }

    const fullText = await getContents(url);
    const extraction = await extractFromDocument(fullText, objective, currentDate);

    const output = { ...extraction, url };
    const resultTokens = Math.round(JSON.stringify(output).length / 4);
    console.log(
      `[Depth]  ${domain} → "${objective.substring(0, 60)}" · ${extraction.findings.length} findings · ${Date.now() - start}ms · ~${resultTokens} tok`,
    );

    return output;
  },
});
