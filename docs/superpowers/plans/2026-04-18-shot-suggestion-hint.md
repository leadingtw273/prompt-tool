# Pose `shot_suggestion` → CompPicker 推薦提示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 dead metadata `Pose.shot_suggestion` 升格為 CompPicker 的視覺推薦 hint（⭐ + `text-blue-400`），不動 `promptAssembler`、不擋選擇。

**Architecture:** 新增 pure helper `getRecommendedCompCodes(pose, compositions)` 在 App.tsx 計算推薦 comp code 子集；CompPicker 接受新 prop `recommendedCodes`（並把 stale 的 `recommended` prop 改名 `options`），在 `formatOptionLabel` 依此 flag 渲染 ⭐ 與藍字；已選 chip 一併標示；使用者選非推薦仍可正常組裝。

**Tech Stack:** React 19, TypeScript, Tailwind 3, vitest, @testing-library/react, react-select。

Spec: `docs/superpowers/specs/2026-04-18-shot-suggestion-hint-design.md`

---

### Task 1: 新增 `getRecommendedCompCodes` pure helper（TDD）

**Files:**
- Create: `src/lib/compRecommendation.ts`
- Test: `tests/lib/compRecommendation.test.ts`

- [ ] **Step 1: 寫 failing tests**

建立 `tests/lib/compRecommendation.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { getRecommendedCompCodes } from '@/lib/compRecommendation';
import type { Composition, Pose } from '@/types';

const comps: Composition[] = [
  { code: 'COMP-01', name: '特寫正面', prompt: 'close-up headshot', shot: 'close_up', angle: 'front' },
  { code: 'COMP-03', name: '半身正面', prompt: 'medium shot', shot: 'medium', angle: 'front' },
  { code: 'COMP-04', name: '全身 3/4', prompt: 'full-body shot', shot: 'full_body', angle: 'three_quarter' },
  { code: 'COMP-05', name: '七分身側目', prompt: 'three-quarter body', shot: 'three_quarter_body', angle: '45deg' },
];

function makePose(shot_suggestion: string[]): Pose {
  return {
    code: 'POS-TEST',
    name: 'test pose',
    prompt: 'test prompt',
    shot_suggestion,
  };
}

describe('getRecommendedCompCodes', () => {
  it('returns [] when pose is undefined', () => {
    expect(getRecommendedCompCodes(undefined, comps)).toEqual([]);
  });

  it('returns [] when pose.shot_suggestion is empty', () => {
    expect(getRecommendedCompCodes(makePose([]), comps)).toEqual([]);
  });

  it('returns [] when compositions is empty', () => {
    expect(getRecommendedCompCodes(makePose(['full_body']), [])).toEqual([]);
  });

  it('returns the matching comp code for a single-shot suggestion', () => {
    expect(getRecommendedCompCodes(makePose(['full_body']), comps)).toEqual(['COMP-04']);
  });

  it('returns all matching comp codes for a multi-shot suggestion', () => {
    expect(
      getRecommendedCompCodes(makePose(['full_body', 'three_quarter_body']), comps),
    ).toEqual(['COMP-04', 'COMP-05']);
  });

  it('returns [] when no comp.shot matches any suggestion', () => {
    expect(getRecommendedCompCodes(makePose(['extreme_close_up']), comps)).toEqual([]);
  });

  it('preserves the input compositions order in the output', () => {
    // comps 順序：close_up, medium, full_body, three_quarter_body
    // suggestion 順序：three_quarter_body, close_up, full_body
    // 期望輸出以 comps 的順序為準：close_up, full_body, three_quarter_body
    expect(
      getRecommendedCompCodes(
        makePose(['three_quarter_body', 'close_up', 'full_body']),
        comps,
      ),
    ).toEqual(['COMP-01', 'COMP-04', 'COMP-05']);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/lib/compRecommendation.test.ts`
Expected: FAIL（模組 `@/lib/compRecommendation` 不存在）。

- [ ] **Step 3: 實作 `src/lib/compRecommendation.ts`**

