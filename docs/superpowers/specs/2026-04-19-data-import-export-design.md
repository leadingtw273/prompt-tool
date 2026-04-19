# Styles / Characters 資料匯入匯出 Design Spec

## 背景與範圍

目前 `src/data/styles/*.yaml` (5 檔) 與 `src/data/characters/*.yaml` (1 檔) 均以實際資料 bundle 進 git，`src/lib/dataLoader.ts` 透過 Vite yaml plugin 在 build-time import。這違反「資料不應進 git」的個人隱私訴求：scenes / outfits / pose 的具體內容與角色設定是專案級個人資料，不應隨 repo 公開或 commit。

本設計將 6 個資料檔（5 styles + 1 characters 目錄）改為：
- YAML 檔本身保留但清空（`[]` / `{}`）
- 實際資料改存 **localStorage**
- 使用者透過新 UI「資料管理」進行 **匯入 / 匯出**
- 匯入格式：styles 為 **CSV**（papaparse），Character 為 **JSON**
- 支援多角色，App header 加 **角色選擇器**

### 不在範圍

- `src/data/rules/tier_constraints.yaml` 不動（屬機制常數、非個人資料）
- 跨 tab localStorage 同步
- localStorage 版本遷移框架（本次為 v1）
- 部分匯入 / partial success（策略鎖定為全或無）
- 自動儲存草稿 / 未保存提示

### Scope 原則回應（`feedback_scope`）

本設計嚴格遵守鎖定的「只做 prompt 產生、不加驗證 / 過濾 / 隨機推薦邏輯」：

- 匯入時驗證僅限於**格式檢查**（欄位、型別、enum 值），不做「這組合能不能組」的邏輯驗證
- localStorage 空時 UI 自然無選項，屬**自然後果**而非主動阻擋
- 顯示全部選項、讓使用者自行決定的核心原則不變

---

## 鎖定前提（Brainstorming 結論）

以下為 2026-04-19 brainstorming 對話中使用者明確確認之前提：

1. **動機**：資料不想進 git（個人隱私），非多人分享或多資料集切換。
2. **範圍**：僅限 `src/data/styles/` 與 `src/data/characters/`；`rules/` 不動。
3. **格式**：5 styles 使用 CSV，Character 使用 JSON。
4. **UI 入口**：header 頂部新增「資料管理」icon → 開啟單一 modal，modal 內列 6 個 entity 各自有 Import / Export。
5. **合併策略**：Replace（全量取代）；偵測到既有資料時彈出 ConfirmDialog 警告。
6. **驗證策略**：全或無 —— 任一 record 格式錯即拒絕整批匯入，localStorage 不動。
7. **多角色**：支援多個 Character，App header 加角色選擇器（react-select 風格）。
8. **CSV 陣列欄位**：pipe 分隔（`full_body|three_quarter_body`）。
9. **CSV library**：papaparse（成熟、處理 escape 與 Excel 格式）。
10. **遷移路徑**：一次性 Node 腳本 `scripts/export-yaml-to-csv.ts`，讀現有 YAML 輸出 CSV + JSON 到 `tmp/migration/`（.gitignore）。
11. **儲存引擎**：localStorage（不用 IndexedDB —— 資料量 <100KB、無查詢需求、同步 API 更簡單）。
12. **dataLoader.ts 處理**：刪除 styles + character loaders，只保留 `loadTierConstraints`。
13. **YAML 檔處理**：保留檔案清空內容（`[]` / `{}`），不 delete（避免動 Vite config）。
14. **CharacterPicker 位置**：App header `h1` 標題下一行。

---

## 架構

### 三層改動

