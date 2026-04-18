# AI 優化功能設計

日期：2026-04-18
作者：leadi

## 背景

提示詞輸出區塊目前每張卡片僅有「複製」按鈕。本次新增 Gemini 驅動的「AI 優化」功能：使用者在設定 modal 配置 Gemini API key、model、系統提示詞；於每張 PromptCard 按下 AI 優化按鈕，將當前組合提示詞送給 Gemini 產生英文與簡體中文兩版優化結果，並以三段摺疊區呈現（原始 / 英文優化 / 中文優化），每段各自有複製按鈕。

## 目標

- 在 PromptCard 動作列新增 AI 優化按鈕（左側）；複製按鈕改為內嵌於各段摺疊區 header。
- 新增設定 modal（齒輪 icon 開啟），欄位：API key / Model / 系統提示詞。所有設定存 localStorage。
- 未配置 API key 時，AI 優化按鈕顯示「AI 優化(未配置)」並 disabled。
- 已有優化結果時再次點擊 → 跳 `window.confirm` 二次確認避免誤觸。

## 非目標

- 不支援多 provider（僅 Gemini）。
- 不保留優化歷史（覆蓋式）。
- 不做 API key 加密（localStorage 本就明文；純個人工具）。
- 不新增 toast / dialog 元件庫。

## 資料型別

### `AppSettings`

```ts
export interface AppSettings {
  apiKey: string;
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  systemPrompt: string;
}
```

### `OptimizedPrompt`

```ts
export interface OptimizedPrompt {
  en: string;
  zh: string;
}
```

### `AssembledPrompt`（擴充既有）

```ts
export interface AssembledPrompt {
  orderId: string;
  compCode: string;
  prompt: string;
  estimatedWords: number;
  optimized?: OptimizedPrompt;
  optimizing?: boolean;
  optimizeError?: string;
}
```

## 檔案變動清單

### 新增

- `src/components/SettingsModal.tsx`
- `src/lib/aiOptimize.ts`
- `src/lib/settingsStorage.ts`
- `tests/lib/aiOptimize.test.ts`
- `tests/lib/settingsStorage.test.ts`
- `tests/components/SettingsModal.test.tsx`

### 修改

- `src/components/PromptCard.tsx`
- `src/App.tsx`
- `src/store/useOrderStore.ts`
- `src/types/index.ts`
- `tests/components/PromptCard.test.tsx`

## 元件設計

### `SettingsModal`

觸發：App header 右上齒輪 icon（inline SVG，不引入 icon 套件）。

結構：

```
[X]  AI 優化設定
──────────────────────
Gemini API Key   [password input]
                 取得 API key（aistudio.google.com/apikey 連結）

Model            [select: gemini-2.5-flash (推薦) / gemini-2.5-pro]

系統提示詞        [textarea, 6 行]
                 「恢復預設」按鈕

──────────────────────
           [取消] [儲存]
```

行為：

- 開啟時從 localStorage `fresh` 讀取填入本地表單 state。
- 「儲存」：驗證 → 寫 localStorage → 關閉 modal → App 層經 settings state 刷新下游。
- 「取消」/ Esc / 點遮罩：放棄本地編輯關閉。
- 「恢復預設」：僅重填系統提示詞為預設字串，其它欄位不動。
- 驗證：API key 可空（空則視為未配置）；系統提示詞不可空（空字串按儲存時顯示 inline 錯誤）。

預設系統提示詞：

```
You are a professional prompt engineer specialized in AI image generation. Improve the following prompt to be more vivid, specific, and visually rich while preserving the original composition, character, outfit, scene, pose, and expression intent. Avoid adding content that changes the subject.
```

Props：

```ts
interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (settings: AppSettings) => void;
}
```

### `PromptCard`（修改）

新增 props：

```ts
interface Props {
  orderCode: string;
  tier: Tier;
  comboLabel: string;
  prompt: string;
  optimized?: OptimizedPrompt;
  optimizing?: boolean;
  optimizeError?: string;
  isConfigured: boolean;
  onOptimize: () => void;
}
```

佈局：

