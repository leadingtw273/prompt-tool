# AI 優化功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 PromptCard 新增 Gemini 驅動的 AI 優化功能，使用者在設定 modal 配置 API key / model / 系統提示詞，優化結果以英文與簡中雙版摺疊呈現。

**Architecture:** 新增三個模組（`settingsStorage`、`aiOptimize`、`SettingsModal`），擴充 `useOrderStore`、`AssembledPrompt` 型別與 `PromptCard` UI；App 層掛載 modal 並傳 settings 與 `onOptimize` callback 到 PromptCard。

**Tech Stack:** React 19, Zustand 5, Tailwind 3, vitest, @testing-library/react；Gemini REST API (`generativelanguage.googleapis.com/v1beta`)。

Spec: `docs/superpowers/specs/2026-04-18-ai-optimize-design.md`

---

### Task 1: 擴充型別（AppSettings / OptimizedPrompt / AssembledPrompt）

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 新增型別**

在 `src/types/index.ts` 檔尾加入：

```ts
export interface AppSettings {
  apiKey: string;
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  systemPrompt: string;
}

export interface OptimizedPrompt {
  en: string;
  zh: string;
}
```

- [ ] **Step 2: 擴充 `AssembledPrompt`**

將 `src/types/index.ts` 中現有的：

```ts
export interface AssembledPrompt {
  orderId: string;
  compCode: string;
  prompt: string;
  estimatedWords: number;
}
```

改為：

```ts
export interface AssembledPrompt {
  orderId: string;
  compCode: string;
  prompt: string;
  estimatedWords: number;
  optimized?: OptimizedPrompt;
  optimizing?: boolean;
  optimizeError?: string;
}
```

- [ ] **Step 3: 型別檢查**

Run: `npm run build`
Expected: PASS（`tsc -b` 應成功）。

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add AppSettings, OptimizedPrompt; extend AssembledPrompt"
```

---

### Task 2: `settingsStorage.ts` 與測試

**Files:**
- Create: `src/lib/settingsStorage.ts`
- Test: `tests/lib/settingsStorage.test.ts`

- [ ] **Step 1: 寫 failing tests**

建立 `tests/lib/settingsStorage.test.ts`：

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SYSTEM_PROMPT,
  isConfigured,
  loadSettings,
  saveSettings,
} from '@/lib/settingsStorage';

describe('settingsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadSettings', () => {
    it('returns defaults when localStorage is empty', () => {
      const s = loadSettings();
      expect(s.apiKey).toBe('');
      expect(s.model).toBe('gemini-2.5-flash');
      expect(s.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
    });

    it('returns defaults when stored JSON is invalid', () => {
      localStorage.setItem('prompt-tool:settings', '{not json');
      const s = loadSettings();
      expect(s.apiKey).toBe('');
      expect(s.model).toBe('gemini-2.5-flash');
    });

    it('fills missing fields with defaults', () => {
      localStorage.setItem(
        'prompt-tool:settings',
        JSON.stringify({ apiKey: 'abc' }),
      );
      const s = loadSettings();
      expect(s.apiKey).toBe('abc');
      expect(s.model).toBe('gemini-2.5-flash');
      expect(s.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
    });
  });

  describe('saveSettings', () => {
    it('writes JSON to localStorage and round-trips', () => {
      saveSettings({
        apiKey: 'key-123',
        model: 'gemini-2.5-pro',
        systemPrompt: 'custom',
      });
      const loaded = loadSettings();
      expect(loaded.apiKey).toBe('key-123');
      expect(loaded.model).toBe('gemini-2.5-pro');
      expect(loaded.systemPrompt).toBe('custom');
    });
  });

  describe('isConfigured', () => {
    it('returns false for empty or whitespace apiKey', () => {
      expect(isConfigured({ apiKey: '', model: 'gemini-2.5-flash', systemPrompt: 'x' })).toBe(false);
      expect(isConfigured({ apiKey: '   ', model: 'gemini-2.5-flash', systemPrompt: 'x' })).toBe(false);
    });

    it('returns true when apiKey has content', () => {
      expect(isConfigured({ apiKey: 'abc', model: 'gemini-2.5-flash', systemPrompt: 'x' })).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/lib/settingsStorage.test.ts`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作 `src/lib/settingsStorage.ts`**