```
├── Data Layer (new)
│   ├── localStorage keys prefix: prompt-tool:data:
│   │   - outfits / scenes / poses / expressions / compositions → Entity[]
│   │   - characters → Record<character_id, Character>
│   │   - activeCharacterId → string | null
│   ├── src/lib/dataStorage.ts — 純 localStorage CRUD 封裝
│   └── src/store/useDataStore.ts — Zustand store (與 useOrderStore 同風格)
│
├── Parsing / Serialization Layer (new)
│   ├── papaparse (+ ~14kB gzipped) 處理 CSV
│   ├── src/lib/csv/schemas.ts — 每個 styles entity 的 schema 常數
│   ├── src/lib/csv/parse<Entity>.ts × 5 — 解析 + 驗證
│   ├── src/lib/csv/serialize<Entity>.ts × 5 — 序列化（含 BOM for Excel）
│   └── src/lib/characters/parseCharacter.ts — JSON 解析 + 深度驗證
│
├── UI Layer
│   ├── src/components/DataManagerModal.tsx (new) — 6 列表格，統一入口
│   ├── src/components/ImportEntityModal.tsx (new) — 每 entity 共用的匯入流程
│   ├── src/components/CharacterPicker.tsx (new) — header 角色下拉
│   ├── src/lib/dataLoader.ts (modify) — 刪除 styles/character loaders
│   ├── src/data/styles/*.yaml (modify) — 清空為 []
│   ├── src/data/characters/ACC-001.yaml (modify) — 清空為 {}
│   └── src/App.tsx (modify) — 掛 CharacterPicker、資料管理 icon、useDataStore
│
└── Migration (one-off)
    └── scripts/export-yaml-to-csv.ts — Node + js-yaml 讀 src/data/
                                        輸出 tmp/migration/*.csv + characters.json
```

### 不動

- `src/data/rules/tier_constraints.yaml`（仍 bundled）
- `src/types/index.ts`（型別不變）
- `src/lib/promptAssembler.ts`
- `src/lib/compRecommendation.ts`
- `src/lib/aiOptimize.ts` 及 AI 優化相關
- `src/components/CompPicker.tsx`、`PromptCard.tsx`、`SettingsModal.tsx`
- `src/store/useOrderStore.ts`

---

## 元件設計

### 1. Data Layer

#### `src/lib/dataStorage.ts`

純 localStorage 封裝，無 React 依賴。對應 API：

```ts
const KEY_PREFIX = 'prompt-tool:data:';

// 6 entity loaders + savers（以 Scene 為例，其他類似）
export function loadScenes(): Scene[];        // 失敗時回 []
export function saveScenes(items: Scene[]): void;  // quota 失敗 throw StorageError

export function loadCharacters(): Record<string, Character>;
export function saveCharacters(map: Record<string, Character>): void;

export function loadActiveCharacterId(): string | null;
export function saveActiveCharacterId(id: string | null): void;

export class StorageError extends Error {}
```

**Fallback 策略**（所有 `load*`）：
- key 不存在 → 回空值（`[]` / `{}` / `null`）
- `JSON.parse` 失敗 → 回空值（不拋錯、不 console.error）
- 值型別不符預期（例如應為 array 卻是 object）→ 回空值

**設計原則**：寫入用 `try/catch` 包 `localStorage.setItem`，失敗 throw `StorageError`；由 UI 層捕捉並顯示訊息。

#### `src/store/useDataStore.ts`

Zustand store，與現有 `useOrderStore` 同風格：

```ts
interface DataState {
  outfits: Outfit[];
  scenes: Scene[];
  poses: Pose[];
  expressions: Expression[];
  compositions: Composition[];
  charactersById: Record<string, Character>;
  activeCharacterId: string | null;
}

interface DataActions {
  importOutfits: (items: Outfit[]) => void;
  importScenes: (items: Scene[]) => void;
  importPoses: (items: Pose[]) => void;
  importExpressions: (items: Expression[]) => void;
  importCompositions: (items: Composition[]) => void;
  importCharacters: (map: Record<string, Character>) => void;  // replace 全部
  setActiveCharacterId: (id: string | null) => void;
}
```

**初始 state**：constructor 同步呼叫 `dataStorage.load*()` 取得；localStorage 空時 state 皆為空。

**Action 行為**：修改 in-memory state + 同步呼叫對應 `save*()`；寫入失敗（StorageError）會 re-throw 供 UI 層接住並 rollback state。

### 2. Parsing / Serialization Layer

#### `src/lib/csv/schemas.ts`

常數集中：

```ts
export const SCENE_SCHEMA = {
  kind: 'scenes',
  displayName: 'Scenes',
  columns: ['code', 'name', 'prompt', 'lighting_hint'] as const,
  required: ['code', 'name', 'prompt', 'lighting_hint'] as const,
  example: [
    'code,name,prompt,lighting_hint',
    'SCN-01,咖啡廳室內,"cozy cafe interior, wooden table",warm side lighting',
  ].join('\n'),
  hint: '4 個欄位皆為字串',
} as const;

// OUTFIT_SCHEMA / POSE_SCHEMA / EXPRESSION_SCHEMA / COMPOSITION_SCHEMA 類似
```

