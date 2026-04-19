import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { parseCharactersJson } from '@/lib/characters/parseCharacter';
import { parseCompositionsCsv } from '@/lib/csv/parseCompositions';
import { parseExpressionsCsv } from '@/lib/csv/parseExpressions';
import { parseOutfitsCsv } from '@/lib/csv/parseOutfits';
import { parsePosesCsv } from '@/lib/csv/parsePoses';
import { parseScenesCsv } from '@/lib/csv/parseScenes';
import { ENTITY_METADATA, type EntityKind } from '@/lib/entityRegistry';
import { readFileAsText } from '@/lib/readFileAsText';
import { useDataStore } from '@/store/useDataStore';
import type { ParseError } from '@/lib/csv/types';

interface Props {
  entityKind: EntityKind;
  open: boolean;
  onClose: () => void;
}

interface ParsedOutcome {
  apply: () => void;
  existingCount: number;
}

const MAX_ERRORS_SHOWN = 10;

function parseAndPrepare(
  entityKind: EntityKind,
  text: string,
): { ok: true; outcome: ParsedOutcome } | { ok: false; errors: ParseError[] } {
  const store = useDataStore.getState();
  if (entityKind === 'characters') {
    const r = parseCharactersJson(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: {
        apply: () => store.importCharacters(r.value),
        existingCount: Object.keys(store.charactersById).length,
      },
    };
  }
  if (entityKind === 'outfits') {
    const r = parseOutfitsCsv(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: { apply: () => store.importOutfits(r.items), existingCount: store.outfits.length },
    };
  }
  if (entityKind === 'scenes') {
    const r = parseScenesCsv(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: { apply: () => store.importScenes(r.items), existingCount: store.scenes.length },
    };
  }
  if (entityKind === 'poses') {
    const r = parsePosesCsv(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: { apply: () => store.importPoses(r.items), existingCount: store.poses.length },
    };
  }
  if (entityKind === 'expressions') {
    const r = parseExpressionsCsv(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: {
        apply: () => store.importExpressions(r.items),
        existingCount: store.expressions.length,
      },
    };
  }
  const r = parseCompositionsCsv(text);
  if (!r.ok) return { ok: false, errors: r.errors };
  return {
    ok: true,
    outcome: {
      apply: () => store.importCompositions(r.items),
      existingCount: store.compositions.length,
    },
  };
}

export function ImportEntityModal({ entityKind, open, onClose }: Props) {
  const meta = ENTITY_METADATA[entityKind];
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<ParseError[] | null>(null);
  const [pending, setPending] = useState<ParsedOutcome | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setText('');
      setErrors(null);
      setPending(null);
    }
  }, [open]);

  if (!open) return null;

  // When ConfirmDialog is pending, render only the confirm dialog to avoid
  // duplicate button names (e.g., two "取消" buttons) that confuse queries.
  if (pending !== null) {
    return (
      <ConfirmDialog
        open={true}
        message={`將取代既有 ${pending.existingCount} 筆 ${meta.displayName}，此操作無法復原。確認？`}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    );
  }

  function handleApply() {
    const result = parseAndPrepare(entityKind, text);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors(null);
    if (result.outcome.existingCount > 0) {
      setPending(result.outcome);
      return;
    }
    result.outcome.apply();
    onClose();
  }

  function handleConfirm() {
    pending?.apply();
    setPending(null);
    onClose();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsText(file).then(setText).catch((err) => {
      setErrors([{ message: `檔案讀取失敗：${(err as Error).message}` }]);
    });
    e.target.value = '';
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
        <div
          role="dialog"
          aria-label={`匯入 ${meta.displayName}`}
          className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">匯入 {meta.displayName}</h2>
            <button
              type="button"
              aria-label="關閉"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1 text-sm text-slate-300">
            <div className="font-semibold">欄位說明</div>
            <div className="text-slate-400">{meta.hint}</div>
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-blue-400 hover:underline">
                顯示範例
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-xs text-slate-200">
                {meta.example}
              </pre>
            </details>
          </div>

          <div className="space-y-2">
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700"
              >
                上傳 {meta.fileAccept}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={meta.fileAccept}
                className="hidden"
                onChange={handleFile}
              />
            </div>
            <label className="block space-y-1">
              <span className="text-xs text-slate-400">或貼上內容</span>
              <textarea
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
                aria-label="貼上內容"
              />
            </label>
          </div>

          {errors && errors.length > 0 && (
            <div
              role="alert"
              className="space-y-1 rounded border border-red-800 bg-red-900/30 p-3 text-xs text-red-300"
            >
              <div className="font-semibold">匯入失敗</div>
              <ul className="space-y-0.5">
                {errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
              </ul>
              {errors.length > MAX_ERRORS_SHOWN && (
                <div className="text-slate-400">
                  另有 {errors.length - MAX_ERRORS_SHOWN} 行錯誤未顯示
                </div>
              )}
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
              onClick={handleApply}
              disabled={text.trim().length === 0}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              匯入
            </button>
          </div>
        </div>
    </div>
  );
}