```ts
import type { AppSettings } from '@/types';

const STORAGE_KEY = 'prompt-tool:settings';

export const DEFAULT_SYSTEM_PROMPT =
  'You are a professional prompt engineer specialized in AI image generation. ' +
  'Improve the following prompt to be more vivid, specific, and visually rich ' +
  'while preserving the original composition, character, outfit, scene, pose, ' +
  'and expression intent. Avoid adding content that changes the subject.';

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'gemini-2.5-flash',
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
      model:
        parsed.model === 'gemini-2.5-pro' || parsed.model === 'gemini-2.5-flash'
          ? parsed.model
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/lib/settingsStorage.test.ts`
Expected: PASS 全部 6 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/lib/settingsStorage.ts tests/lib/settingsStorage.test.ts
git commit -m "feat(settingsStorage): add localStorage helpers with defaults"
```

---

### Task 3: `aiOptimize.ts` 與測試

**Files:**
- Create: `src/lib/aiOptimize.ts`
- Test: `tests/lib/aiOptimize.test.ts`

- [ ] **Step 1: 寫 failing tests**

建立 `tests/lib/aiOptimize.test.ts`：

```ts
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
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/lib/aiOptimize.test.ts`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作 `src/lib/aiOptimize.ts`**

```ts
import type { OptimizedPrompt } from '@/types';

const FORMAT_INSTRUCTION =
  'Return ONLY a JSON object with two keys: "en" (the optimized English prompt) ' +
  'and "zh" (the optimized prompt in Simplified Chinese). ' +
  'Do not include markdown code fences, explanations, or any other text.';

interface OptimizeParams {
  apiKey: string;
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  systemPrompt: string;
  originalPrompt: string;
}