POSE_SCHEMA 多說明 array 欄位：
```ts
{
  columns: ['code', 'name', 'prompt', 'shot_suggestion'],
  hint: '4 個欄位；shot_suggestion 為 | 分隔的 shot 值（close_up, extreme_close_up, medium, three_quarter_body, full_body）',
}
```

COMPOSITION_SCHEMA 多說明 enum：
```ts
{
  columns: ['code', 'name', 'prompt', 'shot', 'angle'],
  hint: 'shot ∈ {close_up, extreme_close_up, medium, three_quarter_body, full_body}；angle ∈ {front, profile, 45deg, three_quarter, low_up, high_down, over_shoulder}',
}
```

#### `src/lib/csv/parse<Entity>.ts` × 5

每 entity 一個 parser，統一介面：

```ts
export type ParseResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; errors: ParseError[] };

export interface ParseError {
  line?: number;          // CSV row 號（1-based，含 header）
  column?: string;        // 欄位名稱
  message: string;        // 中文訊息
}

export function parseScenesCsv(csvText: string): ParseResult<Scene>;
// 其他 4 個類似
```

**驗證步驟**（以 parseScenesCsv 為例）：
1. 用 papaparse 解析（`header: true, skipEmptyLines: true`）；papaparse errors → 收集為 ParseError[]
2. 驗 header：欄位名稱與順序必須完全符合 schema（順序嚴格；缺欄、多欄、順序不同皆 reject）—— 呼應 §Non-goals 的「嚴格順序」簡化原則
3. 逐 row 驗證：
   - 必填欄不可為空字串
   - Pose 的 `shot_suggestion`: split by `|` → 每個元素驗證為合法 Shot union 值
   - Composition 的 `shot` / `angle`: 驗證 enum 值
4. 全 record 收完後掃描 duplicate `code`
5. 任一錯誤 → 回 `{ok: false, errors}`；全過 → 回 `{ok: true, items}`

#### `src/lib/csv/serialize<Entity>.ts` × 5

```ts
export function serializeScenesCsv(items: Scene[]): string;
```

- 使用 papaparse 的 `unparse()`
- 前置 `\uFEFF` (UTF-8 BOM)，讓 Excel 開啟不亂碼
- Pose 的 `shot_suggestion` 以 `arr.join('|')` 平面化
- 空陣列 → 只有 header 列

#### `src/lib/characters/parseCharacter.ts`

```ts
export type CharacterParseResult =
  | { ok: true; value: Record<string, Character> }
  | { ok: false; errors: ParseError[] };

export function parseCharactersJson(jsonText: string): CharacterParseResult;
```

**接受兩種輸入格式**：
- 單一 character 物件：`{character_id: "ACC-001", ...}` → 自動包成 `{[character_id]: ...}`
- Map 格式：`{"ACC-001": {...}, "ACC-002": {...}}`

**驗證**：
- JSON.parse 失敗 → error
- 每個 character 值逐欄位檢查：
  - 必填 string：`character_id`, `display_name`
  - 必填物件：`model` (4 欄)、`appearance` (8 欄，含 tuple `age_range: [number, number]`、array `hair_variations`)、`color_palette` (含 `colors: string[]`、`usage: 'outfit_filter_only' | 'prompt_inject'`)
  - 必填 array<string>：`signature_features`、`prohibited`、`personality`
  - Tuple 長度驗證：`age_range` 與 `model.lora_weight_range` 必須恰為 2 個 number
- 成功 → 回 `{ok: true, value: {[id]: character}}`

#### Export 序列化

- styles: `serialize<Entity>Csv(items)` 回 CSV 字串（含 BOM）
- characters: `JSON.stringify(map, null, 2)` 回 pretty JSON

### 3. UI Layer

#### `src/components/DataManagerModal.tsx`

接受 `{ open, onClose }`，內部讀 `useDataStore` 取得各 entity 數量。

