# Merge Order Input & Comp Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the standalone「構圖挑選」section into each order card, so tier select and `CompPicker` sit side-by-side at the bottom of every `OrderInput`, and the work-order footer owns the single「組裝提示詞」button.

**Architecture:** Store `selectedCompCodes: string[]` directly on `Order`; remove the `compSelections` map and the `handleRecommend` step. `OrderInput` gains `compositions` + `recommendedCompCodes` props and renders `CompPicker` in a `grid-cols-2` row alongside the tier select. `App.tsx` computes `recommendedCompCodes` per order from the current pose and deletes the standalone 構圖挑選 `<section>`.

**Tech Stack:** React 19, TypeScript, Zustand 5, Tailwind 3, react-select 5, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-04-20-merge-order-and-comp-picker-design.md`

> **Intermediate-state note:** Tasks 1 and 2 are each TDD-scoped to their own module's tests. Between Task 1 commit and Task 3 commit, `src/App.tsx` will not type-check against the new store / `OrderInput` signatures — this is expected. Only the final commit of Task 3 is required to pass `npm test`, `npx tsc --noEmit`, and `npm run build` fully.

---

## File Structure

- Modify: `src/types/index.ts` — add `selectedCompCodes: string[]` to `Order`; delete `CompSelection` interface
- Modify: `src/store/useOrderStore.ts` — drop `compSelections` map and related actions (`setCompSelection`, `toggleComp`); update `removeOrder` and `initialState`
- Modify: `src/components/OrderInput.tsx` — extend Props with `compositions` / `recommendedCompCodes`; render `CompPicker` in a new `grid-cols-2` row with the tier select; support `selectedCompCodes` patch path
- Modify: `src/App.tsx` — delete `handleRecommend`; delete「構圖挑選」section; swap「推薦構圖」for「組裝提示詞」in the work-order footer; pass new props into `OrderInput`; adapt `handleAssemble` and `handleAddBlankOrder`
- Modify: `tests/store/useOrderStore.test.ts` — remove `setCompSelection` / `toggleComp` cases; add `selectedCompCodes` cases
- Modify: `tests/components/OrderInput.test.tsx` — inject `compositions` and `recommendedCompCodes` in existing renders; add `CompPicker` integration case

---

## Task 1: Type + store refactor (TDD)

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/useOrderStore.ts`
- Test: `tests/store/useOrderStore.test.ts`

- [ ] **Step 1: Replace the old `setCompSelection` / `toggleComp` cases with `selectedCompCodes` ones**

Open `tests/store/useOrderStore.test.ts` and replace lines 50-96 (the two `describe` blocks for `setCompSelection` and `toggleComp`) with the following. Also update the first `addOrder` describe block (lines 11-26) to assert the new field defaults.

```ts
    describe('When addOrder is called with a new order', () => {
      it('Then orders list length becomes 1 and the order gets an id and empty selectedCompCodes', () => {
        const { result } = renderHook(() => useOrderStore());
        act(() => {
          result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            selectedCompCodes: [],
          });
        });
        expect(result.current.orders).toHaveLength(1);
        expect(result.current.orders[0].id).toBeTruthy();
        expect(result.current.orders[0].selectedCompCodes).toEqual([]);
      });
    });
```

And for the two describe blocks that need replacing (previously `setCompSelection` and `toggleComp`):

```ts
    describe('When updateOrder patches selectedCompCodes', () => {
      it('Then the order selectedCompCodes is replaced by the patch value', () => {
        const { result } = renderHook(() => useOrderStore());
        let id = '';
        act(() => {
          id = result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            selectedCompCodes: [],
          });
        });
        act(() => {
          result.current.updateOrder(id, {
            selectedCompCodes: ['COMP-01', 'COMP-03'],
          });
        });
        expect(result.current.orders[0].selectedCompCodes).toEqual(['COMP-01', 'COMP-03']);
      });
    });

    describe('When removeOrder is called for an order with selections', () => {
      it('Then the order is removed from the list', () => {
        const { result } = renderHook(() => useOrderStore());
        let id = '';
        act(() => {
          id = result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            selectedCompCodes: ['COMP-01', 'COMP-02'],
          });
        });
        act(() => {
          result.current.removeOrder(id);
        });
        expect(result.current.orders).toHaveLength(0);
      });
    });
```

Also update the existing `When updateOrder patches tier` describe to include `selectedCompCodes: []` in its `addOrder` call, since `Order` now requires that field.

```ts
        act(() => {
          newId = result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            selectedCompCodes: [],
          });
        });
```

- [ ] **Step 2: Run the store tests to verify they fail**

