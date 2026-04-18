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
        <button
          type="button"
          onClick={handleOptimizeClick}
          disabled={optimizeDisabled}
          className="shrink-0 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
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
  const wordCount = countWords(content);
  const status = checkLengthStatus(wordCount);
  const statusClass =
    status === 'ok'
      ? 'bg-emerald-900/60 text-emerald-300'
      : status === 'too_short'
        ? 'bg-amber-900/60 text-amber-300'
        : 'bg-red-900/60 text-red-300';

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded border border-slate-800 bg-slate-950/60">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
          className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-slate-200"
        >
          <span>{expanded ? '▼' : '▶'}</span>
          <span>{title}</span>
        </div>
        <span
          data-testid="length-status"
          className={`rounded px-2 py-1 text-xs ${statusClass}`}
        >
          {wordCount} 字 · {STATUS_LABEL[status]}
        </span>
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