```
Header：
  [orderCode]                                [字數 · 狀態]
  [Tier][comboLabel]

Action row：
  [AI 優化] / [AI 優化(未配置)disabled] / [優化中…spinner]

Error line（conditional）：
  AI 優化失敗：<message>

段落 1 ▶/▼  原始提示詞                       [複製]
  <prompt>

段落 2（有 optimized 時）▶/▼  英文優化提示詞    [複製]
  <optimized.en>

段落 3（有 optimized 時）▶/▼  中文優化提示詞    [複製]
  <optimized.zh>
```

摺疊初始規則（見 Q6-D）：

- 優化前：只渲染段落 1，且展開。
- 優化成功後：段落 1 自動收合，段落 2、3 追加且展開。
- 之後使用者可手動展開/收合任一段。
- 摺疊狀態以本地 state 管理（不入 store；不需跨卡片同步）。

互動：

- 點段落 header（除複製鈕）切換展開/收合。
- 複製鈕 `stopPropagation`，避免誤觸摺疊。
- AI 優化按鈕：
  - `!isConfigured` → 顯示「AI 優化(未配置)」，disabled。
  - `optimizing` → 顯示「優化中…」+ spinner，disabled。
  - 已有 `optimized` 且點擊 → `window.confirm('已有優化結果，重新優化會覆蓋舊結果，是否繼續？')`，確定才呼叫 `onOptimize()`。
  - 否則直接呼叫 `onOptimize()`。

## 函式設計

### `lib/settingsStorage.ts`

```ts
const STORAGE_KEY = 'prompt-tool:settings';

export const DEFAULT_SYSTEM_PROMPT =
  'You are a professional prompt engineer specialized in AI image generation. ' +
  'Improve the following prompt to be more vivid, specific, and visually rich ' +
  'while preserving the original composition, character, outfit, scene, pose, ' +
  'and expression intent. Avoid adding content that changes the subject.';

export function loadSettings(): AppSettings {
  // 讀 localStorage；解析失敗或缺欄位則填預設值（API key 空、model=flash、systemPrompt=DEFAULT）
}

export function saveSettings(settings: AppSettings): void {
  // JSON.stringify 寫入
}

export function isConfigured(settings: AppSettings): boolean {
  return settings.apiKey.trim().length > 0;
}
```

### `lib/aiOptimize.ts`

```ts
export async function optimizePrompt(params: {
  apiKey: string;
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  systemPrompt: string;
  originalPrompt: string;
}): Promise<OptimizedPrompt>;
```

內部流程：

1. 拼接 user message：
   ```
   <systemPrompt>

   <FORMAT_INSTRUCTION>

   ---

   <originalPrompt>
   ```
   其中 `FORMAT_INSTRUCTION` 為模組內常數：
   ```
   Return ONLY a JSON object with two keys: "en" (the optimized English prompt) and "zh" (the optimized prompt in Simplified Chinese). Do not include markdown code fences, explanations, or any other text.
   ```

