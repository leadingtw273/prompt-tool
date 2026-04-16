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
    <div className="space-y-3 rounded border p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-sm">{orderCode}</div>
          <div className="text-xs text-gray-500">
            {tier} · 預計 {count} 張（seed 變體由 ComfyUI 處理）
          </div>
        </div>
        <span
          data-testid="length-status"
          className={
            status === 'ok'
              ? 'rounded bg-green-100 px-2 py-1 text-xs text-green-700'
              : status === 'too_short'
                ? 'rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700'
                : 'rounded bg-red-100 px-2 py-1 text-xs text-red-700'
          }
        >
          {wordCount} 字 · {STATUS_LABEL[status]}
        </span>
      </div>

      <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 font-mono text-sm">{prompt}</pre>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        {copied ? '已複製' : '複製'}
      </button>
    </div>
  );
}
