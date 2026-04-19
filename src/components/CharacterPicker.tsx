import { useEffect } from 'react';
import Select, { type SingleValue } from 'react-select';
import { useDataStore } from '@/store/useDataStore';

interface Option {
  value: string;
  label: string;
}

export function CharacterPicker() {
  const charactersById = useDataStore((s) => s.charactersById);
  const activeCharacterId = useDataStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useDataStore((s) => s.setActiveCharacterId);

  const ids = Object.keys(charactersById);
  const firstId = ids[0] ?? null;

  useEffect(() => {
    if (ids.length === 0) return;
    if (activeCharacterId === null || !charactersById[activeCharacterId]) {
      if (firstId !== null) {
        setActiveCharacterId(firstId);
      }
    }
  }, [charactersById, activeCharacterId, firstId, ids.length, setActiveCharacterId]);

  if (ids.length === 0) {
    return (
      <p className="text-sm text-slate-400">尚未匯入角色資料，請從右上角「資料管理」匯入。</p>
    );
  }

  const options: Option[] = ids.map((id) => ({
    value: id,
    label: charactersById[id].display_name,
  }));
  const current = options.find((o) => o.value === activeCharacterId) ?? null;

  return (
    <Select<Option, false>
      options={options}
      value={current}
      onChange={(next: SingleValue<Option>) => {
        if (next) setActiveCharacterId(next.value);
      }}
      isClearable={false}
      placeholder="選擇角色…"
      aria-label="角色選擇"
      unstyled
      classNames={{
        control: ({ isFocused }) =>
          `rounded border px-2 py-1 text-sm transition ${
            isFocused ? 'border-blue-500' : 'border-slate-700'
          } bg-slate-950 min-w-[180px]`,
        valueContainer: () => 'gap-1',
        placeholder: () => 'text-slate-500',
        singleValue: () => 'text-slate-100',
        input: () => 'text-slate-100',
        indicatorsContainer: () => 'text-slate-400',
        dropdownIndicator: () => 'px-1 hover:text-slate-200',
        indicatorSeparator: () => 'bg-slate-700',
        menu: () =>
          'mt-1 rounded border border-slate-700 bg-slate-900 shadow-lg shadow-black/40 overflow-hidden',
        menuList: () => 'py-1',
        option: ({ isFocused, isSelected }) =>
          `px-3 py-2 text-sm cursor-pointer ${
            isSelected
              ? 'bg-blue-600 text-white'
              : isFocused
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-200'
          }`,
      }}
    />
  );
}