2. `fetch` `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
   body：
   ```json
   {
     "contents": [{ "role": "user", "parts": [{ "text": "<拼好的字串>" }] }],
     "generationConfig": {
       "temperature": 0.8,
       "responseMimeType": "application/json"
     }
   }
   ```

3. 解析 `response.candidates[0].content.parts[0].text`：
   - 去掉開頭/結尾的 ` ```json ` / ` ``` ` fence（若有）
   - `JSON.parse`
   - 檢查 `.en`、`.zh` 皆為非空字串，否則拋 `'Gemini 回傳格式不符'`

4. 錯誤對應：
   - `fetch` reject → `'網路錯誤，請檢查連線'`
   - HTTP 400 含 `API key not valid` → `'API key 無效'`
   - HTTP 429 → `'已達 API 配額上限'`
   - HTTP 5xx → `'Gemini 伺服器錯誤，請稍後再試'`
   - 其他 4xx → 讀 `error.message`
   - JSON 解析失敗 → `'回傳格式解析失敗'`

### `useOrderStore`（擴充）

新增 actions：

```ts
setOptimizing(orderId: string, compCode: string, optimizing: boolean): void;
setOptimizedResult(orderId: string, compCode: string, result: OptimizedPrompt): void;
setOptimizeError(orderId: string, compCode: string, error: string): void;
```

找 `AssembledPrompt` 以 `(orderId, compCode)` 配對更新（現有 array 以 index 遍歷）。

## App 層整合

- `App.tsx` 新增本地 state：`settings: AppSettings`（初始化呼叫 `loadSettings()`）、`settingsOpen: boolean`。
- Header 右上新增齒輪 icon button，點擊 `setSettingsOpen(true)`。
- `<SettingsModal open={settingsOpen} onClose={...} onSaved={(s) => setSettings(s)} />`。
- 渲染 PromptCard 時傳入：
  - `isConfigured={isConfigured(settings)}`
  - `optimized`、`optimizing`、`optimizeError`（從 `assembledPrompt` 取）
  - `onOptimize={async () => { store.setOptimizing(...); try { const r = await optimizePrompt(...); store.setOptimizedResult(...); } catch (e) { store.setOptimizeError(...); } finally { store.setOptimizing(...false); } }}`

## 資料流圖

```
localStorage  ──loadSettings──▶  App state (settings)
                                      │
                                      ├─▶ SettingsModal (open/save)
                                      │       └─ saveSettings ─▶ localStorage
                                      │
                                      └─▶ PromptCard props
                                             │
                                             ├─ AI 優化 click
                                             └─ optimizePrompt(settings, prompt)
                                                     │
                                                     ├─ 成功 ─▶ store.setOptimizedResult
                                                     └─ 失敗 ─▶ store.setOptimizeError
```

## 測試策略

### `aiOptimize.test.ts`

- 成功回傳 `{ en, zh }`（mock fetch 回合法 JSON）
- 去除 code fence 後能正常解析
- 回傳缺 `en` 或 `zh` → 丟 `'Gemini 回傳格式不符'`
- HTTP 400 `API key not valid` → 丟 `'API key 無效'`
- HTTP 429 → 丟 `'已達 API 配額上限'`
- fetch reject → 丟 `'網路錯誤，請檢查連線'`
- 拼接的 user text 包含 system prompt、格式指示與原始提示詞

### `settingsStorage.test.ts`

- `loadSettings` 無資料 → 回傳預設值
- `loadSettings` 壞 JSON → 回傳預設值
- `loadSettings` 缺欄位 → 該欄位填預設值
- `saveSettings` → JSON.stringify 寫入並可 round-trip
- `isConfigured` 空白 / 空字串 → false；有值 → true

### `SettingsModal.test.tsx`

- 開啟時從 localStorage 讀值填表單
- 「儲存」呼叫 `saveSettings` + `onSaved` + `onClose`
- 「取消」不寫 localStorage
- 系統提示詞空 → 儲存顯示錯誤
- 「恢復預設」只覆蓋系統提示詞欄位

### `PromptCard.test.tsx`（擴充既有）

- 僅傳 `prompt` → 只渲染一段「原始提示詞」且展開
- 傳 `optimized` → 渲染三段，英文/中文優化展開、原始收合
- 複製鈕 `stopPropagation`：點複製不觸發摺疊
- `isConfigured=false` → 按鈕文字「AI 優化(未配置)」且 disabled
- `optimizing=true` → 按鈕顯示「優化中…」且 disabled
- 已有 `optimized` 且點按 → 觸發 `window.confirm`；取消不呼叫 `onOptimize`

## 風險與備註

- Gemini API 會隨時間演進；若將來 endpoint 或 body 格式變更，需更新 `aiOptimize.ts` 並補測試。
- `responseMimeType: "application/json"` 在 `gemini-2.5-*` 系列支援；若使用者切換自訂 model 時可能失敗（目前僅 flash/pro 下拉，無此風險）。
- API key 以明文存 localStorage，瀏覽器同源其他頁面（如瀏覽器擴充）可讀；這屬於個人工具可接受風險。
- Rate limit 由 Gemini 側處理；不加前端節流。
