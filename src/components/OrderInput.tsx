import { useState } from 'react';
import type { FocusEvent } from 'react';
import { CompPicker } from '@/components/CompPicker';
import { parseCodes } from '@/lib/orderParser';
import { useDataStore } from '@/store/useDataStore';
import type { Composition, Order, Tier } from '@/types';

interface Props {
  value: Omit<Order, 'id'> | null;
  onOrderChange: (order: Omit<Order, 'id'>) => void;
  compositions: Composition[];
  recommendedCompCodes: string[];
}

const TIER_OPTIONS: { code: Tier; label: string }[] = [
  { code: 'T0', label: 'T0 — 公域安全（IG / FB / Threads）' },
  { code: 'T1', label: 'T1 — 微擦邊（X / 私域訂閱）' },
  { code: 'T2', label: 'T2 — 私域訂閱（Fanvue / MyFans / Fansly）' },
  { code: 'T3', label: 'T3 — PPV 加購（單次付費）' },
];

function formatCodes(o: Pick<Omit<Order, 'id'>, 'outfit' | 'scene' | 'pose' | 'expr'>): string {
  return `${o.outfit}_${o.scene}_${o.pose}_${o.expr}`;
}

export function OrderInput({ value, onOrderChange, compositions, recommendedCompCodes }: Props) {
  const outfits = useDataStore((s) => s.outfits);
  const scenes = useDataStore((s) => s.scenes);
  const poses = useDataStore((s) => s.poses);
  const expressions = useDataStore((s) => s.expressions);

  const current = {
    outfit: value?.outfit ?? outfits[0]?.code ?? '',
    scene: value?.scene ?? scenes[0]?.code ?? '',
    pose: value?.pose ?? poses[0]?.code ?? '',
    expr: value?.expr ?? expressions[0]?.code ?? '',
    tier: value?.tier ?? ('T0' as Tier),
    selectedCompCodes: value?.selectedCompCodes ?? [],
  };

  // codesText 僅在 input 處於 focus 期間使用 local buffer；
  // blur 後顯示從 current（select）派生的值，避免 useEffect + setState。
  const [draftCodes, setDraftCodes] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const derivedCodes = formatCodes(current);
  const codesText = draftCodes ?? derivedCodes;

  function handleCodesFocus() {
    if (draftCodes === null) {
      setDraftCodes(derivedCodes);
    }
  }

  function handleCodesChange(v: string) {
    setDraftCodes(v);
  }

  function handleCodesBlur(e: FocusEvent<HTMLInputElement>) {
    const text = e.currentTarget.value;
    if (text.trim() === '') {
      setError(null);
      setDraftCodes(null);
      return;
    }
    const result = parseCodes(text);
    if (result.ok) {
      setError(null);
      setDraftCodes(null);
      onOrderChange({ ...current, ...result.codes });
    } else {
      setError(result.error);
    }
  }

  function handleFieldChange(patch: Partial<Omit<Order, 'id'>>) {
    onOrderChange({ ...current, ...patch });
  }

  return (
    <div className="rounded border border-slate-700 bg-slate-900 p-3">
      <div>
        <label htmlFor="order-codes" className="block text-sm font-medium text-slate-200">
          四項代碼組合
        </label>
        <input
          id="order-codes"
          type="text"
          value={codesText}
          onFocus={handleCodesFocus}
          onChange={(e) => handleCodesChange(e.target.value)}
          onBlur={handleCodesBlur}
          placeholder={derivedCodes}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 font-mono text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        {error && (
          <div role="alert" className="mt-1 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      <div aria-hidden="true" className="my-6 border-t border-slate-700" />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="outfit"
          label="服裝"
          value={current.outfit}
          options={outfits.map((o) => ({ code: o.code, name: o.name }))}
          onChange={(v) => handleFieldChange({ outfit: v })}
        />
        <SelectField
          id="scene"
          label="場景"
          value={current.scene}
          options={scenes.map((o) => ({ code: o.code, name: o.name }))}
          onChange={(v) => handleFieldChange({ scene: v })}
        />
        <SelectField
          id="pose"
          label="姿勢"
          value={current.pose}
          options={poses.map((o) => ({ code: o.code, name: o.name }))}
          onChange={(v) => handleFieldChange({ pose: v })}
        />
        <SelectField
          id="expression"
          label="表情"
          value={current.expr}
          options={expressions.map((o) => ({ code: o.code, name: o.name }))}
          onChange={(v) => handleFieldChange({ expr: v })}
        />
      </div>

      <div aria-hidden="true" className="my-6 border-t border-slate-700" />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="tier"
          label="分級"
          value={current.tier}
          options={TIER_OPTIONS.map((t) => ({ code: t.code, name: t.label, label: t.label }))}
          onChange={(v) => handleFieldChange({ tier: v as Tier })}
        />
        <div>
          <label className="block text-sm font-medium text-slate-200">構圖</label>
          <div className="mt-1">
            <CompPicker
              options={compositions}
              recommendedCodes={recommendedCompCodes}
              selected={current.selectedCompCodes}
              onChange={(selectedCompCodes) => handleFieldChange({ selectedCompCodes })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: { code: string; name: string; label?: string }[];
  onChange: (v: string) => void;
}

function SelectField({ id, label, value, options, onChange }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-200">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-slate-100 focus:border-blue-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.code} value={o.code} className="bg-slate-800 text-slate-100">
            {o.label ?? `${o.code} - ${o.name}`}
          </option>
        ))}
      </select>
    </div>
  );
}