**排版**：
```
┌─────────────────────────────────────────────────┐
│ 資料管理                                  ✕     │
├─────────────────────────────────────────────────┤
│ Entity      │ 筆數 │ Import      │ Export       │
│ ──────────  │ ──── │ ──────────  │ ────────     │
│ Outfits     │   12 │ [匯入]      │ [下載 CSV]   │
│ Scenes      │    8 │ [匯入]      │ [下載 CSV]   │
│ Poses       │   15 │ [匯入]      │ [下載 CSV]   │
│ Expressions │    6 │ [匯入]      │ [下載 CSV]   │
│ Compositions│   10 │ [匯入]      │ [下載 CSV]   │
│ Characters  │    2 │ [匯入]      │ [下載 JSON]  │
│                                                 │
│                             [關閉]              │
└─────────────────────────────────────────────────┘
```

**行為**：
- 筆數 = 0 → Export 按鈕 disabled，文字「—」或灰色
- 點 Import → 開啟對應 `ImportEntityModal`
- 點 Export → 觸發下載（`URL.createObjectURL` + 動態 `<a>` click + `revokeObjectURL`）
- 下載檔名：`scenes.csv`, `outfits.csv`, ..., `characters.json`

#### `src/components/ImportEntityModal.tsx`

接受 `{ entityKind, open, onClose, onImported }`，由 DataManagerModal 控制開關。

**排版**：
```
┌─────────────────────────────────────────────────┐
│ 匯入 Scenes                              ✕     │
├─────────────────────────────────────────────────┤
│ 欄位提示：                                      │
│ 4 個欄位皆為字串：code, name, prompt,            │
│ lighting_hint                                   │
│                                                 │
│ 範例：                                          │
│ ┌─────────────────────────────────────────────┐│
│ │ code,name,prompt,lighting_hint              ││
│ │ SCN-01,咖啡廳室內,"cozy cafe interior...    ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ [上傳 .csv]                                     │
│                                                 │
│ ─────────────── 或 ───────────────             │
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ (textarea for paste)                        ││
│ │                                             ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ [錯誤清單區 / 成功訊息區 condiional render]      │
│                                                 │
│             [取消]          [匯入]              │
└─────────────────────────────────────────────────┘
```

**流程**：
1. 進入 modal：讀取對應 schema 顯示 hint + example
2. 使用者 (a) 上傳 `.csv` / `.json` 或 (b) 貼到 textarea
3. 按「匯入」：
   - parse → 若失敗 → 顯示錯誤清單（前 10 行），localStorage 不動
   - parse OK + 現有資料空 → 直接 save + onImported() + onClose()
   - parse OK + 現有資料非空 → 彈出 `ConfirmDialog`（重用 `src/components/ConfirmDialog.tsx`）：
     - 訊息：`將取代既有 N 筆 Scenes，此操作無法復原。確認？`
     - 確認 → save + onImported() + onClose()
     - 取消 → modal 留著，資料不動

**Character 分支**：
- 依 entityKind === 'characters' 走 `parseCharactersJson()` 而非 CSV parser
- Schema hint 顯示 JSON 結構文字說明（不用範例 JSON 塞太長）
- 上傳接受 `.json`；textarea 無特殊差異

#### `src/components/CharacterPicker.tsx`

接受無 props（從 `useDataStore` 讀所有東西）。

**排版位置**：App header 的 `h1` 標題下一行，與現有角色顯示文字替換。

**空態**：`charactersById` 為空 → 顯示 disabled 狀態文字「請先從資料管理匯入角色」。不另加「📥」快捷按鈕 —— 使用者可用 header 右上既有的資料管理 icon 進入（避免重複 UI）。

**有資料**：
- 用 react-select（與 CompPicker 同風格）
- options：`Object.values(charactersById).map(c => ({ value: c.character_id, label: c.display_name }))`
- value：對應當前 `activeCharacterId`
- onChange：`setActiveCharacterId(newId)`

**自動選擇邏輯**：在 `useEffect` 內 —— 當 `charactersById` 非空但 `activeCharacterId === null` 或指向不存在 id 時，自動 `setActiveCharacterId(Object.keys(charactersById)[0])`。

#### `src/lib/dataLoader.ts`（修改）

刪除：`loadOutfits`, `loadScenes`, `loadPoses`, `loadExpressions`, `loadCompositions`, `loadCharacter`
保留：`loadTierConstraints`（仍從 `src/data/rules/tier_constraints.yaml` bundle）

