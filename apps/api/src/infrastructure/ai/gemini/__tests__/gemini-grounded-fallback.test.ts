import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiToolUnavailableError } from '../../../../core/ports/ai-provider.port';
import { type ProviderHealth } from '../../../../core/ports/provider-health.port';

const generateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    public models = { generateContent };
  },
}));

import { GeminiAiProvider } from '../gemini.ai-provider';

const apiError = (status: number, message = 'failure') =>
  Object.assign(new Error(message), { status });

const okResponse = (text: string) => ({
  text,
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
  candidates: [
    {
      groundingMetadata: {
        groundingChunks: [{ web: { uri: 'https://acme.example', title: 'Acme' } }],
      },
    },
  ],
});

const searchRequest = {
  model: 'grounded' as const,
  system: 'system',
  content: 'content',
  jsonSchema: {},
  tools: ['google_search' as const],
  timeoutMs: 50_000,
};

const makeProvider = () =>
  new GeminiAiProvider(
    'key',
    {
      extract: 'extract-model',
      grounded: 'grounded-main',
      fallbacks: ['plain-fallback'],
      groundedFallbacks: ['search-fallback-1', 'search-fallback-2'],
    },
    true,
  );

const modelsCalled = () => generateContent.mock.calls.map((call) => call[0].model as string);

describe('GeminiAiProvider search fallback chain', () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  it('uses the next search model when the main grounded model is over quota', async () => {
    generateContent.mockImplementation(async ({ model }: { model: string }) => {
      if (model === 'grounded-main') throw apiError(429, 'quota');
      return okResponse('{"found":true}');
    });

    const result = await makeProvider().generateJson<{ found: boolean }>(searchRequest);

    expect(result.data.found).toBe(true);
    expect(result.modelId).toBe('search-fallback-1');
    expect(modelsCalled()).toEqual(['grounded-main', 'search-fallback-1']);
  });

  it('moves on when a model rejects the search tool', async () => {
    generateContent.mockImplementation(async ({ model }: { model: string }) => {
      if (model !== 'search-fallback-2') {
        throw apiError(400, 'Search tool is not supported for this model');
      }
      return okResponse('{"found":true}');
    });

    const result = await makeProvider().generateJson<{ found: boolean }>(searchRequest);

    expect(result.modelId).toBe('search-fallback-2');
    expect(modelsCalled()).toEqual(['grounded-main', 'search-fallback-1', 'search-fallback-2']);
  });

  it('reports the search as unavailable when every search model is over quota', async () => {
    generateContent.mockRejectedValue(apiError(429, 'quota'));

    await expect(makeProvider().generateJson(searchRequest)).rejects.toBeInstanceOf(
      AiToolUnavailableError,
    );
    expect(modelsCalled()).toEqual(['grounded-main', 'search-fallback-1', 'search-fallback-2']);
  });

  it('does not use the plain fallback models for search calls', async () => {
    generateContent.mockRejectedValue(apiError(503, 'overloaded'));

    await expect(makeProvider().generateJson(searchRequest)).rejects.toThrow();
    expect(modelsCalled()).not.toContain('plain-fallback');
  });

  it('keeps using the plain fallback chain for calls without search', async () => {
    generateContent.mockImplementation(async ({ model }: { model: string }) => {
      if (model === 'extract-model') throw apiError(503, 'overloaded');
      return okResponse('{"ok":true}');
    });

    const result = await makeProvider().generateJson<{ ok: boolean }>({
      ...searchRequest,
      model: 'extract',
      tools: [],
    });

    expect(result.modelId).toBe('plain-fallback');
  });
});

describe('GeminiAiProvider model health', () => {
  const makeHealth = (open: string[] = []) => {
    const trip = vi.fn(async () => undefined);
    const health: ProviderHealth = {
      isOpen: vi.fn(async (key: string) => open.includes(key)),
      trip,
      snapshot: vi.fn(async () => []),
    };
    return { health, trip };
  };
  const provider = (health: ProviderHealth) =>
    new GeminiAiProvider(
      'key',
      {
        extract: 'extract-model',
        grounded: 'grounded-main',
        fallbacks: ['plain-fallback'],
        groundedFallbacks: ['search-fallback-1'],
      },
      true,
      health,
    );

  beforeEach(() => {
    generateContent.mockReset();
  });

  it('skips a model that is cooling down without calling it', async () => {
    const { health } = makeHealth(['gemini:extract-model:text']);
    generateContent.mockResolvedValue(okResponse('{"ok":true}'));

    const result = await provider(health).generateJson<{ ok: boolean }>({
      ...searchRequest,
      model: 'extract',
      tools: [],
    });

    expect(result.modelId).toBe('plain-fallback');
    expect(modelsCalled()).toEqual(['plain-fallback']);
  });

  it('remembers a search quota failure for 30 minutes and a model that is not found for a day', async () => {
    const { health, trip } = makeHealth();
    generateContent.mockRejectedValue(apiError(429, 'quota'));
    await expect(provider(health).generateJson(searchRequest)).rejects.toBeInstanceOf(
      AiToolUnavailableError,
    );
    expect(trip).toHaveBeenCalledWith(
      'gemini:grounded-main:search',
      30 * 60 * 1000,
      expect.any(String),
    );

    const gone = makeHealth();
    generateContent.mockReset();
    generateContent.mockRejectedValue(apiError(404, 'not found'));
    await expect(
      provider(gone.health).generateJson({ ...searchRequest, model: 'extract', tools: [] }),
    ).rejects.toThrow();
    expect(gone.trip).toHaveBeenCalledWith(
      'gemini:extract-model:text',
      24 * 60 * 60 * 1000,
      expect.any(String),
    );
  });

  it('reports search as unavailable at once when every search model is cooling down', async () => {
    const { health } = makeHealth([
      'gemini:grounded-main:search',
      'gemini:search-fallback-1:search',
    ]);
    await expect(provider(health).generateJson(searchRequest)).rejects.toBeInstanceOf(
      AiToolUnavailableError,
    );
    expect(generateContent).not.toHaveBeenCalled();
  });
});
