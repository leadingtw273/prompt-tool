import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { checkLengthStatus, countWords } from '@/lib/tokenCount';
import type { OptimizedPrompt, Tier } from '@/types';

interface Props {
  orderCode: string;
  tier: Tier;
  comboLabel: string;
  prompt: string;
  optimized?: OptimizedPrompt;
  optimizing?: boolean;
  optimizingLanguage?: 'en' | 'zh';
  optimizeError?: string;
  isConfigured: boolean;
  onOptimize: () => void;
  onRefreshLanguage?: (language: 'en' | 'zh') => void;
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
  optimizingLanguage,
  optimizeError,
  isConfigured,
  onOptimize,
  onRefreshLanguage,
}: Props) {
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    original: true,
    en: false,
    zh: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      setConfirmOpen(true);
      return;
    }
    onOptimize();
  }

  function handleConfirmOverwrite() {
    setConfirmOpen(false);
    onOptimize();
  }

  const optimizeLabel = !isConfigured
    ? 'AI 優化(未配置)'
    : optimizing
      ? '優化中…'
      : 'AI 優化';
  const optimizeDisabled = !isConfigured || optimizing;
  const optimizeDone = Boolean(optimized) && !optimizing;
  const optimizeBtnClass = optimizeDone
    ? 'bg-emerald-600 hover:bg-emerald-500'
    : 'bg-blue-600 hover:bg-blue-500';

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
          className={`inline-flex shrink-0 items-center gap-1.5 rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${optimizeBtnClass}`}
        >
          {optimizeDone && (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
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
            onRefresh={onRefreshLanguage ? () => onRefreshLanguage('en') : undefined}
            refreshDisabled={optimizing}
            refreshing={optimizingLanguage === 'en'}
            refreshConfirmMessage="確認要重新生成英文優化提示詞？這會覆蓋目前的結果。"
          />
          <CollapsibleSection
            title="中文優化提示詞"
            content={optimized.zh}
            expanded={expanded.zh}
            onToggle={() => toggle('zh')}
            onRefresh={onRefreshLanguage ? () => onRefreshLanguage('zh') : undefined}
            refreshDisabled={optimizing}
            refreshing={optimizingLanguage === 'zh'}
            refreshConfirmMessage="確認要重新生成中文優化提示詞？這會覆蓋目前的結果。"
          />
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="重新優化"
        message="已有優化結果，重新優化會覆蓋舊結果，是否繼續？"
        confirmLabel="確認覆蓋"
        onConfirm={handleConfirmOverwrite}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  content: string;
  expanded: boolean;
  onToggle: () => void;
  onRefresh?: () => void;
  refreshDisabled?: boolean;
  refreshing?: boolean;
  refreshConfirmMessage?: string;
}

function CollapsibleSection({
  title,
  content,
  expanded,
  onToggle,
  onRefresh,
  refreshDisabled,
  refreshing,
  refreshConfirmMessage,
}: SectionProps) {
  const [copied, setCopied] = useState(false);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
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
      <div className="flex items-center gap-2 px-3 py-2">
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
          className="flex cursor-pointer items-center gap-2 text-sm text-slate-200"
        >
          <span>{expanded ? '▼' : '▶'}</span>
          <span>{title}</span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRefreshConfirmOpen(true);
            }}
            disabled={refreshDisabled}
            aria-label="重新生成"
            title="重新生成"
            className="rounded p-1.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        )}
        <div className="flex-1" />
        {!refreshing && (
          <span
            data-testid="length-status"
            className={`rounded px-2 py-1 text-xs ${statusClass}`}
          >
            {wordCount} 字 · {STATUS_LABEL[status]}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          disabled={refreshing}
          aria-label={copied ? '已複製' : '複製'}
          title={copied ? '已複製' : '複製'}
          className="rounded p-1.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
      {expanded && (
        refreshing ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-2 border-t border-slate-800 bg-slate-950 px-3 py-8 text-sm text-slate-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            擷取中…
          </div>
        ) : (
          <pre className="whitespace-pre-wrap border-t border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200">
            {content}
          </pre>
        )
      )}
      {onRefresh && (
        <ConfirmDialog
          open={refreshConfirmOpen}
          title="重新生成"
          message={refreshConfirmMessage ?? '確認要重新生成？這會覆蓋目前的結果。'}
          confirmLabel="確認覆蓋"
          onConfirm={() => {
            setRefreshConfirmOpen(false);
            onRefresh();
          }}
          onCancel={() => setRefreshConfirmOpen(false)}
        />
      )}
    </div>
  );
}