export async function optimizePrompt(params: OptimizeParams): Promise<OptimizedPrompt> {
  const { apiKey, model, systemPrompt, originalPrompt } = params;
  const userText = `${systemPrompt}\n\n${FORMAT_INSTRUCTION}\n\n---\n\n${originalPrompt}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/lib/aiOptimize.test.ts`
Expected: PASS 全部 9 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/lib/aiOptimize.ts tests/lib/aiOptimize.test.ts
git commit -m "feat(aiOptimize): wrap Gemini generateContent with JSON parsing and error mapping"
```

---

### Task 4: `useOrderStore` 優化相關 actions 與測試

**Files:**
- Modify: `src/store/useOrderStore.ts`
- Modify: `tests/store/useOrderStore.test.ts`

- [ ] **Step 1: 寫 failing tests**

於 `tests/store/useOrderStore.test.ts` 檔尾（最後一個 `});` 前）新增：

```ts
  describe('optimize actions', () => {
    it('setOptimizing toggles the optimizing flag on the matching AssembledPrompt', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          { orderId: 'o1', compCode: 'COMP-01', prompt: 'p', estimatedWords: 1 },
        ]);
        result.current.setOptimizing('o1', 'COMP-01', true);
      });
      expect(result.current.assembledPrompts[0].optimizing).toBe(true);
      act(() => {
        result.current.setOptimizing('o1', 'COMP-01', false);
      });
      expect(result.current.assembledPrompts[0].optimizing).toBe(false);
    });

    it('setOptimizedResult stores the result and clears error', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          {
            orderId: 'o1',
            compCode: 'COMP-01',
            prompt: 'p',
            estimatedWords: 1,
            optimizeError: 'old error',
          },
        ]);
        result.current.setOptimizedResult('o1', 'COMP-01', { en: 'EN', zh: 'ZH' });
      });
      expect(result.current.assembledPrompts[0].optimized).toEqual({ en: 'EN', zh: 'ZH' });
      expect(result.current.assembledPrompts[0].optimizeError).toBeUndefined();
    });

    it('setOptimizeError stores error and clears previous result', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          {
            orderId: 'o1',
            compCode: 'COMP-01',
            prompt: 'p',
            estimatedWords: 1,
            optimized: { en: 'old', zh: 'old' },
          },
        ]);
        result.current.setOptimizeError('o1', 'COMP-01', 'fail');
      });
      expect(result.current.assembledPrompts[0].optimizeError).toBe('fail');
      expect(result.current.assembledPrompts[0].optimized).toBeUndefined();
    });

    it('non-matching (orderId, compCode) leaves prompts unchanged', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          { orderId: 'o1', compCode: 'COMP-01', prompt: 'p', estimatedWords: 1 },
        ]);
        result.current.setOptimizing('o1', 'COMP-99', true);
      });
      expect(result.current.assembledPrompts[0].optimizing).toBeUndefined();
    });
  });
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/store/useOrderStore.test.ts`
Expected: FAIL（actions 未定義）。

- [ ] **Step 3: 擴充 store**

在 `src/store/useOrderStore.ts`：

- 在 `import type` 加入 `OptimizedPrompt`：
  ```ts
  import type { AssembledPrompt, CompSelection, OptimizedPrompt, Order } from '@/types';
  ```
- 在 `OrderStoreActions` interface 內 `setAssembledPrompts` 下方加入：
  ```ts
    setOptimizing: (orderId: string, compCode: string, optimizing: boolean) => void;
    setOptimizedResult: (orderId: string, compCode: string, result: OptimizedPrompt) => void;
    setOptimizeError: (orderId: string, compCode: string, error: string) => void;
  ```
- 在 `create(...)` 內 `setAssembledPrompts` 下方、`reset` 上方加入實作：
  ```ts
    setOptimizing: (orderId, compCode, optimizing) => {
      set((s) => ({
        assembledPrompts: s.assembledPrompts.map((p) =>
          p.orderId === orderId && p.compCode === compCode ? { ...p, optimizing } : p,
        ),
      }));
    },

    setOptimizedResult: (orderId, compCode, result) => {
      set((s) => ({
        assembledPrompts: s.assembledPrompts.map((p) =>
          p.orderId === orderId && p.compCode === compCode
            ? { ...p, optimized: result, optimizeError: undefined }
            : p,
        ),
      }));
    },

    setOptimizeError: (orderId, compCode, error) => {
      set((s) => ({
        assembledPrompts: s.assembledPrompts.map((p) =>
          p.orderId === orderId && p.compCode === compCode
            ? { ...p, optimizeError: error, optimized: undefined }
            : p,
        ),
      }));
    },
  ```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/store/useOrderStore.test.ts`
Expected: PASS 全部（原本 + 新增 4 個）。

- [ ] **Step 5: Commit**

```bash
git add src/store/useOrderStore.ts tests/store/useOrderStore.test.ts
git commit -m "feat(store): add setOptimizing, setOptimizedResult, setOptimizeError actions"
```

---

### Task 5: `SettingsModal` 元件與測試

**Files:**
- Create: `src/components/SettingsModal.tsx`
- Test: `tests/components/SettingsModal.test.tsx`

- [ ] **Step 1: 寫 failing tests**

