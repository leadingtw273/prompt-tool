import { useState } from 'react';
import { checkLengthStatus, countWords } from '@/lib/tokenCount';
import type { Tier } from '@/types';

interface Props {
  orderCode: string;
  tier: Tier;
  comboLabel: string;
  prompt: string;
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

export function PromptCard({ orderCode, tier, comboLabel, prompt }: Props) {
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
