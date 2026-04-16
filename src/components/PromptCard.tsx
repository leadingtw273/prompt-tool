import { useState } from 'react';
import { checkLengthStatus, countWords } from '@/lib/tokenCount';
import type { Tier } from '@/types';

interface Props {
  orderCode: string;
  tier: Tier;
  count: number;
  prompt: string;
}

const STATUS_LABEL: Record<'too_short' | 'ok' | 'too_long', string> = {
  too_short: '太短',
  ok: '合適',
  too_long: '太長',
};

export function PromptCard({ orderCode, tier, count, prompt }: Props) {
  const [copied, setCopied] = useState(false);
  const wordCount = countWords(prompt);
  const status = checkLengthStatus(wordCount);

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3 rounded border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-slate-200">{orderCode}</div>
          <div className="text-xs text-slate-400">
            {tier} · 預計 {count} 張（seed 變體由 ComfyUI 處理）
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

      <pre className="whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 font-mono text-sm text-slate-200">
        {prompt}
      </pre>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        {copied ? '已複製' : '複製'}
      </button>
    </div>
  );
}