Run: `npm test -- tests/store/useOrderStore.test.ts`
Expected: FAIL. TypeScript/Vitest should error on references to `setCompSelection`, `toggleComp`, `compSelections` (no such members on the store), and on `selectedCompCodes` not existing on `Order`.

- [ ] **Step 3: Update `src/types/index.ts`**

Add `selectedCompCodes: string[]` to `Order` and delete `CompSelection`.

```ts
export interface Order {
  id: string;
  outfit: string;
  scene: string;
  pose: string;
  expr: string;
  tier: Tier;
  selectedCompCodes: string[];
}
```

Delete the `CompSelection` interface entirely (lines 93-97 in the current file).

- [ ] **Step 4: Update `src/store/useOrderStore.ts`**

Replace the file with:

```ts
import { create } from 'zustand';
import type { AssembledPrompt, OptimizedPrompt, Order } from '@/types';

interface OrderStoreState {
  characterId: 'ACC-001';
  orders: Order[];
  assembledPrompts: AssembledPrompt[];
}

interface OrderStoreActions {
  addOrder: (order: Omit<Order, 'id'>) => string;
  updateOrder: (id: string, patch: Partial<Omit<Order, 'id'>>) => void;
  removeOrder: (id: string) => void;
  setAssembledPrompts: (prompts: AssembledPrompt[]) => void;
  setOptimizing: (orderId: string, compCode: string, optimizing: boolean) => void;
  setOptimizingLanguage: (
    orderId: string,
    compCode: string,
    language: 'en' | 'zh' | null,
  ) => void;
  setOptimizedResult: (orderId: string, compCode: string, result: OptimizedPrompt) => void;
  setOptimizedField: (
    orderId: string,
    compCode: string,
    language: 'en' | 'zh',
    text: string,
  ) => void;
  setOptimizeError: (orderId: string, compCode: string, error: string) => void;
  reset: () => void;
}

const initialState: OrderStoreState = {
  characterId: 'ACC-001',
  orders: [],
  assembledPrompts: [],
};

function uid(): string {
  return crypto.randomUUID();
}

export const useOrderStore = create<OrderStoreState & OrderStoreActions>((set) => ({
  ...initialState,

  addOrder: (order) => {
    const id = uid();
    set((s) => ({ orders: [...s.orders, { ...order, id }] }));
    return id;
  },

  updateOrder: (id, patch) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  },

  removeOrder: (id) => {
    set((s) => ({
      orders: s.orders.filter((o) => o.id !== id),
    }));
  },

  setAssembledPrompts: (prompts) => set({ assembledPrompts: prompts }),

  setOptimizing: (orderId, compCode, optimizing) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) =>
        p.orderId === orderId && p.compCode === compCode ? { ...p, optimizing } : p,
      ),
    }));
  },

  setOptimizingLanguage: (orderId, compCode, language) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) =>
        p.orderId === orderId && p.compCode === compCode
          ? { ...p, optimizingLanguage: language ?? undefined }
          : p,
      ),
    }));
  },

  setOptimizedResult: (orderId, compCode, result) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) =>
        p.orderId === orderId && p.compCode === compCode
          ? { ...p, optimized: result, optimizeError: undefined }
          : p,
      ),
    }));
  },

  setOptimizedField: (orderId, compCode, language, text) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) => {
        if (p.orderId !== orderId || p.compCode !== compCode) {
          return p;
        }
        const base: OptimizedPrompt = p.optimized ?? { en: '', zh: '' };
        return {
          ...p,
          optimized: { ...base, [language]: text },
          optimizeError: undefined,
        };
      }),
    }));
  },

  setOptimizeError: (orderId, compCode, error) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) =>
        p.orderId === orderId && p.compCode === compCode
          ? { ...p, optimizeError: error, optimized: undefined }
          : p,
      ),
    }));
  },

  reset: () => set(initialState),
}));
```

- [ ] **Step 5: Run the store tests to verify they pass**

Run: `npm test -- tests/store/useOrderStore.test.ts`
Expected: PASS, all cases green.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/store/useOrderStore.ts tests/store/useOrderStore.test.ts
git commit -m "refactor(order): move selectedCompCodes onto Order, drop compSelections map"
```

---

## Task 2: Extend `OrderInput` to render `CompPicker` (TDD)

**Files:**
- Modify: `src/components/OrderInput.tsx`
- Test: `tests/components/OrderInput.test.tsx`

- [ ] **Step 1: Add shared mock data for compositions in the test file**

At the top of `tests/components/OrderInput.test.tsx`, import `Composition` and add a mock list and required-props helper. Insert after the existing `MOCK_EXPRESSIONS` constant.

```ts
import type { Order, Outfit, Scene, Pose, Expression, Composition } from '@/types';

