# Pose `shot_suggestion` → CompPicker 推薦提示 Design Spec

## 背景與範圍

`src/data/styles/poses.yaml` 中每個 pose 都帶有 `shot_suggestion: string[]`（例如 POS-07 步行 → `["full_body"]`），但目前是 dead metadata —— `src/lib/promptAssembler.ts` 不讀取、UI 不顯示、沒有任何副作用。`src/types/index.ts` 的 `Pose.shot_suggestion` 與 fixture 存在僅為型別完整。

本設計把 `shot_suggestion` 升格為 **CompPicker 視覺推薦提示**：

- **UI 層**：CompPicker 在下拉選單與已選 chip 中，為「comp.shot ∈ 當前 pose.shot_suggestion」的構圖加上 ⭐ 前綴與 `text-blue-400` 文字色。
- **組裝層**：`src/lib/promptAssembler.ts` 完全不動；`comp.shot` 為 prompt 內容主導、`pose.shot_suggestion` 不影響輸出。使用者選了非推薦組合的「不協調」由使用者承擔成本。

### Scope 原則回應

本設計嚴格對齊專案鎖定的 `feedback_scope` 原則：

- 顯示全部選項、不擋使用者選擇
- 不做組合正確性驗證
- 不自動替使用者決定要顯示哪些構圖

⭐ 僅為視覺 hint，非推薦選項仍完整可見、可選、可組裝。

---

## 鎖定前提（Brainstorming 結論）

以下為 2026-04-18 brainstorming 對話中使用者明確確認之前提，後續實作不再重新審議：

1. **comp.shot 在 prompt 中為主**：使用者選 COMP-01 特寫就出特寫，pose 不覆寫、不追加協調語。
2. **pose.shot_suggestion 只影響 CompPicker UI**：`promptAssembler.ts` 及其測試完全不動。
3. **推薦為視覺層面，不擋選擇**：使用者可自由選非推薦 comp，無任何警示或確認對話框。
4. **推薦視覺**：⭐ 前綴 + `text-blue-400`，下拉 option 與已選 chip 皆適用。
5. **推薦判定邏輯**：`pose.shot_suggestion.includes(comp.shot)`，純陣列比對。
6. **邏輯位置**：pure helper 放在 `src/lib/compRecommendation.ts`，App.tsx 呼叫並傳 prop；CompPicker 保持 presentational。
7. **順手改名**：CompPicker 的 `recommended` prop（自 commit `a46774f` 起實際語義已是「全部 options」，名稱 stale）改為 `options`，避免與新 prop `recommendedCodes` 混淆。

---

## 架構

### 檔案結構

| 檔案 | 類型 | 說明 |
|---|---|---|
| `src/lib/compRecommendation.ts` | **Create** | 匯出 pure helper `getRecommendedCompCodes(pose, compositions)` |
| `tests/lib/compRecommendation.test.ts` | **Create** | 7 個 cases 單元測試 |
| `src/components/CompPicker.tsx` | **Modify** | prop 改名、新增 `recommendedCodes`、加 `formatOptionLabel` |
| `tests/components/CompPicker.test.tsx` | **Modify** | 既有 4 測試更新 prop 名；新增 5 個推薦視覺測試 |
| `src/App.tsx` | **Modify** | 計算 `pose` 與 `recommendedCodes`，傳入 CompPicker |

### 不動的檔案

- `src/lib/promptAssembler.ts`、`tests/lib/promptAssembler.test.ts`
- `src/types/index.ts`（`Pose.shot_suggestion` 已是 `string[]`）
- `src/store/useOrderStore.ts`
- 任何 YAML 資料檔

---

## 元件設計

### `getRecommendedCompCodes(pose, compositions)` — pure helper

**簽名：**

```ts
import type { Composition, Pose } from '@/types';

export function getRecommendedCompCodes(
  pose: Pose | undefined,
  compositions: Composition[],
): string[]
```

**行為：**

- `pose === undefined` → `[]`
- `pose.shot_suggestion.length === 0` → `[]`
- 否則：`compositions.filter(c => pose.shot_suggestion.includes(c.shot)).map(c => c.code)`
- 回傳順序保留 `compositions` 原順序（`filter` + `map` 天然保序）

**特性：** 無副作用、無 async、O(N×M)（N/M <20，足用）、可獨立單測。

### `CompPicker`（修改）

**Props 變更：**

```ts
interface Props {
  options: Composition[];           // 原 `recommended` 改名
  recommendedCodes: string[];       // 新增，required（非 optional）
  selected: string[];
  onChange: (selectedCompCodes: string[]) => void;
}
```

**內部 Option 型別擴充：**

```ts
interface Option {
  value: string;
  label: string;
  isRecommended: boolean;
}
```

`options.map` 時用 `recommendedCodes.includes(c.code)` 決定 `isRecommended`。

**react-select 新增 `formatOptionLabel`：**

```tsx
formatOptionLabel={(opt: Option) => (
  <span className={opt.isRecommended ? 'text-blue-400' : ''}>
    {opt.isRecommended ? '⭐ ' : ''}
    {opt.label}
  </span>
)}
```

`formatOptionLabel` 同時適用於下拉選單 option 與已選 chip（react-select 內建行為），無需分開處理。

**`classNames.option` 維持現狀：** `isFocused`/`isSelected` 的深藍高亮作用在 option container，不影響 `formatOptionLabel` 內 `<span>` 的 `text-blue-400`。hover / 選中時深藍底會視覺上蓋過藍字，這是可接受的 —— 推薦樣式只對 unselected + unfocused option 最明顯，符合預期。

### `App.tsx`（修改 1 處）

在 `{orders.map((order, index) => { ... })}` 的 `recommended` 計算附近新增：

