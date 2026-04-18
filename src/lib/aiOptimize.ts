import type { AppSettings, OptimizedPrompt } from '@/types';

const FORMAT_INSTRUCTION =
  'Return ONLY a JSON object with two keys: "en" (the optimized English prompt) ' +
  'and "zh" (the optimized prompt in Simplified Chinese). ' +
  'Do not include markdown code fences, explanations, or any other text.';

interface OptimizeParams {
  apiKey: string;
  model: AppSettings['model'];
  systemPrompt: string;
  originalPrompt: string;
}

const MODEL_API_CODE: Record<AppSettings['model'], string> = {
  'gemini-3-flash': 'gemini-3-flash-preview',
  'gemini-3.1-pro': 'gemini-3.1-pro-preview',
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-pro': 'gemini-2.5-pro',
};

export async function optimizePrompt(params: OptimizeParams): Promise<OptimizedPrompt> {
  const { apiKey, model, systemPrompt, originalPrompt } = params;
  const userText = `${systemPrompt}\n\n${FORMAT_INSTRUCTION}\n\n---\n\n${originalPrompt}`;
  const apiModel = MODEL_API_CODE[model];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${encodeURIComponent(
    apiKey,
  )}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch {
    throw new Error('網路錯誤，請檢查連線');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = (payload as { error?: { message?: string } }).error?.message ?? '';
    if (response.status === 400 && /api key/i.test(message)) {
      throw new Error('API key 無效');
    }
    if (response.status === 429) {
      throw new Error('已達 API 配額上限');
    }
    if (response.status >= 500) {
      throw new Error('Gemini 伺服器錯誤，請稍後再試');
    }
    throw new Error(message || `Gemini 回傳錯誤（HTTP ${response.status}）`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const stripped = stripCodeFence(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error('回傳格式解析失敗');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Gemini 回傳格式不符');
  }
  const obj = parsed as { en?: unknown; zh?: unknown };
  if (typeof obj.en !== 'string' || typeof obj.zh !== 'string' || !obj.en || !obj.zh) {
    throw new Error('Gemini 回傳格式不符');
  }
  return { en: obj.en, zh: obj.zh };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}