建立 `tests/components/SettingsModal.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from '@/components/SettingsModal';
import { DEFAULT_SYSTEM_PROMPT, loadSettings, saveSettings } from '@/lib/settingsStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('SettingsModal', () => {
  it('loads current settings into the form when opened', () => {
    saveSettings({ apiKey: 'key-xyz', model: 'gemini-2.5-pro', systemPrompt: 'custom prompt' });
    render(<SettingsModal open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText('Gemini API Key') as HTMLInputElement).value).toBe('key-xyz');
    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('gemini-2.5-pro');
    expect((screen.getByLabelText('系統提示詞') as HTMLTextAreaElement).value).toBe('custom prompt');
  });

  it('saves form values and invokes onSaved + onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<SettingsModal open={true} onClose={onClose} onSaved={onSaved} />);

    await user.type(screen.getByLabelText('Gemini API Key'), 'new-key');
    await user.click(screen.getByRole('button', { name: '儲存' }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
    expect(loadSettings().apiKey).toBe('new-key');
  });

  it('does not write localStorage when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText('Gemini API Key'), 'tmp');
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(loadSettings().apiKey).toBe('');
  });

  it('blocks saving with an empty system prompt and shows inline error', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<SettingsModal open={true} onClose={vi.fn()} onSaved={onSaved} />);

    const textarea = screen.getByLabelText('系統提示詞');
    await user.clear(textarea);
    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(screen.getByText('系統提示詞不可為空')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('restore-default button resets only the system prompt field', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={vi.fn()} onSaved={vi.fn()} />);

    const textarea = screen.getByLabelText('系統提示詞') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, 'temporary');
    await user.type(screen.getByLabelText('Gemini API Key'), 'k');

    await user.click(screen.getByRole('button', { name: '恢復預設' }));

    expect(textarea.value).toBe(DEFAULT_SYSTEM_PROMPT);
    expect((screen.getByLabelText('Gemini API Key') as HTMLInputElement).value).toBe('k');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/components/SettingsModal.test.tsx`
Expected: FAIL（元件不存在）。

- [ ] **Step 3: 實作 `src/components/SettingsModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { AppSettings } from '@/types';
import { DEFAULT_SYSTEM_PROMPT, loadSettings, saveSettings } from '@/lib/settingsStorage';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (settings: AppSettings) => void;
}

export function SettingsModal({ open, onClose, onSaved }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<AppSettings['model']>('gemini-2.5-flash');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const current = loadSettings();
      setApiKey(current.apiKey);
      setModel(current.model);
      setSystemPrompt(current.systemPrompt);
      setError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function handleSave() {
    if (systemPrompt.trim().length === 0) {
      setError('系統提示詞不可為空');
      return;
    }
    const next: AppSettings = { apiKey: apiKey.trim(), model, systemPrompt };
    saveSettings(next);
    onSaved(next);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">AI 優化設定</h2>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Gemini API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            aria-label="Gemini API Key"
          />
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-400 hover:underline"
          >
            取得 API key
          </a>
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Model</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AppSettings['model'])}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            aria-label="Model"
          >
            <option value="gemini-2.5-flash">gemini-2.5-flash（推薦）</option>
            <option value="gemini-2.5-pro">gemini-2.5-pro</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-300">系統提示詞</span>
          <textarea
            rows={6}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            aria-label="系統提示詞"
          />
          <button
            type="button"
            onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
            className="text-xs text-blue-400 hover:underline"
          >
            恢復預設
          </button>
        </label>

        {error && (
          <div role="alert" className="text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/components/SettingsModal.test.tsx`