```ts
const pose = poses.find((p) => p.code === order.pose);
const recommendedCodes = getRecommendedCompCodes(pose, compositions);
```

CompPicker 呼叫改為：

```tsx
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
```

需新增 import：

```ts
import { getRecommendedCompCodes } from '@/lib/compRecommendation';
```

**注意：** 本地變數 `recommended`（自 commit `a46774f` 起語義實際為「全部 compositions」，名稱同樣 stale）**不**在本次改動範圍內重新命名 —— 本次僅改 CompPicker 的 **prop** 名稱。避免擴大 diff；若未來要清理 App.tsx 的本地變數名，獨立 commit 處理。

---

## 資料流

```
YAML 載入
 ├─ poses: Pose[]              （含 shot_suggestion: string[]）
 └─ compositions: Composition[] （含 shot: string）
                │
                ▼
 order.pose (string, e.g. "POS-07")
                │
                ▼
 App.tsx:
   pose = poses.find(p => p.code === order.pose)
   recommendedCodes = getRecommendedCompCodes(pose, compositions)
                │
                ▼
 <CompPicker
   options={compositions}
   recommendedCodes={recommendedCodes}
   selected={...}
   onChange={...}
 />
                │
                ▼
 CompPicker: options.map → Option { value, label, isRecommended }
                │
                ▼
 formatOptionLabel
   ├─ 下拉 option 推薦   → "⭐ 名稱" + text-blue-400
   ├─ 下拉 option 非推薦 → "名稱"   + 預設色
   ├─ 已選 chip 推薦     → "⭐ 名稱" + text-blue-400
   └─ 已選 chip 非推薦   → "名稱"   + 預設色
```

### 更新觸發

- 使用者改 `order.pose` → parent re-render → `recommendedCodes` 重算 → CompPicker re-render。
- 切換工單（多工單） → 各 CompPicker 獨立計算，互不影響。

---

## Error Handling

功能無 async、無網路、無 IO。所有邊界情形皆靜默降級：

| 情境 | 行為 |
|---|---|
| `order.pose` 指向不存在的 POS code | `poses.find` 回 `undefined` → helper 回 `[]` → 全 comp 無 ⭐ |
| `pose.shot_suggestion` 為 `[]` | helper 回 `[]` → 全 comp 無 ⭐ |
| `shot_suggestion` 內容全部對不到任何 `comp.shot` | helper 回 `[]` → 全 comp 無 ⭐ |
| `compositions` 為 `[]` | helper 回 `[]` → CompPicker 顯示既有 `"無可用構圖"` |
| TypeScript 層型別缺漏 | `Pose.shot_suggestion` 為 required `string[]`，不另防禦 |

**刻意不做：**

- 不 throw 任何例外 —— UI hint 錯誤必須靜默降級。
- 不 `console.warn` —— 無需通知使用者。
- 不在 UI 顯示「此 pose 無推薦構圖」之類文字 —— 違反「不干擾使用者」scope 原則；無星號自然可理解。

---

## 測試策略

### 新檔 `tests/lib/compRecommendation.test.ts`

7 個 cases：

1. `pose === undefined` → `[]`
2. `pose.shot_suggestion === []` → `[]`
3. `compositions === []` → `[]`
4. 單一 match（`shot_suggestion=['full_body']` + 一 full_body + 一 close_up）→ 回 full_body 的 code
5. 多重 match（`shot_suggestion=['full_body','three_quarter_body']` + 三個 comp）→ 回兩個匹配 code
6. 零 match（`shot_suggestion=['close_up']` + 一個 full_body comp）→ `[]`
7. 保序（輸入 comp 順序 = 輸出 code 順序）

### 修改 `tests/components/CompPicker.test.tsx`

**既有 4 測試：** 全部 `recommended={comps}` 改為 `options={comps}` 並補 `recommendedCodes={[]}`。

**新增 5 測試：**

1. 下拉 option 為推薦 → 文字含 `⭐ ` 前綴
2. 下拉 option 為推薦 → 套用 `text-blue-400` class
3. 下拉 option 非推薦 → 無 `⭐`、無 `text-blue-400`
4. 已選 chip 為推薦 → chip 內含 `⭐`
5. 已選 chip 非推薦 → chip 內無 `⭐`

驗證方法：`render(<CompPicker options={comps} recommendedCodes={['COMP-04']} ... />)` → `screen.getByText(/^⭐ 全身/)`、`toHaveClass('text-blue-400')`。

### App.tsx 不寫新測試

- 專案現況 App.tsx 無既有測試檔。
- Helper 與 CompPicker 各自覆蓋核心邏輯；App.tsx 僅串接兩者（一行 `poses.find` + 呼叫 helper），以煙霧測試驗證即可。

### 煙霧測試清單（`npm run dev` 手動驗）

1. 選 POS-07（步行 → 建議 `full_body`） → 下拉中僅 full_body 類 comp 有 ⭐ 藍字
2. 切到 POS-09（手托下巴 → 建議 `close_up` + `medium`） → ⭐ 標記對應切換
3. 選一個推薦 comp → 對應 chip 也有 ⭐
4. 選一個非推薦 comp → chip 無 ⭐，可正常組裝 prompt
5. 多工單設不同 pose → 各 CompPicker 推薦互不影響

---

## 非目標（Out of Scope）

- **不改 `promptAssembler.ts`**：不加任何 shot harmonization descriptor 或協調語。
- **不改 YAML 資料**：`shot_suggestion` 欄位維持現狀，不清除、不擴充。
- **不擋選擇**：不新增任何「確認對話框」「警示訊息」阻止使用者選非推薦 comp。
- **不排序**：下拉選單不把推薦項排到最前；僅加視覺標記。
- **不動 store / state**：`recommendedCompCodes`（store 裡既有欄位，與本功能無關）語義不變。
