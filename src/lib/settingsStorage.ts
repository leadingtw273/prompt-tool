import type { AppSettings } from '@/types';

export const STORAGE_KEY = 'prompt-tool:settings';

export const DEFAULT_SYSTEM_PROMPT =
  'You are a professional prompt engineer specialized in AI image generation. ' +
  'Improve the following prompt to be more vivid, specific, and visually rich ' +
  'while preserving the original composition, character, outfit, scene, pose, ' +
  'and expression intent. Avoid adding content that changes the subject.';

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
