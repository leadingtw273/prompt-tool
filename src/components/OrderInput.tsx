import { useState } from 'react';
import { parseOrderText } from '@/lib/orderParser';
import { loadOutfits, loadScenes, loadPoses, loadExpressions } from '@/lib/dataLoader';
import type { Order, Tier } from '@/types';

interface Props {
  value: Omit<Order, 'id'> | null;
  onOrderChange: (order: Omit<Order, 'id'>) => void;
}

const TIERS: Tier[] = ['T0', 'T1'];

function formatOrderToText(o: Omit<Order, 'id'>): string {
  return `${o.outfit}_${o.scene}_${o.pose}_${o.expr} ${o.tier} x${o.count}`;
}

export function OrderInput({ value, onOrderChange }: Props) {
  const [mode, setMode] = useState<'text' | 'form'>('text');
  const [textValue, setTextValue] = useState(value ? formatOrderToText(value) : '');
  const [error, setError] = useState<string | null>(null);

  const outfits = loadOutfits();
  const scenes = loadScenes();
  const poses = loadPoses();
  const expressions = loadExpressions();

  function handleTextBlur() {
    const result = parseOrderText(textValue);
    if (result.ok) {
      setError(null);
      onOrderChange(result.order);
    } else {
      setError(result.error);
    }
  }

  function handleFormChange(patch: Partial<Omit<Order, 'id'>>) {
    const merged = {
      outfit: value?.outfit ?? outfits[0].code,
      scene: value?.scene ?? scenes[0].code,
      pose: value?.pose ?? poses[0].code,
      expr: value?.expr ?? expressions[0].code,
      tier: value?.tier ?? ('T0' as Tier),
      count: value?.count ?? 1,
      ...patch,
    };
    onOrderChange(merged);
    setTextValue(formatOrderToText(merged));
  }

  return (
    <div className="space-y-3 rounded border p-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`rounded px-3 py-1 ${mode === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          文字
        </button>
        <button
          type="button"
          onClick={() => setMode('form')}
          className={`rounded px-3 py-1 ${mode === 'form' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          表單
        </button>
      </div>

      {mode === 'text' && (
        <div>
          <label htmlFor="order-text" className="block text-sm font-medium">
            工單文字
          </label>
          <textarea
            id="order-text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextBlur}
            placeholder="CAS-02_SCN-01_POS-04_EXP-01 T0 x4"
            className="w-full rounded border p-2 font-mono"
            rows={2}
          />
          {error && (
            <div role="alert" className="mt-1 text-sm text-red-500">
              {error}
            </div>
          )}
        </div>
      )}

      {mode === 'form' && (
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            id="outfit"
            label="服裝"
            value={value?.outfit ?? outfits[0].code}
            options={outfits.map((o) => ({ code: o.code, name: o.name }))}
            onChange={(v) => handleFormChange({ outfit: v })}
          />
          <SelectField
            id="scene"
            label="場景"
            value={value?.scene ?? scenes[0].code}
            options={scenes.map((o) => ({ code: o.code, name: o.name }))}
            onChange={(v) => handleFormChange({ scene: v })}
          />
          <SelectField
            id="pose"
            label="姿勢"
            value={value?.pose ?? poses[0].code}
            options={poses.map((o) => ({ code: o.code, name: o.name }))}
            onChange={(v) => handleFormChange({ pose: v })}
          />
          <SelectField
            id="expression"
            label="表情"
            value={value?.expr ?? expressions[0].code}
            options={expressions.map((o) => ({ code: o.code, name: o.name }))}
            onChange={(v) => handleFormChange({ expr: v })}
          />
          <SelectField
            id="tier"
            label="分級"
            value={value?.tier ?? 'T0'}
            options={TIERS.map((t) => ({ code: t, name: t }))}
            onChange={(v) => handleFormChange({ tier: v as Tier })}
          />
          <div>
            <label htmlFor="count" className="block text-sm font-medium">
              數量
            </label>
            <input
              id="count"
              type="number"
              min={1}
              value={value?.count ?? 1}
              onChange={(e) => handleFormChange({ count: Number(e.target.value) })}
              className="w-full rounded border p-2"
            />
          </div>
        </div>
      )}
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
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border p-2"
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.code} - {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