所有呼叫上述 5 + 1 函式的地方改用 `useDataStore` selector。

#### `src/App.tsx`（修改）

**頂部變化**：
- 移除 `const character = loadCharacter('ACC-001')`
- 移除 `const poses = loadPoses()` 等 5 處
- 新增：
  ```ts
  const character = useDataStore((s) =>
    s.activeCharacterId ? s.charactersById[s.activeCharacterId] : undefined
  );
  const outfits = useDataStore((s) => s.outfits);
  const scenes = useDataStore((s) => s.scenes);
  const poses = useDataStore((s) => s.poses);
  const expressions = useDataStore((s) => s.expressions);
  const compositions = useDataStore((s) => s.compositions);
  const [dataManagerOpen, setDataManagerOpen] = useState(false);
  ```

**Header 變化**：
- `h1` 標題下一行加 `<CharacterPicker />`
- 齒輪 icon 右邊多一個「資料管理」icon（Lucide `Database` 或類似）
- 點資料管理 icon → `setDataManagerOpen(true)`

**主內容條件 render**：
- `!character` → 顯示空態卡片「尚未匯入角色資料，請點右上方 📥 資料管理」+ 其他 UI 全部 disable
- 有 character 但某個 styles entity 是空 → 對應 OrderInput dropdown 空 → 組裝 button disabled（既有邏輯自然 fallback）

**掛載 DataManagerModal**：
```tsx
<DataManagerModal open={dataManagerOpen} onClose={() => setDataManagerOpen(false)} />
```

### 4. Migration Script

#### `scripts/export-yaml-to-csv.ts`

Node script，用 `tsx` 執行：

```bash
npx tsx scripts/export-yaml-to-csv.ts
```

**行為**：
1. 讀 `src/data/styles/*.yaml`（5 個檔）
2. 讀 `src/data/characters/*.yaml`（目前 1 個，迴圈讀所有 `.yaml`）
3. 對每個 styles entity 呼叫對應 `serialize<Entity>Csv()` → 寫 `tmp/migration/<entity>.csv`
4. 將 characters 聚合成 `Record<string, Character>` → `JSON.stringify(null, 2)` → 寫 `tmp/migration/characters.json`
5. Log 每個檔案的輸出路徑與 record 數

**相依**：
- `js-yaml`（Node 端讀 YAML，目前 package.json 無此相依，需新增 devDependency）
- 重用 `src/lib/csv/serialize*.ts`（import 共用程式碼）

**清理**：`tmp/` 加入 `.gitignore`（如尚未）。

---

## 資料流

### 冷啟動（首次 / localStorage 清空後）

```
Browser 載入
     │
     ▼
useDataStore constructor:
  - charactersById = {}
  - activeCharacterId = null
  - outfits/scenes/poses/exprs/comps = []
     │
     ▼
App.tsx render:
  - character = undefined
  - CharacterPicker: 空態提示
  - OrderInput: 4 個 dropdown 全空
  - 組裝按鈕 disabled
  - 主內容顯示「尚未匯入角色資料...」提示
     │
     ▼
使用者點「📥 資料管理」→ DataManagerModal 開
     │
     ▼
  | Entity       | 筆數 | Import  | Export |
  | Outfits      |   0  | [匯入]  | (dis)  |
  | ...          |  ... |  ...    |  ...   |
     │
     ▼
點 Characters [匯入] → ImportEntityModal 開
Schema hint (JSON 結構說明) + 上傳 / 貼 textarea → Apply
parse OK + localStorage 空 → 直接 save → 關閉
     │
     ▼
DataManagerModal 同步顯示 Characters: 1 筆
     │
     ▼
依序匯入 5 個 styles CSV
     │
     ▼
關 DataManagerModal
     │
     ▼
CharacterPicker useEffect 偵測 charactersById 非空
  + activeCharacterId === null → 自動 setActiveCharacterId(firstId)
     │
     ▼
App.tsx 重新 render with active character → UI 恢復正常
```

### 一般使用（資料已匯入後）

