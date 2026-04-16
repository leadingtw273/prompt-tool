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
            className="flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-gray-50"
          >
            <input
              id={id}
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(c.code)}
              className="mt-1"
              aria-label={`${c.code} ${c.name}`}
            />
            <div>
              <div className="font-medium">
                {c.code} - {c.name}
              </div>
              <div className="font-mono text-sm text-gray-600">{c.prompt}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
