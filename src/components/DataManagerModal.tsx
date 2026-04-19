import { useState } from 'react';
import { ImportEntityModal } from '@/components/ImportEntityModal';
import { serializeCompositionsCsv } from '@/lib/csv/serializeCompositions';
import { serializeExpressionsCsv } from '@/lib/csv/serializeExpressions';
import { serializeOutfitsCsv } from '@/lib/csv/serializeOutfits';
import { serializePosesCsv } from '@/lib/csv/serializePoses';
import { serializeScenesCsv } from '@/lib/csv/serializeScenes';
import { downloadFile } from '@/lib/downloadFile';
import { ENTITY_KINDS, ENTITY_METADATA, type EntityKind } from '@/lib/entityRegistry';
import { useDataStore } from '@/store/useDataStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

function getSerializedContent(kind: EntityKind): string {
  const s = useDataStore.getState();
  switch (kind) {
    case 'outfits':
      return serializeOutfitsCsv(s.outfits);
    case 'scenes':
      return serializeScenesCsv(s.scenes);
    case 'poses':
      return serializePosesCsv(s.poses);
    case 'expressions':
      return serializeExpressionsCsv(s.expressions);
    case 'compositions':
      return serializeCompositionsCsv(s.compositions);
    case 'characters':
      return JSON.stringify(s.charactersById, null, 2);
  }
}

export function DataManagerModal({ open, onClose }: Props) {
  const outfits = useDataStore((s) => s.outfits);
  const scenes = useDataStore((s) => s.scenes);
  const poses = useDataStore((s) => s.poses);
  const expressions = useDataStore((s) => s.expressions);
  const compositions = useDataStore((s) => s.compositions);
  const charactersById = useDataStore((s) => s.charactersById);
  const [importKind, setImportKind] = useState<EntityKind | null>(null);

  if (!open) return null;

  const counts: Record<EntityKind, number> = {
    outfits: outfits.length,
    scenes: scenes.length,
    poses: poses.length,
    expressions: expressions.length,
    compositions: compositions.length,
    characters: Object.keys(charactersById).length,
  };

  function handleExport(kind: EntityKind) {
    const meta = ENTITY_METADATA[kind];
    const content = getSerializedContent(kind);
    downloadFile({ content, filename: meta.downloadName, mimeType: meta.mimeType });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label="資料管理"
          className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">資料管理</h2>
            <button
              type="button"
              aria-label="關閉視窗"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="py-2">資料類型</th>
                <th className="py-2">筆數</th>
                <th className="py-2"></th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {ENTITY_KINDS.map((kind) => {
                const meta = ENTITY_METADATA[kind];
                const count = counts[kind];
                return (
                  <tr key={kind} className="border-t border-slate-800">
                    <td className={`py-2 ${count === 0 ? 'italic text-yellow-400' : 'text-slate-100'}`}>
                      {count === 0 && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1 inline-block align-text-bottom"
                          aria-label="無資料"
                        >
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <path d="M12 9v4" />
                          <path d="M12 17h.01" />
                        </svg>
                      )}
                      {meta.chineseName}({meta.displayName})
                    </td>
                    <td className="py-2 text-slate-300">{count}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setImportKind(kind)}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
                      >
                        匯入
                      </button>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleExport(kind)}
                        disabled={count === 0}
                        className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                      >
                        匯出
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
            >
              關閉
            </button>
          </div>
        </div>
      </div>

      {importKind && (
        <ImportEntityModal
          entityKind={importKind}
          open={true}
          onClose={() => setImportKind(null)}
        />
      )}
    </>
  );
}