```
Browser 載入
     │
     ▼
useDataStore constructor:
  - 從 localStorage load 全部 6 entity + activeCharacterId
     │
     ▼
App.tsx render 正常
     │
  （使用者切 Character）
     ▼
CharacterPicker onChange → setActiveCharacterId(newId) → localStorage 同步
     │
     ▼
App re-render，character = charactersById[newId] → 全 UI 用新角色重繪
```

### 再次匯入（覆蓋）

```
DataManagerModal → Scenes [匯入] → ImportEntityModal
  → 貼 CSV → Apply → parse OK
  → store.scenes.length > 0 → ConfirmDialog 彈
  → 確認 → importScenes(newItems) → localStorage 覆寫 → 關閉
```

### Export 流程

```
DataManagerModal → [下載 CSV]
  → useDataStore.getState().scenes → serializeScenesCsv(items)
  → new Blob([text], {type: 'text/csv;charset=utf-8'})
  → URL.createObjectURL
  → 動態建 <a download="scenes.csv"> → click()
  → revokeObjectURL
  → 不關 modal
```

### 邊界情境處理

- **activeCharacterId 指向不存在角色**（使用者匯入新 character 不含原 ID）：
  - CharacterPicker `useEffect` 偵測 → 自動切第一個可用 character；無可用則回到空態
- **多 tab**：不處理（YAGNI）
- **localStorage quota exceed**：save 時 catch → UI 顯紅色錯誤訊息

---

## Error Handling

### 匯入錯誤

| 情境 | 處理 | 使用者看到 |
|---|---|---|
| CSV 解析格式錯（papaparse errors） | `parse*()` 回 `{ok: false, errors}` | ImportEntityModal 顯示錯誤清單，localStorage 不動 |
| 欄位缺失 / 必填空字串 | 同上 | `第 3 行 code 欄位為空` |
| enum 值不符（Shot, Angle） | 同上 | `第 7 行 shot 值 "portrait" 不屬於 (close_up, ...)` |
| 重複 code | 同上 | `code "SCN-01" 在第 3、7 行重複` |
| Character JSON 解析失敗 | `parseCharactersJson()` 回 errors | 類似訊息 |
| Character 深度欄位錯 | 同上 | `缺少必填欄位 "appearance.eye"` |

**錯誤清單顯示**：前 10 行（避免 UI 爆炸），若超過顯示「另有 N 行錯誤未顯示」。

### 既有資料警告

- 觸發：parse OK 且對應 store 非空
- 處理：`ConfirmDialog`（重用 `src/components/ConfirmDialog.tsx`）
- 訊息：`將取代既有 N 筆 {EntityName}，此操作無法復原。確認？`
- 取消 → 回到 ImportEntityModal 的 parse-OK 狀態（「匯入」按鈕仍可再按）
- 確認 → save + 關閉

### 匯出錯誤

- 近乎不會發生（Blob / URL API 全域支援）
- 用 try/catch 包整個 handler → DataManagerModal 顯示紅色 alert

### localStorage 寫入失敗

- 觸發：quota exceeded / private mode
- 處理：`saveX()` throw `StorageError` → UI catch
- 訊息：「儲存失敗：瀏覽器儲存空間不足或已停用」
- **重要**：Zustand state 在寫入成功後才 commit；失敗不留中間狀態

### 讀取時容錯

- `load*` 所有失敗情境（key 不存在 / JSON 壞 / 型別不符）都 fallback to 空值，不 throw、不 log
- 與現有 `settingsStorage.ts` 策略一致

### activeCharacterId fallback

- 偵測到指向不存在角色：CharacterPicker 的 `useEffect` 自動切第一個；無可用則 set null
- 靜默降級，無錯誤訊息

### 明確不做

- 跨 tab storage event 同步
- localStorage schema 版本遷移
- 部分匯入 / partial success
- 未保存變動提示

---

## 測試策略

### 單元測試（~75 cases，新增 ~450 行）

**`tests/lib/dataStorage.test.ts`** ~12 cases：
- 6 個 entity load/save round-trip
- load 時 key 不存在 → fallback
- load 時 JSON 壞 → fallback（不 throw）
- save 時 quota 異常 → throw `StorageError`
- activeCharacterId null 值正確 round-trip