const MOCK_COMPOSITIONS: Composition[] = [
  {
    code: 'COMP-01',
    name: '特寫正面',
    prompt: 'close-up headshot, front view',
    shot: 'close_up',
    angle: 'front',
  },
  {
    code: 'COMP-04',
    name: '全身 3/4',
    prompt: 'full-body shot, 3/4 angle',
    shot: 'full_body',
    angle: 'three_quarter',
  },
];

const DEFAULT_COMP_PROPS = {
  compositions: MOCK_COMPOSITIONS,
  recommendedCompCodes: [] as string[],
};
```

- [ ] **Step 2: Update every existing `render(<OrderInput ... />)` call to spread the new props**

In every existing test case that currently does:

```tsx
render(<OrderInput value={null} onOrderChange={vi.fn()} />);
```

change it to:

```tsx
render(<OrderInput value={null} onOrderChange={vi.fn()} {...DEFAULT_COMP_PROPS} />);
```

Do the same for the cases that pass a non-null `value`. This applies to every `render(<OrderInput ...>)` in the file.

- [ ] **Step 3: Add a new describe block exercising `CompPicker` integration**

Append inside the outer `describe('OrderInput', () => { ... })`:

```ts
  describe('Composition picker integration', () => {
    it('renders the CompPicker with the provided compositions', () => {
      render(
        <OrderInput
          value={null}
          onOrderChange={vi.fn()}
          compositions={MOCK_COMPOSITIONS}
          recommendedCompCodes={[]}
        />,
      );
      expect(screen.getByLabelText('構圖挑選')).toBeInTheDocument();
    });

    it('fires onOrderChange with updated selectedCompCodes when a comp is picked', async () => {
      const user = userEvent.setup();
      const onOrderChange = vi.fn();
      const value = {
        outfit: 'CAS-02',
        scene: 'SCN-01',
        pose: 'POS-04',
        expr: 'EXP-01',
        tier: 'T0' as const,
        selectedCompCodes: [] as string[],
      };
      render(
        <OrderInput
          value={value}
          onOrderChange={onOrderChange}
          compositions={MOCK_COMPOSITIONS}
          recommendedCompCodes={['COMP-04']}
        />,
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(await screen.findByText('特寫正面'));

      expect(onOrderChange).toHaveBeenCalled();
      const lastArg = onOrderChange.mock.calls.at(-1)?.[0] as Order;
      expect(lastArg.selectedCompCodes).toEqual(['COMP-01']);
      expect(lastArg.outfit).toBe('CAS-02');
      expect(lastArg.tier).toBe('T0');
    });
  });
```

- [ ] **Step 4: Run the OrderInput tests to verify the new cases fail**

Run: `npm test -- tests/components/OrderInput.test.tsx`
Expected: FAIL. Compilation errors on unknown `compositions` / `recommendedCompCodes` props; the new assertions for `構圖挑選` and `selectedCompCodes` also fail.

- [ ] **Step 5: Update `src/components/OrderInput.tsx`**

Replace the file with:

```tsx
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
              onChange={(codes) => handleFieldChange({ selectedCompCodes: codes })}
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
```

- [ ] **Step 6: Run OrderInput tests to verify they pass**

Run: `npm test -- tests/components/OrderInput.test.tsx`
Expected: PASS, every case green (existing ones + the two new Composition-picker cases).

- [ ] **Step 7: Commit**

```bash
git add src/components/OrderInput.tsx tests/components/OrderInput.test.tsx
git commit -m "feat(OrderInput): render CompPicker beside the tier select"
```

---

## Task 3: Rewire `App.tsx` — drop the 構圖挑選 section

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Remove `compSelections` / `setCompSelection` usage and `handleRecommend`**

Open `src/App.tsx`. Delete these two lines from the store destructuring near the top of the component:

```tsx
  const compSelections = useOrderStore((state) => state.compSelections);
  const setCompSelection = useOrderStore((state) => state.setCompSelection);
```

Delete the entire `handleRecommend` function (the one that calls `setCompSelection` for every order).

- [ ] **Step 2: Update `handleAddBlankOrder` to seed `selectedCompCodes`**

Find `handleAddBlankOrder` and update the `addOrder` call so it includes `selectedCompCodes: []`:

```tsx
  function handleAddBlankOrder() {
    if (!canAddOrder) return;
    addOrder({
      outfit: outfits[0].code,
      scene: scenes[0].code,
      pose: poses[0].code,
      expr: expressions[0].code,
      tier: 'T0',
      selectedCompCodes: [],
    });
  }
```

- [ ] **Step 3: Rewrite `handleAssemble` to read `order.selectedCompCodes`**

Replace `handleAssemble` with:

```tsx
  function handleAssemble() {
    if (!character) return;
    setGlobalError(null);

    const prompts: AssembledPrompt[] = [];

    for (const order of orders) {
      for (const compCode of order.selectedCompCodes) {
        const composition = compositions.find((item) => item.code === compCode);
        const outfit = outfits.find((item) => item.code === order.outfit);
        const scene = scenes.find((item) => item.code === order.scene);
        const pose = poses.find((item) => item.code === order.pose);
        const expression = expressions.find((item) => item.code === order.expr);

        if (!composition || !outfit || !scene || !pose || !expression) {
          continue;
        }

        const prompt = assemblePrompt({
          order,
          comp: composition,
          character,
          outfit,
          scene,
          pose,
          expression,
          tierConstraints,
        });

        prompts.push({
          orderId: order.id,
          compCode,
          prompt,
          estimatedWords: countWords(prompt),
        });
      }
    }

    setAssembledPrompts(prompts);
  }
```

- [ ] **Step 4: Pass `compositions` + `recommendedCompCodes` into each `OrderInput`**

Locate the block that starts with `{orders.map((order, index) => (` inside the work-order section (the one that renders each order card with the 移除 button). Replace the entire block — from `{orders.map((order, index) => (` through its closing `))}` — with:

```tsx
            {orders.map((order, index) => {
              const pose = poses.find((p) => p.code === order.pose);
              const recommendedCompCodes = getRecommendedCompCodes(pose, compositions);
              return (
                <div key={order.id} className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-2 text-sm text-slate-400">工單 {index + 1}</div>
                  <OrderInput
                    value={order}
                    onOrderChange={(patch) => updateOrder(order.id, patch)}
                    compositions={compositions}
                    recommendedCompCodes={recommendedCompCodes}
                  />
                  <button
                    type="button"
                    onClick={() => removeOrder(order.id)}
                    className="absolute right-4 top-4 text-sm text-red-400 hover:text-red-300"
                  >
                    移除
                  </button>
                </div>
              );
            })}
```

- [ ] **Step 5: Replace the「推薦構圖」footer button with「組裝提示詞」**

Find the `<div className="mt-6 flex items-center gap-3">` block that sits directly below the orders list and contains the `handleRecommend` button plus the `globalError` alert. Replace the whole `<div>...</div>` with:

```tsx
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleAssemble}
              disabled={
                orders.length === 0 ||
                compositions.length === 0 ||
                orders.every((order) => order.selectedCompCodes.length === 0)
              }
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              組裝提示詞
            </button>

            {globalError && (
              <div role="alert" className="text-sm text-red-400">
                {globalError}
              </div>
            )}
          </div>
```

- [ ] **Step 6: Delete the entire standalone 構圖挑選 section**

Delete the whole `{Object.keys(compSelections).length > 0 && ( <section ...> ... </section> )}` block (the section whose header reads `構圖挑選`). After deletion the `{assembledPrompts.length > 0 && ( ... )}` section should immediately follow the work-order section's closing `</section>`.

- [ ] **Step 7: Run the full test suite and type-check**

Run: `npm test`
Expected: PASS, all suites green.

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Manual QA via dev server**

Run: `npm run dev` and open the printed URL.

Walk the five manual QA steps from the spec:

1. Load a full character + style dataset (via 資料管理 if needed). Add a work order, fill codes, click the ⭐ comp, click 組裝提示詞 — an output card appears.
2. Change the pose — the ⭐ options in the picker re-order, but the existing selection stays checked. Click 組裝提示詞 again — the output reflects the new pose.
3. Add a second work order; leave its comp selection empty. Click 組裝提示詞 — only the first order produces output.
4. Click 移除 on the first work order — it disappears cleanly and does not affect the second order or its comp selection.
5. Open 資料管理, wipe compositions. The 組裝提示詞 button becomes disabled.

If any step misbehaves, stop and debug before committing.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "feat(App): merge comp picker into order card, drop recommend step"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers type + store changes; Task 2 covers OrderInput layout and prop extension; Task 3 covers App.tsx rewiring (handleRecommend removal, button swap, handleAssemble migration, recommendedCompCodes derivation). All spec bullets are addressed.
- **Placeholder scan:** No "TBD", no "add error handling" without code, every step shows actual code or an exact command.
- **Type consistency:** `selectedCompCodes: string[]` on `Order` is consistent across tests, store, `OrderInput`, and `App.tsx`. Props `compositions` + `recommendedCompCodes` used consistently.