```ts
import type { Composition, Pose } from '@/types';

export function getRecommendedCompCodes(
  pose: Pose | undefined,
  compositions: Composition[],
): string[] {
  if (!pose || pose.shot_suggestion.length === 0) {
    return [];
  }
  return compositions
    .filter((c) => pose.shot_suggestion.includes(c.shot))
    .map((c) => c.code);
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/lib/compRecommendation.test.ts`
Expected: PASS 全部 7 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/lib/compRecommendation.ts tests/lib/compRecommendation.test.ts
git commit -m "feat(compRecommendation): add helper matching comp.shot with pose.shot_suggestion"
```

---

### Task 2: CompPicker API 演進 + App.tsx 整合（TDD）

**Files:**
- Modify: `src/components/CompPicker.tsx`
- Modify: `tests/components/CompPicker.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 寫 5 個 failing tests（附加到 CompPicker.test.tsx 檔尾）**

在 `tests/components/CompPicker.test.tsx` 既有 `describe('CompPicker', () => { ... })` 的最後一個 `});` 之前，附加下列 5 個測試：

```tsx
  it('renders a ⭐ prefix on options listed in recommendedCodes', async () => {
    const user = userEvent.setup();
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(/^⭐ 全身 3\/4$/)).toBeInTheDocument();
  });

  it('applies text-blue-400 class to recommended options', async () => {
    const user = userEvent.setup();
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(/^⭐ 全身 3\/4$/)).toHaveClass('text-blue-400');
  });

  it('does not render ⭐ or text-blue-400 on non-recommended options', async () => {
    const user = userEvent.setup();
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    const plainOption = within(listbox).getByText(/^特寫正面$/);
    expect(plainOption).toBeInTheDocument();
    expect(plainOption).not.toHaveClass('text-blue-400');
    expect(within(listbox).queryByText(/^⭐ 特寫正面$/)).not.toBeInTheDocument();
  });

  it('shows ⭐ on a chip when the selected comp is recommended', () => {
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={['COMP-04']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/^⭐ 全身 3\/4$/)).toHaveClass('text-blue-400');
  });

  it('does not show ⭐ on a chip when the selected comp is not recommended', () => {
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={['COMP-01']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/^特寫正面$/)).toBeInTheDocument();
    expect(screen.queryByText(/^⭐ 特寫正面$/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/components/CompPicker.test.tsx`
Expected: FAIL（TypeScript 編譯失敗：`options` 與 `recommendedCodes` prop 不存在於 CompPicker Props；既有 4 個測試目前仍用 `recommended` prop，尚未改動，會保持現況但新測試 compile 不過）。

- [ ] **Step 3: 改寫 `src/components/CompPicker.tsx`**

將檔案完整內容替換為：

```tsx
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
```

- [ ] **Step 4: 更新既有 4 個測試的 prop 名稱**

在 `tests/components/CompPicker.test.tsx` 檔內，依序做以下精確字串替換：

第一處（既有 `ControlledPicker` 內）：

```tsx
    <CompPicker
      recommended={comps}
      selected={selected}
      onChange={(codes) => {
```

改為：

```tsx
    <CompPicker
      options={comps}
      recommendedCodes={[]}
      selected={selected}
      onChange={(codes) => {
```

第二處（`renders pre-selected comps as tags using Chinese names only` 測試內）：

```tsx
    render(<CompPicker recommended={comps} selected={['COMP-01']} onChange={vi.fn()} />);
```

改為：

```tsx
    render(<CompPicker options={comps} recommendedCodes={[]} selected={['COMP-01']} onChange={vi.fn()} />);
```

第三處（`opens the menu and shows each option labelled by Chinese name only` 測試內）：

```tsx
    render(<CompPicker recommended={comps} selected={[]} onChange={vi.fn()} />);
```

改為：

```tsx
    render(<CompPicker options={comps} recommendedCodes={[]} selected={[]} onChange={vi.fn()} />);
```

第四處（`calls onChange with the selected code when an option is picked` 測試內）：

```tsx
    render(<CompPicker recommended={comps} selected={[]} onChange={onChange} />);
```

改為：

```tsx
    render(<CompPicker options={comps} recommendedCodes={[]} selected={[]} onChange={onChange} />);
```

- [ ] **Step 5: 執行 CompPicker 測試確認通過**

Run: `npm test -- tests/components/CompPicker.test.tsx`
Expected: PASS 全部 9 個測試（既有 4 + 新增 5）。

- [ ] **Step 6: 整合到 `src/App.tsx`**

在 `src/App.tsx` 頂部 imports 區，於 `import { assemblePrompt } from '@/lib/promptAssembler';` 下方加入：

```ts
import { getRecommendedCompCodes } from '@/lib/compRecommendation';
```

找到 `{orders.map((order, index) => { ... })}` 內計算 `recommended` 的區塊：

