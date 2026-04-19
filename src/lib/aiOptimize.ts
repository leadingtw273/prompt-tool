import type { AppSettings, OptimizedPrompt } from '@/types';

const FORMAT_INSTRUCTION_BOTH =
  'Return ONLY a JSON object with two keys: "en" (the optimized English prompt) ' +
  'and "zh" (the optimized prompt in Simplified Chinese). ' +
  'Do not include markdown code fences, explanations, or any other text.';

const FORMAT_INSTRUCTION_SINGLE: Record<'en' | 'zh', string> = {
  en:
    'Return ONLY the optimized English prompt as plain text. ' +
    'Do not include markdown code fences, explanations, or any other text.',
  zh:
    'Return ONLY the optimized prompt in Simplified Chinese as plain text. ' +
    'Do not include markdown code fences, explanations, or any other text.',
};

interface OptimizeParams {
  apiKey: string;
  model: AppSettings['model'];
  systemPrompt: string;
  originalPrompt: string;
  /**
   * Pre-serialized JSON string of the raw source records backing this prompt
   * (character config, outfit/scene/pose/expression/composition records,
   * tier constraint). Injected into the request as read-only context so the
   * model can disambiguate which tokens are LoRA triggers, which phrases
   * come from user data, etc. Optional.
   */
  backgroundData?: string;
}

const MODEL_API_CODE: Record<AppSettings['model'], string> = {
  'gemini-3-flash': 'gemini-3-flash-preview',
  'gemini-3.1-pro': 'gemini-3.1-pro-preview',
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-pro': 'gemini-2.5-pro',
};

export async function optimizePrompt(params: OptimizeParams): Promise<OptimizedPrompt> {
  const text = await callGemini(params, FORMAT_INSTRUCTION_BOTH, 'application/json');
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

export async function optimizeSingleLanguage(
  params: OptimizeParams & { language: 'en' | 'zh' },
): Promise<string> {
  const text = await callGemini(params, FORMAT_INSTRUCTION_SINGLE[params.language], 'text/plain');
  const stripped = stripCodeFence(text).trim();
  if (!stripped) {
    throw new Error('Gemini 回傳格式不符');
  }
  return stripped;
}

async function callGemini(
  params: OptimizeParams,
  formatInstruction: string,
  responseMimeType: 'application/json' | 'text/plain',
): Promise<string> {
  const { apiKey, model, systemPrompt, originalPrompt, backgroundData } = params;
  const contextSection = backgroundData
    ? `\n\n--- Context (source records, for reference only; do not echo back) ---\n${backgroundData}\n--- End of context ---`
    : '';
  const userText = `${systemPrompt}\n\n${formatInstruction}${contextSection}\n\n---\n\n${originalPrompt}`;
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
          responseMimeType,
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
  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}
