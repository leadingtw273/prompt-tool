import type { Composition } from '@/types';

interface Props {
  recommended: Composition[];
  selected: string[];
  onToggle: (compCode: string) => void;
}

export function CompPicker({ recommended, selected, onToggle }: Props) {
  return (
    <div className="space-y-2">
      {recommended.map((c) => {
        const isSelected = selected.includes(c.code);
        const id = `comp-${c.code}`;
        return (
          <label
            key={c.code}
            htmlFor={id}
            className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition ${
              isSelected
                ? 'border-blue-500/60 bg-slate-800/80'
                : 'border-slate-700 bg-slate-900/60 hover:bg-slate-800/60'
            }`}
          >
            <input
              id={id}
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(c.code)}
              className="mt-1 h-4 w-4 accent-blue-500"
              aria-label={`${c.code} ${c.name}`}
            />
            <div>
              <div className="font-medium text-slate-100">
                {c.code} - {c.name}
              </div>
              <div className="font-mono text-sm text-slate-400">{c.prompt}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
