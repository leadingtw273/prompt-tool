import Select, { type MultiValue } from 'react-select';
import type { Composition } from '@/types';

interface Option {
  value: string;
  label: string;
  isRecommended: boolean;
}

interface Props {
  options: Composition[];
  recommendedCodes: string[];
  selected: string[];
  onChange: (selectedCompCodes: string[]) => void;
}

export function CompPicker({ options, recommendedCodes, selected, onChange }: Props) {
  const selectOptions: Option[] = options.map((c) => ({
    value: c.code,
    label: c.name,
    isRecommended: recommendedCodes.includes(c.code),
  }));
  const value = selectOptions.filter((o) => selected.includes(o.value));

  return (
    <Select<Option, true>
      isMulti
      options={selectOptions}
      value={value}
      onChange={(next: MultiValue<Option>) => onChange(next.map((o) => o.value))}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      placeholder="選擇構圖…"
      noOptionsMessage={() => '無可用構圖'}
      aria-label="構圖挑選"
      formatOptionLabel={(opt: Option) => (
        <span className={opt.isRecommended ? 'text-blue-400' : ''}>
          {opt.isRecommended ? '⭐ ' : ''}
          {opt.label}
        </span>
      )}
      unstyled
      classNames={{
        control: ({ isFocused }) =>
          `rounded border px-2 py-1 text-sm transition ${
            isFocused ? 'border-blue-500' : 'border-slate-700'
          } bg-slate-950`,
        valueContainer: () => 'gap-1 flex-wrap',
        placeholder: () => 'text-slate-500',
        input: () => 'text-slate-100',
        multiValue: () => 'rounded bg-slate-800 text-slate-100',
        multiValueLabel: () => 'px-2 py-0.5 text-xs',
        multiValueRemove: () => 'px-1 hover:bg-slate-700 hover:text-red-300 rounded-r',
        indicatorsContainer: () => 'text-slate-400',
        dropdownIndicator: () => 'px-1 hover:text-slate-200',
        clearIndicator: () => 'px-1 hover:text-red-300',
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
        noOptionsMessage: () => 'px-3 py-2 text-sm text-slate-500',
      }}
    />
  );
}