Expected: PASS 全部 5 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsModal.tsx tests/components/SettingsModal.test.tsx
git commit -m "feat(SettingsModal): add modal with API key, model, system prompt form"
```

---

### Task 6: `PromptCard` 三段摺疊、AI 優化按鈕、測試

**Files:**
- Modify: `src/components/PromptCard.tsx`
- Modify: `tests/components/PromptCard.test.tsx`

- [ ] **Step 1: 更新測試以涵蓋新行為**

把 `tests/components/PromptCard.test.tsx` 完整內容取代為：

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptCard } from '@/components/PromptCard';

const samplePrompt =
  'medium shot, front view, centered, direct gaze, luna_face, an adult woman, ' +
  'featuring a distinctive small mole on her right cheek, ' +
  'wearing striped button-up shirt, in cozy cafe interior, ' +
  'sitting on chair, gentle smile, warm side lighting, realistic photography, ' +
  'fully clothed, safe for work, no text, no watermark, ' +
  'correct human anatomy, no tattoo, no glasses, no short hair';

const baseProps = {
  orderCode: 'CAS-02_SCN-01_POS-04_EXP-01_COMP-03',
  tier: 'T0' as const,
  comboLabel: '條紋襯衫_咖啡廳_坐姿_微笑_半身正面',
  prompt: samplePrompt,
  isConfigured: true,
  onOptimize: vi.fn(),
};

describe('PromptCard', () => {
  it('renders only the 原始提示詞 section before optimization', () => {
    render(<PromptCard {...baseProps} />);
    expect(screen.getByText('原始提示詞')).toBeInTheDocument();
    expect(screen.queryByText('英文優化提示詞')).not.toBeInTheDocument();
    expect(screen.queryByText('中文優化提示詞')).not.toBeInTheDocument();
  });

  it('renders three sections when optimized result exists', () => {
    render(
      <PromptCard {...baseProps} optimized={{ en: 'EN', zh: 'ZH' }} />,
    );
    expect(screen.getByText('原始提示詞')).toBeInTheDocument();
    expect(screen.getByText('英文優化提示詞')).toBeInTheDocument();
    expect(screen.getByText('中文優化提示詞')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('ZH')).toBeInTheDocument();
  });

  it('disables the AI button and shows "AI 優化(未配置)" when !isConfigured', () => {
    render(<PromptCard {...baseProps} isConfigured={false} />);
    const btn = screen.getByRole('button', { name: /AI 優化\(未配置\)/ });
    expect(btn).toBeDisabled();
  });

  it('shows "優化中…" and disables button while optimizing', () => {
    render(<PromptCard {...baseProps} optimizing={true} />);
    const btn = screen.getByRole('button', { name: /優化中/ });
    expect(btn).toBeDisabled();
  });

  it('shows optimizeError in an inline alert', () => {
    render(<PromptCard {...baseProps} optimizeError="API key 無效" />);
    expect(screen.getByRole('alert')).toHaveTextContent('API key 無效');
  });

  it('copies the original prompt when the 原始提示詞 copy button is clicked', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<PromptCard {...baseProps} />);
    const copyButtons = screen.getAllByRole('button', { name: /複製/ });
    await user.click(copyButtons[0]);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(samplePrompt);
    });
  });

  it('copy button click does not toggle the section (stopPropagation)', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<PromptCard {...baseProps} />);
    expect(screen.getByText(samplePrompt)).toBeVisible();
    const copyButtons = screen.getAllByRole('button', { name: /複製/ });
    await user.click(copyButtons[0]);
    expect(screen.getByText(samplePrompt)).toBeVisible();
  });

  it('calls onOptimize directly when no previous result exists', async () => {
    const user = userEvent.setup();
    const onOptimize = vi.fn();
    render(<PromptCard {...baseProps} onOptimize={onOptimize} />);
    await user.click(screen.getByRole('button', { name: /^AI 優化$/ }));
    expect(onOptimize).toHaveBeenCalledTimes(1);
  });

  it('shows a confirm dialog and only calls onOptimize when confirmed', async () => {
    const user = userEvent.setup();
    const onOptimize = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <PromptCard {...baseProps} optimized={{ en: 'EN', zh: 'ZH' }} onOptimize={onOptimize} />,
    );
    await user.click(screen.getByRole('button', { name: /^AI 優化$/ }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onOptimize).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /^AI 優化$/ }));
    expect(onOptimize).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/components/PromptCard.test.tsx`
Expected: FAIL（新 props 未實作）。

- [ ] **Step 3: 改寫 `src/components/PromptCard.tsx`**

將檔案完整內容替換為：

