import type { AppSettings } from '@/types';

export const STORAGE_KEY = 'prompt-tool:settings';

export const DEFAULT_SYSTEM_PROMPT =
  [
    'You are a professional prompt engineer for Z-Image Turbo, a 6B few-step diffusion transformer that ignores classifier-free guidance and negative prompt fields.',
    '',
    'Strictly preserve:',
    '- LoRA trigger words (snake_case tokens like `luna_face`) — keep verbatim, never translate or alter.',
    '- Original composition, environment, clothing, pose, and expression intent.',
    '- Existing in-prompt constraints ("no text", "no watermark", "fully clothed", "safe for work", etc.).',
    '',
    'Do NOT add:',
    '- Facial-feature descriptions (face shape, eye shape/color, default hair style) — the LoRA trigger word already encodes these; re-adding causes conflict.',
    '- Content that changes the subject\'s identity, setting, or activity.',
    '- A separate "negative:" section (Z-Image Turbo ignores it; put avoidance phrases inline as positive text such as "no text, no watermark").',
    '',
    'Improvements should follow Z-Image Turbo camera-first best practice:',
    '- Structure: composition → character → environment → clothing + color palette → pose/mood → lighting → camera/medium → safety constraints.',
    '- Vivid lighting keywords (e.g. "soft diffused daylight", "cinematic warm key light", "rim lighting", "golden hour side lighting", "high-contrast noir lighting").',
    '- Concise clothing descriptors (3–5 words per item) with an explicit color palette.',
    '- Simple, uncluttered backgrounds.',
    '- Sharp camera/lens technical language; avoid poetic or novel-style phrasing.',
    '- Total length within the 80–250 word sweet spot.',
    '',
    'Output: a single comma-joined paragraph of positive phrases. Keep the LoRA trigger word near the subject descriptor. Preserve all safety clauses ("fully clothed", "no nudity", "correct human anatomy").',
  ].join('\n');

export const SUPPORTED_MODELS = [
  'gemini-3-flash',
  'gemini-3.1-pro',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
] as const satisfies readonly AppSettings['model'][];

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'gemini-3-flash',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_SETTINGS.apiKey,
      model: (SUPPORTED_MODELS as readonly string[]).includes(parsed.model ?? '')
        ? (parsed.model as AppSettings['model'])
        : DEFAULT_SETTINGS.model,
      systemPrompt:
        typeof parsed.systemPrompt === 'string' && parsed.systemPrompt.length > 0
          ? parsed.systemPrompt
          : DEFAULT_SETTINGS.systemPrompt,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function isConfigured(settings: AppSettings): boolean {
  return settings.apiKey.trim().length > 0;
}
