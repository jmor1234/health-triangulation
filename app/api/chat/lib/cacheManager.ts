import type { ModelMessage, Tool } from 'ai';

const EPHEMERAL = { type: 'ephemeral' as const };

type AnthropicCachedOptions = {
  cacheControl?: typeof EPHEMERAL;
  [key: string]: unknown;
};

function withAnthropicCache<T extends { providerOptions?: Record<string, unknown> }>(item: T): T {
  const existingAnthropic = (item.providerOptions?.anthropic ?? {}) as AnthropicCachedOptions;
  return {
    ...item,
    providerOptions: {
      ...item.providerOptions,
      anthropic: { ...existingAnthropic, cacheControl: EPHEMERAL },
    },
  };
}

function stripAnthropicCache<T extends { providerOptions?: Record<string, unknown> }>(item: T): T {
  const anthropic = item.providerOptions?.anthropic as AnthropicCachedOptions | undefined;
  if (!anthropic?.cacheControl) return item;
  const { cacheControl: _drop, ...rest } = anthropic;
  return {
    ...item,
    providerOptions: { ...item.providerOptions, anthropic: rest },
  };
}

export class CacheManager {
  /**
   * System messages: stable portion gets a cache breakpoint (changes rarely),
   * dynamic portion (e.g. current date) does not.
   */
  buildCachedSystemMessages(stable: string, dynamic: string): ModelMessage[] {
    return [
      withAnthropicCache({ role: 'system', content: stable } as ModelMessage),
      { role: 'system', content: dynamic } as ModelMessage,
    ];
  }

  /**
   * Attach a cache breakpoint to the last tool in the registry.
   * Anthropic caches everything in the prefix up to the breakpoint —
   * marking the last tool caches the entire tools section.
   */
  prepareCachedTools<T extends Record<string, Tool>>(tools: T): T {
    const keys = Object.keys(tools);
    if (keys.length === 0) return tools;

    const lastKey = keys[keys.length - 1];
    const lastTool = tools[lastKey];

    return {
      ...tools,
      [lastKey]: withAnthropicCache(lastTool as Tool & { providerOptions?: Record<string, unknown> }),
    } as T;
  }

  /**
   * Advance the history cache breakpoint each step. Strip any prior
   * non-system breakpoints and place a fresh one on the last message.
   * Keeps within Anthropic's 4-breakpoint limit (system stable, tools, history).
   */
  applyHistoryCacheBreakpoint(messages: ModelMessage[]): ModelMessage[] {
    if (messages.length === 0) return messages;

    return messages.map((msg, i) => {
      if (msg.role === 'system') return msg;
      const isLast = i === messages.length - 1;
      const stripped = stripAnthropicCache(msg as ModelMessage & { providerOptions?: Record<string, unknown> });
      return isLast ? withAnthropicCache(stripped) : stripped;
    });
  }
}