```tsx
                const recommended = compositions.filter((composition) =>
                  selection.recommendedCompCodes.includes(composition.code),
                );

                return (
                  <div key={order.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-300">工單 {index + 1}</h3>
                    <CompPicker
                      recommended={recommended}
                      selected={selection.selectedCompCodes}
                      onChange={(codes) =>
                        setCompSelection(order.id, {
                          recommendedCompCodes: selection.recommendedCompCodes,
                          selectedCompCodes: codes,
                        })
                      }
                    />
                  </div>
                );
```

替換為：

```tsx
                const recommended = compositions.filter((composition) =>
                  selection.recommendedCompCodes.includes(composition.code),
                );
                const pose = poses.find((p) => p.code === order.pose);
                const recommendedCodes = getRecommendedCompCodes(pose, compositions);

                return (
                  <div key={order.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-300">工單 {index + 1}</h3>
                    <CompPicker
                      options={recommended}
                      recommendedCodes={recommendedCodes}
                      selected={selection.selectedCompCodes}
                      onChange={(codes) =>
                        setCompSelection(order.id, {
                          recommendedCompCodes: selection.recommendedCompCodes,
                          selectedCompCodes: codes,
                        })
                      }
                    />
                  </div>
                );
```

- [ ] **Step 7: 全量 build + 測試**

Run: `npm run build && npm test`
Expected: `tsc -b` 無誤；所有測試 PASS。

- [ ] **Step 8: 手動煙霧測試**

```bash
npm run dev
```

於瀏覽器驗證 5 項：

1. 選 POS-07（步行 → `shot_suggestion: ["full_body"]`）→ CompPicker 下拉中 `COMP-04 全身 3/4` / `COMP-06 全身低視角` 有 ⭐ 藍字，其他無。
2. 切到 POS-09（手托下巴 → `shot_suggestion: ["close_up", "medium"]`）→ ⭐ 標記切換到 close_up / medium 類 comp（如 COMP-01 / COMP-02 / COMP-03 / COMP-07 / COMP-08 / COMP-10）。
3. 選一個推薦 comp → 已選 chip 內也有 ⭐ 藍字。
4. 選一個非推薦 comp（例如 POS-07 步行時選 COMP-01 特寫）→ chip 無 ⭐，按「組裝提示詞」可正常產生 prompt。
5. 建立兩張工單（不同 pose）→ 兩個 CompPicker 的 ⭐ 標記互不影響。

- [ ] **Step 9: Commit**

```bash
git add src/components/CompPicker.tsx tests/components/CompPicker.test.tsx src/App.tsx
git commit -m "feat(CompPicker): mark pose-recommended comps with star + primary color"
```

---

## Self-Review

- **Spec coverage ✓**：
  - §架構（compRecommendation.ts / CompPicker / App.tsx 三處改動） → Task 1 + Task 2 全部涵蓋
  - §元件（helper 簽名 / CompPicker props / formatOptionLabel） → Task 1 Step 3 + Task 2 Step 3 對應完整程式碼
  - §資料流（pose → helper → prop → formatOptionLabel） → Task 2 Step 6 App.tsx 改動 + Step 3 CompPicker 內部映射對齊
  - §錯誤處理（5 種邊界情境） → Task 1 tests 1–3 + 6 涵蓋靜默降級
  - §測試策略（helper 7 cases + CompPicker 新 5 + 改 4） → Task 1 Step 1 的 7 cases + Task 2 Step 1 的 5 cases + Step 4 的 4 處改名
  - §非目標（不動 promptAssembler / 不動 YAML / 不擋選擇 / 不排序 / 不動 store） → 本計畫無任何 task 觸及這些檔案或行為
  - §鎖定前提 7 條 → 無一被計畫違反

- **Placeholder scan ✓**：無 TBD / TODO / 「similar to」/「add appropriate」等 red flag；每個 step 附完整程式碼與命令。

- **Type consistency ✓**：
  - `getRecommendedCompCodes(pose: Pose | undefined, compositions: Composition[]): string[]` — Task 1 定義與 Task 2 Step 6 呼叫一致。
  - CompPicker Props `{ options, recommendedCodes, selected, onChange }` — Task 2 Step 3 定義與 Step 1 / Step 4 / Step 6 呼叫一致。
  - 內部 Option `{ value, label, isRecommended }` — Step 3 宣告與 formatOptionLabel 使用一致。
