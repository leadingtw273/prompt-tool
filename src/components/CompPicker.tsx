import type { Composition } from '@/types';

interface Props {
  recommended: Composition[];
  selected: string[];
  onChange: (selectedCompCodes: string[]) => void;
}

export function CompPicker({ recommended, selected, onChange }: Props) {
  return (
    <select
      multiple
      value={selected}
      onChange={(e) => {
        const codes = Array.from(e.target.selectedOptions, (o) => o.value);
        onChange(codes);
      }}
      size={Math.min(Math.max(recommended.length, 3), 8)}
      aria-label="構圖挑選"
      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
    >
      {recommended.map((c) => (
        <option key={c.code} value={c.code} className="bg-slate-900 text-slate-100">
          {c.name}
        </option>
      ))}
    </select>
  );
}
