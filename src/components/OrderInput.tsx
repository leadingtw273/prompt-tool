import { useState } from 'react';
import { parseCodes } from '@/lib/orderParser';
import { loadOutfits, loadScenes, loadPoses, loadExpressions } from '@/lib/dataLoader';
import type { Order, Tier } from '@/types';

interface Props {
  value: Omit<Order, 'id'> | null;
  onOrderChange: (order: Omit<Order, 'id'>) => void;
}

const TIERS: Tier[] = ['T0', 'T1'];

function formatCodes(o: Pick<Omit<Order, 'id'>, 'outfit' | 'scene' | 'pose' | 'expr'>): string {
  return `${o.outfit}_${o.scene}_${o.pose}_${o.expr}`;
}

export function OrderInput({ value, onOrderChange }: Props) {
  const outfits = loadOutfits();
  const scenes = loadScenes();
  const poses = loadPoses();
  const expressions = loadExpressions();

  const current = {
    outfit: value?.outfit ?? outfits[0].code,
    scene: value?.scene ?? scenes[0].code,
    pose: value?.pose ?? poses[0].code,
    expr: value?.expr ?? expressions[0].code,
    tier: value?.tier ?? ('T0' as Tier),
    count: value?.count ?? 1,
  };

  // codesText 僅在 input 處於 focus 期間使用 local buffer；
  // blur 後顯示從 current（select）派生的值，避免 useEffect + setState。
  const [draftCodes, setDraftCodes] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const derivedCodes = formatCodes(current);
  const codesText = draftCodes ?? derivedCodes;

  function handleCodesFocus() {
    setDraftCodes(derivedCodes);
  }

  function handleCodesChange(v: string) {
    setDraftCodes(v);
  }

  function handleCodesBlur() {
    const text = draftCodes ?? derivedCodes;
    const result = parseCodes(text);
    if (result.ok) {
      setError(null);
      onOrderChange({ ...current, ...result.codes });
    } else {
      setError(result.error);
    }
    setDraftCodes(null);
  }

  function handleFieldChange(patch: Partial<Omit<Order, 'id'>>) {
    setError(null);
    onOrderChange({ ...current, ...patch });
  }

  return (
    <div className="space-y-3 rounded border border-slate-700 bg-slate-900 p-3">
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
          placeholder="CAS-01_SCN-01_POS-01_EXP-01"
          className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 font-mono text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        {error && (
          <div role="alert" className="mt-1 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-slate-700" />

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

      <div className="border-t border-slate-700" />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="tier"
          label="分級"
          value={current.tier}
          options={TIERS.map((t) => ({ code: t, name: t }))}
          onChange={(v) => handleFieldChange({ tier: v as Tier })}
        />
        <div>
          <label htmlFor="count" className="block text-sm font-medium text-slate-200">
            數量
          </label>
          <input
            id="count"
            type="number"
            min={1}
            value={current.count}
            onChange={(e) => handleFieldChange({ count: Number(e.target.value) })}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2 text-slate-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: { code: string; name: string }[];
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
            {o.code} - {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