**`tests/lib/csv/parse<Entity>.test.ts`** × 5，每 entity 6–8 cases（~35 cases）：
- happy path 最小有效 CSV
- 欄位缺失 → reject
- 必要欄位空字串 → reject
- 重複 code → reject 含重複行號
- Pose 的 `shot_suggestion` pipe split 邊界
- Composition 的 `shot` / `angle` enum 超出 → reject
- BOM / 無 BOM 都能 parse
- 雙引號 escape（Excel 風格）

**`tests/lib/csv/serialize<Entity>.test.ts`** × 5，每 entity 2 cases（~10 cases）：
- 空陣列 → 只有 header
- 含 array 欄位 pipe 序列化
- Round-trip（serialize → parse 得回相同陣列）

**`tests/lib/characters/parseCharacter.test.ts`** ~10 cases：
- 單一 character → ok
- Map 格式 → ok
- 缺必填（`character_id` / `appearance.eye`）→ reject 含路徑
- tuple 長度錯（`age_range: [20]`）→ reject
- array 欄位非 array → reject
- `color_palette.usage` union 外 → reject

**`tests/store/useDataStore.test.ts`** ~8 cases：
- 初始 state = localStorage 內容
- `importScenes(items)` 更新 store + 寫 localStorage
- `setActiveCharacterId(id)` 寫 localStorage
- activeCharacterId 指向不存在 → selector 回 undefined

### 元件測試（~21 cases，新增 ~350 行）

**`tests/components/DataManagerModal.test.tsx`** ~6 cases：
- 渲染 6 列，筆數正確顯示
- 筆數 0 → Export disabled
- 點 Import → 對應 ImportEntityModal 開啟（驗 callback）
- 點 Export → 觸發 download（spy `URL.createObjectURL`）
- 關 modal 不清資料

**`tests/components/ImportEntityModal.test.tsx`** ~10 cases：
- Schema hint 依 entityKind 正確顯示
- 貼 CSV + Apply → parse OK + 無既有資料 → 直接寫入 + close
- 貼 CSV + Apply → parse OK + 有既有資料 → ConfirmDialog 出現
  - 取消 → 不寫入
  - 確認 → 寫入 + close
- 貼無效 CSV → 錯誤清單顯示 + 不寫入
- 檔案上傳（用 `File` + `FileReader` mock）
- Character entity 走 JSON 分支
- 標題正確顯示「匯入 Outfits」等

**`tests/components/CharacterPicker.test.tsx`** ~5 cases：
- charactersById 空 → 空態提示
- 多角色時 options 正確渲染（label = display_name）
- 預設選中 activeCharacterId
- 切換 → `setActiveCharacterId(newId)` 被呼叫
- activeCharacterId 指向不存在 → useEffect 自動切第一個

### 不寫測試

- `src/lib/dataLoader.ts` 改動後只剩 `loadTierConstraints`，無邏輯改動
- `src/App.tsx`：依專案現況不寫 App 層測試，煙霧測試
- `scripts/export-yaml-to-csv.ts`：一次性，手動驗證

### 煙霧測試清單（`npm run dev` 手動驗）

1. 清空 localStorage → reload → 空態顯示 + CharacterPicker disabled + 組裝 disabled
2. 執行 `npx tsx scripts/export-yaml-to-csv.ts` → 檢查 `tmp/migration/` 有 5 CSV + 1 JSON
3. 開資料管理 → 逐一匯入 6 entity → 筆數正確
4. CharacterPicker 自動選第一個 → OrderInput 恢復 → 組裝成功
5. 匯出任一 entity → 下載檔內容正確
6. 已有資料再匯入 → ConfirmDialog → 取消 / 確認各驗
7. 貼錯誤 CSV → 錯誤清單
8. 切換 CharacterPicker → prompt 重組用新角色

---

## 非目標（Out of Scope）

- 跨 tab localStorage 同步（storage event）
- localStorage schema 版本遷移框架
- 部分匯入 partial success（全或無已鎖定）
- Undo / 復原最近一次 replace
- 自動儲存草稿 / 未保存變動提示
- 資料匯入時的 dry-run 預覽（使用者在 parse 後直接看錯誤訊息 or 確認提示）
- 將 `rules/tier_constraints.yaml` 納入 localStorage 管理
- 多使用者 / 分享機制
- 支援 YAML 格式匯入（CSV + JSON 已滿足）
- CSV 欄位順序寬鬆：**僅接受**與 schema 順序一致（簡化實作）
