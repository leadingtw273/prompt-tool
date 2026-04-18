import { afterEach, describe, expect, it, vi } from 'vitest';
import { optimizePrompt } from '@/lib/aiOptimize';

function mockFetchOk(bodyText: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: bodyText }] } }],
    }),
  });
}

function mockFetchErr(status: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  });
}

const baseParams = {
  apiKey: 'test-key',
  model: 'gemini-2.5-flash' as const,
  systemPrompt: 'SYSTEM',
  originalPrompt: 'ORIGINAL',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('optimizePrompt', () => {
  it('returns {en, zh} for a valid JSON response', async () => {
    vi.stubGlobal('fetch', mockFetchOk('{"en":"EN","zh":"ZH"}'));
    const r = await optimizePrompt(baseParams);
    expect(r).toEqual({ en: 'EN', zh: 'ZH' });
  });

  it('strips markdown code fences before parsing', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOk('```json\n{"en":"EN","zh":"ZH"}\n```'),
    );
    const r = await optimizePrompt(baseParams);
    expect(r).toEqual({ en: 'EN', zh: 'ZH' });
  });

  it('sends systemPrompt, format instruction, and originalPrompt in the request body', async () => {
    const fetchMock = mockFetchOk('{"en":"EN","zh":"ZH"}');
    vi.stubGlobal('fetch', fetchMock);
    await optimizePrompt(baseParams);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    const text = body.contents[0].parts[0].text as string;
    expect(text).toContain('SYSTEM');
    expect(text).toContain('ORIGINAL');
    expect(text).toMatch(/JSON object/);
  });

  it('maps gemini-3-flash and gemini-3.1-pro to their -preview API codes in the URL', async () => {
    const fetchMock = mockFetchOk('{"en":"EN","zh":"ZH"}');
    vi.stubGlobal('fetch', fetchMock);
    await optimizePrompt({ ...baseParams, model: 'gemini-3-flash' });
    await optimizePrompt({ ...baseParams, model: 'gemini-3.1-pro' });
    await optimizePrompt({ ...baseParams, model: 'gemini-2.5-pro' });
    const urls = fetchMock.mock.calls.map(([url]) => url as string);
    expect(urls[0]).toContain('/models/gemini-3-flash-preview:generateContent');
    expect(urls[1]).toContain('/models/gemini-3.1-pro-preview:generateContent');
    expect(urls[2]).toContain('/models/gemini-2.5-pro:generateContent');
  });

  it('throws "Gemini 回傳格式不符" when en or zh is missing', async () => {
    vi.stubGlobal('fetch', mockFetchOk('{"en":"EN"}'));
    await expect(optimizePrompt(baseParams)).rejects.toThrow('Gemini 回傳格式不符');
  });

  it('throws "回傳格式解析失敗" when payload text is not JSON', async () => {
    vi.stubGlobal('fetch', mockFetchOk('not json at all'));
    await expect(optimizePrompt(baseParams)).rejects.toThrow('回傳格式解析失敗');
  });

  it('throws "API key 無效" on HTTP 400 with invalid key message', async () => {
    vi.stubGlobal('fetch', mockFetchErr(400, 'API key not valid. Please pass a valid API key.'));
    await expect(optimizePrompt(baseParams)).rejects.toThrow('API key 無效');
  });

  it('throws "已達 API 配額上限" on HTTP 429', async () => {
    vi.stubGlobal('fetch', mockFetchErr(429, 'quota exceeded'));
    await expect(optimizePrompt(baseParams)).rejects.toThrow('已達 API 配額上限');
  });

  it('throws "Gemini 伺服器錯誤" on HTTP 500', async () => {
    vi.stubGlobal('fetch', mockFetchErr(500, 'internal'));
    await expect(optimizePrompt(baseParams)).rejects.toThrow('Gemini 伺服器錯誤');
  });

  it('throws "網路錯誤" when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
    await expect(optimizePrompt(baseParams)).rejects.toThrow('網路錯誤');
  });

  it('throws the raw API message on HTTP 400 without api key in the message', async () => {
    vi.stubGlobal('fetch', mockFetchErr(400, 'Request payload size exceeds the limit'));
    await expect(optimizePrompt(baseParams)).rejects.toThrow('Request payload size exceeds the limit');
  });

  it('throws "Gemini 回傳格式不符" when response body is null JSON', async () => {
    vi.stubGlobal('fetch', mockFetchOk('null'));
    await expect(optimizePrompt(baseParams)).rejects.toThrow('Gemini 回傳格式不符');
  });

  it('throws "Gemini 回傳格式不符" when response body is JSON array', async () => {
    vi.stubGlobal('fetch', mockFetchOk('[1,2,3]'));
    await expect(optimizePrompt(baseParams)).rejects.toThrow('Gemini 回傳格式不符');
  });
});
