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
