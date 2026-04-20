# 合併「新增工單」與「構圖挑選」為單一步驟

- 日期：2026-04-20
- 狀態：待實作

## 背景

目前 `App.tsx` 分成兩個區塊：

1. **工單** — 新增 / 編輯工單（`OrderInput`），結尾有「推薦構圖」按鈕
2. **構圖挑選** — 點下「推薦構圖」後才會出現，每張工單一個 `CompPicker`，結尾有「組裝提示詞」按鈕

使用者需要一邊看工單內容（服裝 / 場景 / 姿勢 / 表情 / 分級）一邊挑構圖，但兩個區塊分開導致他得上下捲動對照。而且第一步的「推薦構圖」按鈕實際上只是「為每張工單建立一個空的挑選桶」——不是真正的運算動作，拆成獨立步驟沒有必要。

## 目標

把構圖挑選的 `CompPicker` 內嵌到每張工單卡片裡，與分級 select 並排，讓工單資料與構圖選擇在同一張卡片內完成。操作流程由三步壓成兩步：

- 步驟 1（合併）：新增工單 + 勾選構圖
- 步驟 2：組裝提示詞

## 非目標

- 不動 `Composition` 資料模型、不動 `assemblePrompt`、不動 AI 優化流程
- 不動 `CompPicker` 元件內部（props 介面不變）
- 不動既有的持久化策略（`useOrderStore` 仍是純記憶體）

## 設計

### 型別

```ts
// src/types/index.ts
export interface Order {
  id: string;
  outfit: string;
  scene: string;
  pose: string;
  expr: string;
  tier: Tier;
  selectedCompCodes: string[];   // 新欄位
}

// 刪除 CompSelection interface
```

### Store（`useOrderStore`）

移除 `compSelections` map 與 `CompSelection` 相關型別、action：

```ts
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
  // setOptimizing / setOptimizingLanguage / setOptimizedResult
  // setOptimizedField / setOptimizeError / reset 不變
}
```

- 刪除：`setCompSelection`、`toggleComp`
- `addOrder` 的 caller 必須傳 `selectedCompCodes`（通常是 `[]`）
- `removeOrder` 不再需要同步清理 compSelections

### `OrderInput`

Props 擴展：

```ts
interface Props {
  value: Omit<Order, 'id'> | null;
  onOrderChange: (order: Omit<Order, 'id'>) => void;
  compositions: Composition[];
  recommendedCompCodes: string[];
}
```

- `recommendedCompCodes` 由 App.tsx 透過 `getRecommendedCompCodes(pose, compositions)` 依當下 pose 計算傳入
- 構圖選擇變動時透過現有 `onOrderChange({ ...current, selectedCompCodes: nextCodes })` 回報

新版 layout：

```
┌────────────────────────────────┐
│ [ 四項代碼組合 input ]         │
│ ───────────────────────────    │
│ [ 服裝   ][ 場景   ]           │  grid-cols-2
│ [ 姿勢   ][ 表情   ]           │
│ ───────────────────────────    │
│ [ 分級   ][ 構圖 CompPicker ]  │  grid-cols-2
└────────────────────────────────┘
```

### `App.tsx`

- 刪除 state 擷取：`compSelections`、`setCompSelection`
- 刪除函式：`handleRecommend`
- 刪除整個「構圖挑選」`<section>`（含其內部 `handleAssemble` 按鈕）
- 工單區塊 footer 按鈕列：把「推薦構圖」換成「組裝提示詞」
  - onClick: `handleAssemble`
  - disabled: `orders.length === 0 || orders.every(o => o.selectedCompCodes.length === 0) || compositions.length === 0`
  - 樣式：沿用原綠色 emerald（`bg-emerald-600 hover:bg-emerald-500`）
- 每張工單卡片在渲染 `OrderInput` 時：

  ```tsx
  const pose = poses.find((p) => p.code === order.pose);
  const recommendedCompCodes = getRecommendedCompCodes(pose, compositions);

  <OrderInput
    value={order}
    onOrderChange={(patch) => updateOrder(order.id, patch)}
    compositions={compositions}
    recommendedCompCodes={recommendedCompCodes}
  />
  ```

- `handleAssemble` 迭代邏輯：以 `order.selectedCompCodes` 取代 `compSelections[order.id]?.selectedCompCodes`
- `handleAddBlankOrder` 新增時帶 `selectedCompCodes: []`

### 行為規則

- **新工單預設**：`selectedCompCodes: []`（空白，使用者自行挑選）
- **pose 變動時**：`selectedCompCodes` 不動；`CompPicker` 內部只是 ⭐ 重新排序
- **工單欄位變動時**：`assembledPrompts` 不會自動清空；使用者需再按一次「組裝提示詞」才重算（沿用現行行為）
- **「資料不完整將無法新增工單」警示**：保留不動

## 錯誤處理

本變更不引入新的錯誤路徑。`globalError` 既有變數保留但暫無寫入點（維持現況）。

## 測試

### Unit

- `tests/store/useOrderStore.test.ts`
  - 移除所有 `setCompSelection` / `toggleComp` / `compSelections` 案例
  - 新增：`addOrder` 傳 `selectedCompCodes: []` 後可透過 `updateOrder` patch 更新
  - 新增：`removeOrder` 僅移除該 order，不需額外清理
- `tests/components/OrderInput.test.tsx`
  - 新增：渲染時看得到 `CompPicker`（以 `aria-label="構圖挑選"` 找）
  - 新增：勾選構圖 → 觸發 `onOrderChange`，payload 含更新後的 `selectedCompCodes`
  - 既有代碼解析 / select 欄位變動案例不動
- `tests/components/CompPicker.test.tsx`：不動（props 介面不變）

### 手動 QA

於 dev server 跑一次 golden path：
1. 新增工單 → 填代碼 → 勾 ⭐ 構圖 → 點「組裝提示詞」→ 輸出卡片正確
2. 改變 pose → 構圖選單 ⭐ 重排但勾選保留 → 再按「組裝提示詞」→ 輸出卡片重算
3. 多張工單混合勾選 / 不勾選 → 只勾的那幾張有輸出
4. 移除工單 → 該 order 的選擇一併消失，不影響其他 order
5. 構圖資料為空時，「組裝提示詞」按鈕為 disabled

## 風險與風險掃除

- **Risk**：`Order` 型別加欄位後，若 lib/ 有對 Order 做 JSON 序列化 / 反序列化（例如 export / import），舊資料會缺 `selectedCompCodes`
- **Mitigation**：實作第一步先 `grep -n 'Order' src/lib` 與檢查 `DataManagerModal`、`dataStorage`、`dataLoader`，確認沒有 Order-level 持久化路徑；若有，為欄位加 fallback `?? []`

## 範疇

本設計只涵蓋 UI 重構與相關 store / 型別調整，不含任何跨角色資料、多使用者、或持久化層的變更。