```tsx
import { useEffect, useState } from 'react';
import { checkLengthStatus, countWords } from '@/lib/tokenCount';
import type { OptimizedPrompt, Tier } from '@/types';

interface Props {
  orderCode: string;
  tier: Tier;
  comboLabel: string;
  prompt: string;
  optimized?: OptimizedPrompt;
  optimizing?: boolean;
  optimizeError?: string;
  isConfigured: boolean;
  onOptimize: () => void;
}

const STATUS_LABEL: Record<'too_short' | 'ok' | 'too_long', string> = {
  too_short: '太短',
  ok: '合適',
  too_long: '太長',
};

const TIER_TAG_CLASS: Record<Tier, string> = {
  T0: 'bg-emerald-900/60 text-emerald-300',
  T1: 'bg-blue-900/60 text-blue-300',
  T2: 'bg-purple-900/60 text-purple-300',
  T3: 'bg-red-900/60 text-red-300',
};

type SectionKey = 'original' | 'en' | 'zh';

export function PromptCard({
  orderCode,
  tier,
  comboLabel,
  prompt,
  optimized,
  optimizing,
  optimizeError,
  isConfigured,
  onOptimize,
}: Props) {
  const wordCount = countWords(prompt);
  const status = checkLengthStatus(wordCount);

  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    original: true,
    en: false,
    zh: false,
  });

  useEffect(() => {
    if (optimized) {
      setExpanded({ original: false, en: true, zh: true });
    }
  }, [optimized]);

  function toggle(section: SectionKey) {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function handleOptimizeClick() {
    if (optimized) {
      const ok = window.confirm('已有優化結果，重新優化會覆蓋舊結果，是否繼續？');
      if (!ok) {
        return;
      }
    }
    onOptimize();
  }

  const optimizeLabel = !isConfigured
    ? 'AI 優化(未配置)'
    : optimizing
      ? '優化中…'
      : 'AI 優化';
  const optimizeDisabled = !isConfigured || optimizing;

  return (
    <div className="space-y-3 rounded border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-slate-200">{orderCode}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${TIER_TAG_CLASS[tier]}`}>
              {tier}
            </span>
            <span className="font-mono">{comboLabel}</span>
          </div>
        </div>
        <span
          data-testid="length-status"
          className={
            status === 'ok'
              ? 'rounded bg-emerald-900/60 px-2 py-1 text-xs text-emerald-300'
              : status === 'too_short'
                ? 'rounded bg-amber-900/60 px-2 py-1 text-xs text-amber-300'
                : 'rounded bg-red-900/60 px-2 py-1 text-xs text-red-300'
          }
        >
          {wordCount} 字 · {STATUS_LABEL[status]}
        </span>
      </div>

      <div>
        <button
          type="button"
          onClick={handleOptimizeClick}
          disabled={optimizeDisabled}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {optimizeLabel}
        </button>
      </div>

      {optimizeError && (
        <div role="alert" className="text-sm text-red-400">
          AI 優化失敗：{optimizeError}
        </div>
      )}

      <CollapsibleSection
        title="原始提示詞"
        content={prompt}
        expanded={expanded.original}
        onToggle={() => toggle('original')}
      />

      {optimized && (
        <>
          <CollapsibleSection
            title="英文優化提示詞"
            content={optimized.en}
            expanded={expanded.en}
            onToggle={() => toggle('en')}
          />
          <CollapsibleSection
            title="中文優化提示詞"
            content={optimized.zh}
            expanded={expanded.zh}
            onToggle={() => toggle('zh')}
          />
        </>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  content: string;
  expanded: boolean;
  onToggle: () => void;
}

function CollapsibleSection({ title, content, expanded, onToggle }: SectionProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded border border-slate-800 bg-slate-950/60">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <span>{expanded ? '▼' : '▶'}</span>
          <span>{title}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
        >
          {copied ? '已複製' : '複製'}
        </button>
      </div>
      {expanded && (
        <pre className="whitespace-pre-wrap border-t border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200">
          {content}
        </pre>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/components/PromptCard.test.tsx`
Expected: PASS 全部 9 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/components/PromptCard.tsx tests/components/PromptCard.test.tsx
git commit -m "feat(PromptCard): add collapsible sections, AI optimize button, copy-per-section"
```

---

### Task 7: App 整合（齒輪 icon、SettingsModal 掛載、onOptimize）

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 新增 import**

在 `src/App.tsx` 檔頂部 imports 區加入：

```ts
import { SettingsModal } from '@/components/SettingsModal';
import { optimizePrompt } from '@/lib/aiOptimize';
import { isConfigured, loadSettings } from '@/lib/settingsStorage';
import type { AppSettings } from '@/types';
```

- [ ] **Step 2: 新增 state 與 callback**

在 `export default function App() {` 內、`const [globalError, setGlobalError] = useState<string | null>(null);` 之後加入：

```ts
  const setOptimizing = useOrderStore((state) => state.setOptimizing);
  const setOptimizedResult = useOrderStore((state) => state.setOptimizedResult);
  const setOptimizeError = useOrderStore((state) => state.setOptimizeError);

  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleOptimize(orderId: string, compCode: string, prompt: string) {
    setOptimizing(orderId, compCode, true);
    try {
      const result = await optimizePrompt({
        apiKey: settings.apiKey,
        model: settings.model,
        systemPrompt: settings.systemPrompt,
        originalPrompt: prompt,
      });
      setOptimizedResult(orderId, compCode, result);
    } catch (err) {
      setOptimizeError(orderId, compCode, err instanceof Error ? err.message : String(err));
    } finally {
      setOptimizing(orderId, compCode, false);
    }
  }
```

- [ ] **Step 3: Header 加齒輪按鈕**

把 `<header ...>` 區塊替換為：

```tsx
        <header className="relative rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Prompt Tool
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">AI 虛擬網紅提示詞產生器</h1>
          <p className="mt-2 text-sm text-slate-400">
            角色：{character.display_name}（{character.character_id}）
          </p>
          <button
            type="button"
            aria-label="設定"
            onClick={() => setSettingsOpen(true)}
            className="absolute right-6 top-6 rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </header>
```

- [ ] **Step 4: 渲染 SettingsModal 與更新 PromptCard props**

1) 在 `<div className="mx-auto max-w-5xl space-y-6">` 內、頂層最後（`</div>` 之前、`</div>` 配 outer wrapper 之前）加上：

```tsx
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={(next) => setSettings(next)}
        />
```

2) 找到 PromptCard 渲染處，把 props 更新為：

```tsx
                  <PromptCard
                    key={`${assembledPrompt.orderId}-${assembledPrompt.compCode}-${index}`}
                    orderCode={`工單 ${orderIndex + 1} - ${order.outfit}_${order.scene}_${order.pose}_${order.expr}_${assembledPrompt.compCode}`}
                    tier={order.tier}
                    comboLabel={comboLabel}
                    prompt={assembledPrompt.prompt}
                    optimized={assembledPrompt.optimized}
                    optimizing={assembledPrompt.optimizing}
                    optimizeError={assembledPrompt.optimizeError}
                    isConfigured={isConfigured(settings)}
                    onOptimize={() =>
                      handleOptimize(
                        assembledPrompt.orderId,
                        assembledPrompt.compCode,
                        assembledPrompt.prompt,
                      )
                    }
                  />
```

- [ ] **Step 5: 型別檢查與全量測試**

Run: `npm run build && npm test`
Expected: PASS 全部測試、tsc 無誤。

- [ ] **Step 6: 手動煙霧測試**

```bash
npm run dev
```

於瀏覽器驗證：
- 開啟後頂部右上齒輪可開 modal，輸入/儲存後關閉。
- 未配置時 PromptCard AI 按鈕 disabled 且文字含「(未配置)」。
- 配置後按 AI 優化 → 出現「優化中…」→ 成功後多出兩段（英文/中文），原始收合。
- 再按 AI 優化 → 跳 confirm 對話框；取消不變、確定重新優化。
- 各段右側複製鈕只複製該段內容、不影響摺疊狀態。

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat(App): add settings modal trigger, wire AI optimize into PromptCard"
```

---

## Self-Review

- Spec coverage ✓：所有 spec 章節（型別、三段摺疊、AI 按鈕狀態、confirm、設定 modal、Gemini 呼叫、錯誤分類、loading、測試）皆對應到 Task 1–7。
- Placeholder scan ✓：無 TBD/TODO，每個 step 均附完整程式碼與指令。
- Type consistency ✓：`AppSettings` / `OptimizedPrompt` / `AssembledPrompt` 名稱一致；store actions 與 component props 型別對齊。
