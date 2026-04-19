# Styles / Characters 資料匯入匯出 — Sub-plan A：資料層 + Parser + dataLoader 改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將資料層從 bundled YAML 改為 localStorage 驅動 —— 建立 `dataStorage` / `useDataStore`、6 個 parser/serializer、遷移腳本；清空 YAML 檔；App.tsx 改讀 `useDataStore`。本 plan 結束時 App 可編譯、可渲染，但資料為空（UI 尚未提供 import 機制，由 Sub-plan B 補上）。

**Architecture:** 新增 `src/lib/dataStorage.ts`（localStorage CRUD）+ `src/store/useDataStore.ts`（Zustand），parsers/serializers 放在 `src/lib/csv/` 與 `src/lib/characters/`；`dataLoader.ts` 僅保留 `loadTierConstraints`；App.tsx 改用 store selector 並處理空資料降級。

**Tech Stack:** TypeScript, React 19, Zustand 5, vitest, @testing-library/react, papaparse (new), js-yaml (new, dev-only), tsx (new, dev-only)。

Spec: `docs/superpowers/specs/2026-04-19-data-import-export-design.md`

---

## File Structure

### 新增

| 檔案 | 用途 |
|---|---|
| `src/lib/dataStorage.ts` | localStorage CRUD，純函式封裝，無 React 依賴 |
| `src/lib/csv/schemas.ts` | 5 個 styles entity 的 CSV schema 常數（columns / example / hint） |
| `src/lib/csv/parseOutfits.ts` | Outfit CSV 解析 + 驗證 |
| `src/lib/csv/serializeOutfits.ts` | Outfit[] → CSV 字串（含 BOM） |
| `src/lib/csv/parseScenes.ts` | Scene CSV 解析 + 驗證 |
| `src/lib/csv/serializeScenes.ts` | Scene[] → CSV |
| `src/lib/csv/parsePoses.ts` | Pose CSV 解析 + 驗證（pipe 陣列） |
| `src/lib/csv/serializePoses.ts` | Pose[] → CSV |
| `src/lib/csv/parseExpressions.ts` | Expression CSV 解析 |
| `src/lib/csv/serializeExpressions.ts` | Expression[] → CSV |
| `src/lib/csv/parseCompositions.ts` | Composition CSV 解析（enum 驗證） |
| `src/lib/csv/serializeCompositions.ts` | Composition[] → CSV |
| `src/lib/csv/types.ts` | 共用 `ParseResult<T>`、`ParseError` 型別 |
| `src/lib/characters/parseCharacter.ts` | Character JSON 解析 + 深度驗證 |
| `src/store/useDataStore.ts` | Zustand store（與 useOrderStore 同風格） |
| `scripts/export-yaml-to-csv.ts` | 一次性 Node 腳本：讀現有 YAML 輸出 CSV + JSON |
| `tests/lib/dataStorage.test.ts` | dataStorage round-trip 測試 |
| `tests/lib/csv/parseOutfits.test.ts` ~ `parseCompositions.test.ts` | 5 parsers 單元測試 |
| `tests/lib/csv/serializeOutfits.test.ts` ~ `serializeCompositions.test.ts` | 5 serializers round-trip 測試 |
| `tests/lib/characters/parseCharacter.test.ts` | Character parser 測試 |
| `tests/store/useDataStore.test.ts` | Zustand store 行為測試 |

### 修改

| 檔案 | 修改內容 |
|---|---|
| `src/lib/dataLoader.ts` | 刪除 5 個 styles loaders + loadCharacter + 對應 YAML imports；保留 `loadTierConstraints` 與其 import |
| `src/data/styles/outfits.yaml` ~ `compositions.yaml`（5 檔） | 清空為 `[]` |
| `src/data/characters/ACC-001.yaml` | 清空為 `{}` |
| `src/App.tsx` | 改用 `useDataStore` selectors；加 `!character` 早期返回；`+ 新增工單` 按鈕依空陣列 disable |
| `.gitignore` | 新增 `tmp/` |
| `package.json` | 新增 runtime dep `papaparse`、devDeps `@types/papaparse`, `js-yaml`, `@types/js-yaml`, `tsx` |

### 不動

- `src/data/rules/tier_constraints.yaml`
- `src/types/index.ts`
- `src/lib/promptAssembler.ts`、`src/lib/compRecommendation.ts`、`src/lib/aiOptimize.ts`、`src/lib/settingsStorage.ts`、`src/lib/tokenCount.ts`、`src/lib/orderParser.ts`
- `src/store/useOrderStore.ts`
- 所有 `src/components/*`

---

### Task 1: 安裝依賴

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安裝 runtime 與 dev 依賴**

Run:

```bash
npm install papaparse
npm install --save-dev @types/papaparse js-yaml @types/js-yaml tsx
```

Expected: `package.json` 新增 5 個項目，`package-lock.json` 更新。無警告（peer deps 衝突）。

- [ ] **Step 2: 驗證安裝**

Run: `npm run build`
Expected: `tsc -b && vite build` 全過（尚未使用新套件，建置應仍乾淨）。

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add papaparse, js-yaml, tsx for data import/export feature"
```

---

### Task 2: `dataStorage.ts` + 測試（TDD）

**Files:**
- Create: `src/lib/dataStorage.ts`
- Test: `tests/lib/dataStorage.test.ts`

- [ ] **Step 1: 寫 failing tests**

建立 `tests/lib/dataStorage.test.ts`：

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, Outfit, Scene, Pose, Expression, Composition } from '@/types';
import {
  StorageError,
  loadOutfits,
  saveOutfits,
  loadScenes,
  saveScenes,
  loadPoses,
  savePoses,
  loadExpressions,
  saveExpressions,
  loadCompositions,
  saveCompositions,
  loadCharacters,
  saveCharacters,
  loadActiveCharacterId,
  saveActiveCharacterId,
} from '@/lib/dataStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('dataStorage', () => {
  it('loadOutfits returns [] when key missing', () => {
    expect(loadOutfits()).toEqual([]);
  });

  it('loadOutfits round-trip via saveOutfits', () => {
    const items: Outfit[] = [{ code: 'O1', name: 'o1', prompt: 'p' }];
    saveOutfits(items);
    expect(loadOutfits()).toEqual(items);
  });

  it('loadOutfits returns [] when JSON is corrupt', () => {
    localStorage.setItem('prompt-tool:data:outfits', '{not json');
    expect(loadOutfits()).toEqual([]);
  });

  it('loadOutfits returns [] when stored value is not an array', () => {
    localStorage.setItem('prompt-tool:data:outfits', '{"a":1}');
    expect(loadOutfits()).toEqual([]);
  });

  it('saveOutfits throws StorageError when quota exceeds', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => saveOutfits([])).toThrow(StorageError);
    setItemSpy.mockRestore();
  });

  it('loadScenes / saveScenes round-trip', () => {
    const items: Scene[] = [{ code: 'S1', name: 's1', prompt: 'p', lighting_hint: 'h' }];
    saveScenes(items);
    expect(loadScenes()).toEqual(items);
  });

  it('loadPoses / savePoses round-trip preserves shot_suggestion array', () => {
    const items: Pose[] = [{ code: 'P1', name: 'p1', prompt: 'x', shot_suggestion: ['full_body', 'medium'] }];
    savePoses(items);
    expect(loadPoses()).toEqual(items);
  });

  it('loadExpressions / saveExpressions round-trip', () => {
    const items: Expression[] = [{ code: 'E1', name: 'e1', prompt: 'p' }];
    saveExpressions(items);
    expect(loadExpressions()).toEqual(items);
  });

  it('loadCompositions / saveCompositions round-trip', () => {
    const items: Composition[] = [
      { code: 'C1', name: 'c1', prompt: 'p', shot: 'close_up', angle: 'front' },
    ];
    saveCompositions(items);
    expect(loadCompositions()).toEqual(items);
  });

  it('loadCharacters returns {} when key missing', () => {
    expect(loadCharacters()).toEqual({});
  });

  it('loadCharacters / saveCharacters round-trip', () => {
    const map: Record<string, Character> = {
      'ACC-001': {
        character_id: 'ACC-001',
        display_name: 'Test',
        model: { base: 'b', lora: 'l', lora_weight_range: [0.7, 1.0], trigger_word: 't' },
        appearance: {
          face_type: 'oval',
          eye: 'brown',
          hair_default: 'black',
          hair_variations: ['bob'],
          skin_tone: 'fair',
          skin_hex: '#FFDDCC',
          body: 'slim',
          age_range: [20, 25],
        },
        signature_features: ['mole'],
        prohibited: ['tattoo'],
        personality: ['calm'],
        color_palette: { theme: 'warm', colors: ['beige'], usage: 'prompt_inject' },
      },
    };
    saveCharacters(map);
    expect(loadCharacters()).toEqual(map);
  });

  it('loadActiveCharacterId returns null when key missing', () => {
    expect(loadActiveCharacterId()).toBeNull();
  });

  it('loadActiveCharacterId / saveActiveCharacterId round-trip', () => {
    saveActiveCharacterId('ACC-001');
    expect(loadActiveCharacterId()).toBe('ACC-001');
  });

  it('saveActiveCharacterId(null) clears the key', () => {
    saveActiveCharacterId('ACC-001');
    saveActiveCharacterId(null);
    expect(loadActiveCharacterId()).toBeNull();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/lib/dataStorage.test.ts`
Expected: FAIL（模組 `@/lib/dataStorage` 不存在）。

- [ ] **Step 3: 實作 `src/lib/dataStorage.ts`**

```ts
import type {
  Character,
  Composition,
  Expression,
  Outfit,
  Pose,
  Scene,
} from '@/types';

const KEY_PREFIX = 'prompt-tool:data:';

export class StorageError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

function loadArray<T>(keySuffix: string): T[] {
  const raw = localStorage.getItem(KEY_PREFIX + keySuffix);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveArray<T>(keySuffix: string, items: T[]): void {
  try {
    localStorage.setItem(KEY_PREFIX + keySuffix, JSON.stringify(items));
  } catch (err) {
    throw new StorageError(
      `localStorage 寫入失敗：${keySuffix}`,
      err,
    );
  }
}

export const loadOutfits = (): Outfit[] => loadArray<Outfit>('outfits');
export const saveOutfits = (items: Outfit[]): void => saveArray('outfits', items);

export const loadScenes = (): Scene[] => loadArray<Scene>('scenes');
export const saveScenes = (items: Scene[]): void => saveArray('scenes', items);

export const loadPoses = (): Pose[] => loadArray<Pose>('poses');
export const savePoses = (items: Pose[]): void => saveArray('poses', items);

export const loadExpressions = (): Expression[] => loadArray<Expression>('expressions');
export const saveExpressions = (items: Expression[]): void => saveArray('expressions', items);

export const loadCompositions = (): Composition[] => loadArray<Composition>('compositions');
export const saveCompositions = (items: Composition[]): void => saveArray('compositions', items);

export function loadCharacters(): Record<string, Character> {
  const raw = localStorage.getItem(KEY_PREFIX + 'characters');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, Character>;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveCharacters(map: Record<string, Character>): void {
  try {
    localStorage.setItem(KEY_PREFIX + 'characters', JSON.stringify(map));
  } catch (err) {
    throw new StorageError('localStorage 寫入失敗：characters', err);
  }
}

export function loadActiveCharacterId(): string | null {
  const raw = localStorage.getItem(KEY_PREFIX + 'activeCharacterId');
  return raw && raw.length > 0 ? raw : null;
}

export function saveActiveCharacterId(id: string | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(KEY_PREFIX + 'activeCharacterId');
    } else {
      localStorage.setItem(KEY_PREFIX + 'activeCharacterId', id);
    }
  } catch (err) {
    throw new StorageError('localStorage 寫入失敗：activeCharacterId', err);
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/lib/dataStorage.test.ts`
Expected: PASS 全部 15 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/lib/dataStorage.ts tests/lib/dataStorage.test.ts
git commit -m "feat(dataStorage): add localStorage CRUD for 6 entity types"
```

---

### Task 3: CSV Schemas + Outfits Parser/Serializer（TDD）

**Files:**
- Create: `src/lib/csv/types.ts`
- Create: `src/lib/csv/schemas.ts`
- Create: `src/lib/csv/parseOutfits.ts`
- Create: `src/lib/csv/serializeOutfits.ts`
- Test: `tests/lib/csv/parseOutfits.test.ts`
- Test: `tests/lib/csv/serializeOutfits.test.ts`

- [ ] **Step 1: 建立共用 types（先於測試，因測試 import）**

Create `src/lib/csv/types.ts`：

```ts
export interface ParseError {
  line?: number;
  column?: string;
  message: string;
}

export type ParseResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; errors: ParseError[] };
```

- [ ] **Step 2: 建立 schemas.ts（全部 5 個 styles schema 一次到位）**

Create `src/lib/csv/schemas.ts`：

```ts
export const OUTFIT_SCHEMA = {
  kind: 'outfits',
  displayName: 'Outfits',
  columns: ['code', 'name', 'prompt'] as const,
  hint: '3 個欄位皆為字串',
  example: ['code,name,prompt', 'CAS-01,咖啡廳穿搭,"casual cafe outfit"'].join('\n'),
} as const;

export const SCENE_SCHEMA = {
  kind: 'scenes',
  displayName: 'Scenes',
  columns: ['code', 'name', 'prompt', 'lighting_hint'] as const,
  hint: '4 個欄位皆為字串',
  example: [
    'code,name,prompt,lighting_hint',
    'SCN-01,咖啡廳室內,"cozy cafe interior",warm side lighting',
  ].join('\n'),
} as const;

export const POSE_SCHEMA = {
  kind: 'poses',
  displayName: 'Poses',
  columns: ['code', 'name', 'prompt', 'shot_suggestion'] as const,
  hint: '4 個欄位；shot_suggestion 以 | 分隔（合法值：close_up, extreme_close_up, medium, three_quarter_body, full_body）',
  example: [
    'code,name,prompt,shot_suggestion',
    'POS-01,站姿,"standing, relaxed",full_body|three_quarter_body',
  ].join('\n'),
} as const;

export const EXPRESSION_SCHEMA = {
  kind: 'expressions',
  displayName: 'Expressions',
  columns: ['code', 'name', 'prompt'] as const,
  hint: '3 個欄位皆為字串',
  example: ['code,name,prompt', 'EXP-01,微笑,"gentle smile"'].join('\n'),
} as const;

export const COMPOSITION_SCHEMA = {
  kind: 'compositions',
  displayName: 'Compositions',
  columns: ['code', 'name', 'prompt', 'shot', 'angle'] as const,
  hint:
    'shot ∈ (close_up, extreme_close_up, medium, three_quarter_body, full_body)；' +
    'angle ∈ (front, profile, 45deg, three_quarter, low_up, high_down, over_shoulder)',
  example: [
    'code,name,prompt,shot,angle',
    'COMP-01,特寫正面,"close-up headshot",close_up,front',
  ].join('\n'),
} as const;

export const SHOT_VALUES = [
  'close_up',
  'extreme_close_up',
  'medium',
  'three_quarter_body',
  'full_body',
] as const;

export const ANGLE_VALUES = [
  'front',
  'profile',
  '45deg',
  'three_quarter',
  'low_up',
  'high_down',
  'over_shoulder',
] as const;
```

- [ ] **Step 3: 寫 failing tests for parseOutfits**

Create `tests/lib/csv/parseOutfits.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { parseOutfitsCsv } from '@/lib/csv/parseOutfits';

describe('parseOutfitsCsv', () => {
  it('parses a minimal valid CSV', () => {
    const csv = 'code,name,prompt\nCAS-01,咖啡廳穿搭,casual cafe outfit';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([
        { code: 'CAS-01', name: '咖啡廳穿搭', prompt: 'casual cafe outfit' },
      ]);
    }
  });

  it('parses multiple rows', () => {
    const csv = 'code,name,prompt\nO1,n1,p1\nO2,n2,p2';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(2);
    }
  });

  it('rejects when header column is missing', () => {
    const csv = 'code,name\nO1,n1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toMatch(/header|欄位/);
    }
  });

  it('rejects when header has extra column', () => {
    const csv = 'code,name,prompt,extra\nO1,n1,p1,x';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects when header order differs from schema', () => {
    const csv = 'name,code,prompt\nn1,O1,p1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects when required field is empty string', () => {
    const csv = 'code,name,prompt\n,n1,p1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].column).toBe('code');
    }
  });

  it('rejects duplicate code with both line numbers', () => {
    const csv = 'code,name,prompt\nO1,n1,p1\nO2,n2,p2\nO1,n3,p3';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0].message;
      expect(msg).toContain('O1');
      expect(msg).toContain('2');
      expect(msg).toContain('4');
    }
  });

  it('accepts BOM at start of input', () => {
    const csv = '\uFEFFcode,name,prompt\nO1,n1,p1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(true);
  });

  it('handles quoted fields with commas', () => {
    const csv = 'code,name,prompt\nO1,"a, b",p1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].name).toBe('a, b');
    }
  });
});
```

- [ ] **Step 4: 寫 failing tests for serializeOutfits**

Create `tests/lib/csv/serializeOutfits.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { serializeOutfitsCsv } from '@/lib/csv/serializeOutfits';
import { parseOutfitsCsv } from '@/lib/csv/parseOutfits';
import type { Outfit } from '@/types';

describe('serializeOutfitsCsv', () => {
  it('returns BOM + header only when items is empty', () => {
    const csv = serializeOutfitsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt');
  });

  it('round-trips: serialize → parse returns equivalent items', () => {
    const items: Outfit[] = [
      { code: 'O1', name: 'name with, comma', prompt: 'prompt "with quotes"' },
      { code: 'O2', name: 'n2', prompt: 'p2' },
    ];
    const csv = serializeOutfitsCsv(items);
    const parsed = parseOutfitsCsv(csv);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.items).toEqual(items);
    }
  });
});
```

- [ ] **Step 5: 執行測試確認失敗**

Run: `npm test -- tests/lib/csv/`
Expected: FAIL（模組不存在）。

- [ ] **Step 6: 實作 `src/lib/csv/parseOutfits.ts`**

```ts
import Papa from 'papaparse';
import type { Outfit } from '@/types';
import type { ParseError, ParseResult } from './types';
import { OUTFIT_SCHEMA } from './schemas';

export function parseOutfitsCsv(csvText: string): ParseResult<Outfit> {
  const errors: ParseError[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
  });

  for (const err of parsed.errors) {
    errors.push({ line: (err.row ?? 0) + 2, message: err.message });
  }

  const headers = parsed.meta.fields ?? [];
  const expected = OUTFIT_SCHEMA.columns;
  if (
    headers.length !== expected.length ||
    !expected.every((c, i) => headers[i] === c)
  ) {
    errors.push({
      message: `header 欄位必須為「${expected.join(',')}」，實際為「${headers.join(',')}」`,
    });
    return { ok: false, errors };
  }

  const items: Outfit[] = [];
  const codeLines = new Map<string, number[]>();

  parsed.data.forEach((row, idx) => {
    const line = idx + 2;
    for (const col of expected) {
      if (!row[col] || row[col].trim() === '') {
        errors.push({ line, column: col, message: `第 ${line} 行 ${col} 欄位為空` });
      }
    }
    const code = row.code?.trim() ?? '';
    if (code) {
      const list = codeLines.get(code) ?? [];
      list.push(line);
      codeLines.set(code, list);
    }
    items.push({
      code: row.code?.trim() ?? '',
      name: row.name ?? '',
      prompt: row.prompt ?? '',
    });
  });

  for (const [code, lines] of codeLines) {
    if (lines.length > 1) {
      errors.push({ message: `code "${code}" 在第 ${lines.join('、')} 行重複` });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, items };
}
```

- [ ] **Step 7: 實作 `src/lib/csv/serializeOutfits.ts`**

```ts
import Papa from 'papaparse';
import type { Outfit } from '@/types';
import { OUTFIT_SCHEMA } from './schemas';

export function serializeOutfitsCsv(items: Outfit[]): string {
  const csv = Papa.unparse({
    fields: [...OUTFIT_SCHEMA.columns],
    data: items.map((o) => [o.code, o.name, o.prompt]),
  });
  return '\uFEFF' + csv;
}
```

- [ ] **Step 8: 執行測試確認通過**

Run: `npm test -- tests/lib/csv/`
Expected: PASS 全部 11 個測試（9 parse + 2 serialize）。

- [ ] **Step 9: Commit**

```bash
git add src/lib/csv/ tests/lib/csv/
git commit -m "feat(csv): add schemas + Outfits parser/serializer"
```

---

### Task 4: Scenes Parser/Serializer（TDD）

**Files:**
- Create: `src/lib/csv/parseScenes.ts`
- Create: `src/lib/csv/serializeScenes.ts`
- Test: `tests/lib/csv/parseScenes.test.ts`
- Test: `tests/lib/csv/serializeScenes.test.ts`

- [ ] **Step 1: 寫 failing parse tests**

Create `tests/lib/csv/parseScenes.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { parseScenesCsv } from '@/lib/csv/parseScenes';

describe('parseScenesCsv', () => {
  it('parses a minimal valid CSV', () => {
    const csv = 'code,name,prompt,lighting_hint\nSCN-01,咖啡廳,cozy cafe,warm side lighting';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([
        { code: 'SCN-01', name: '咖啡廳', prompt: 'cozy cafe', lighting_hint: 'warm side lighting' },
      ]);
    }
  });

  it('rejects when lighting_hint is empty', () => {
    const csv = 'code,name,prompt,lighting_hint\nSCN-01,n,p,';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].column).toBe('lighting_hint');
    }
  });

  it('rejects when column missing', () => {
    const csv = 'code,name,prompt\nSCN-01,n,p';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate code', () => {
    const csv = 'code,name,prompt,lighting_hint\nS1,n,p,l\nS1,n2,p2,l2';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('parses multiple rows', () => {
    const csv = 'code,name,prompt,lighting_hint\nS1,n1,p1,l1\nS2,n2,p2,l2';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(2);
  });

  it('accepts BOM', () => {
    const csv = '\uFEFFcode,name,prompt,lighting_hint\nS1,n,p,l';
    expect(parseScenesCsv(csv).ok).toBe(true);
  });
});
```

- [ ] **Step 2: 寫 failing serialize tests**

Create `tests/lib/csv/serializeScenes.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { serializeScenesCsv } from '@/lib/csv/serializeScenes';
import { parseScenesCsv } from '@/lib/csv/parseScenes';
import type { Scene } from '@/types';

describe('serializeScenesCsv', () => {
  it('returns BOM + header when empty', () => {
    const csv = serializeScenesCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt,lighting_hint');
  });

  it('round-trips', () => {
    const items: Scene[] = [{ code: 'S1', name: 'n', prompt: 'p', lighting_hint: 'l' }];
    const parsed = parseScenesCsv(serializeScenesCsv(items));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npm test -- tests/lib/csv/parseScenes.test.ts tests/lib/csv/serializeScenes.test.ts`
Expected: FAIL。

- [ ] **Step 4: 實作 `src/lib/csv/parseScenes.ts`**

```ts
import Papa from 'papaparse';
import type { Scene } from '@/types';
import type { ParseError, ParseResult } from './types';
import { SCENE_SCHEMA } from './schemas';

export function parseScenesCsv(csvText: string): ParseResult<Scene> {
  const errors: ParseError[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
  });

  for (const err of parsed.errors) {
    errors.push({ line: (err.row ?? 0) + 2, message: err.message });
  }

  const headers = parsed.meta.fields ?? [];
  const expected = SCENE_SCHEMA.columns;
  if (
    headers.length !== expected.length ||
    !expected.every((c, i) => headers[i] === c)
  ) {
    errors.push({
      message: `header 欄位必須為「${expected.join(',')}」，實際為「${headers.join(',')}」`,
    });
    return { ok: false, errors };
  }

  const items: Scene[] = [];
  const codeLines = new Map<string, number[]>();

  parsed.data.forEach((row, idx) => {
    const line = idx + 2;
    for (const col of expected) {
      if (!row[col] || row[col].trim() === '') {
        errors.push({ line, column: col, message: `第 ${line} 行 ${col} 欄位為空` });
      }
    }
    const code = row.code?.trim() ?? '';
    if (code) {
      const list = codeLines.get(code) ?? [];
      list.push(line);
      codeLines.set(code, list);
    }
    items.push({
      code: row.code?.trim() ?? '',
      name: row.name ?? '',
      prompt: row.prompt ?? '',
      lighting_hint: row.lighting_hint ?? '',
    });
  });

  for (const [code, lines] of codeLines) {
    if (lines.length > 1) {
      errors.push({ message: `code "${code}" 在第 ${lines.join('、')} 行重複` });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, items };
}
```

- [ ] **Step 5: 實作 `src/lib/csv/serializeScenes.ts`**

```ts
import Papa from 'papaparse';
import type { Scene } from '@/types';
import { SCENE_SCHEMA } from './schemas';

export function serializeScenesCsv(items: Scene[]): string {
  const csv = Papa.unparse({
    fields: [...SCENE_SCHEMA.columns],
    data: items.map((s) => [s.code, s.name, s.prompt, s.lighting_hint]),
  });
  return '\uFEFF' + csv;
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `npm test -- tests/lib/csv/parseScenes.test.ts tests/lib/csv/serializeScenes.test.ts`
Expected: PASS 全部 8 個測試。

- [ ] **Step 7: Commit**

```bash
git add src/lib/csv/parseScenes.ts src/lib/csv/serializeScenes.ts tests/lib/csv/parseScenes.test.ts tests/lib/csv/serializeScenes.test.ts
git commit -m "feat(csv): add Scenes parser/serializer"
```

---

### Task 5: Poses Parser/Serializer（TDD，含 pipe 陣列）

**Files:**
- Create: `src/lib/csv/parsePoses.ts`
- Create: `src/lib/csv/serializePoses.ts`
- Test: `tests/lib/csv/parsePoses.test.ts`
- Test: `tests/lib/csv/serializePoses.test.ts`

- [ ] **Step 1: 寫 failing parse tests**

Create `tests/lib/csv/parsePoses.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { parsePosesCsv } from '@/lib/csv/parsePoses';

describe('parsePosesCsv', () => {
  it('parses a single-value shot_suggestion', () => {
    const csv = 'code,name,prompt,shot_suggestion\nPOS-01,站姿,"standing, relaxed",full_body';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].shot_suggestion).toEqual(['full_body']);
    }
  });

  it('parses multi-value shot_suggestion split by pipe', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,full_body|three_quarter_body';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].shot_suggestion).toEqual(['full_body', 'three_quarter_body']);
    }
  });

  it('rejects when shot_suggestion contains invalid value', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,portrait';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toContain('portrait');
    }
  });

  it('rejects when shot_suggestion has empty element between pipes', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,full_body||medium';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects when shot_suggestion is empty string', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate code', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,full_body\nP1,n2,p2,medium';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects column mismatch', () => {
    const csv = 'code,name,prompt\nP1,n,p';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('accepts BOM', () => {
    const csv = '\uFEFFcode,name,prompt,shot_suggestion\nP1,n,p,full_body';
    expect(parsePosesCsv(csv).ok).toBe(true);
  });
});
```

- [ ] **Step 2: 寫 failing serialize tests**

Create `tests/lib/csv/serializePoses.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { serializePosesCsv } from '@/lib/csv/serializePoses';
import { parsePosesCsv } from '@/lib/csv/parsePoses';
import type { Pose } from '@/types';

describe('serializePosesCsv', () => {
  it('returns BOM + header when empty', () => {
    const csv = serializePosesCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt,shot_suggestion');
  });

  it('round-trips single-value shot_suggestion', () => {
    const items: Pose[] = [{ code: 'P1', name: 'n', prompt: 'p', shot_suggestion: ['full_body'] }];
    const parsed = parsePosesCsv(serializePosesCsv(items));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });

  it('round-trips multi-value shot_suggestion with pipe join', () => {
    const items: Pose[] = [
      { code: 'P1', name: 'n', prompt: 'p', shot_suggestion: ['full_body', 'three_quarter_body'] },
    ];
    const csv = serializePosesCsv(items);
    expect(csv).toContain('full_body|three_quarter_body');
    const parsed = parsePosesCsv(csv);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npm test -- tests/lib/csv/parsePoses.test.ts tests/lib/csv/serializePoses.test.ts`
Expected: FAIL。

- [ ] **Step 4: 實作 `src/lib/csv/parsePoses.ts`**

```ts
import Papa from 'papaparse';
import type { Pose } from '@/types';
import type { ParseError, ParseResult } from './types';
import { POSE_SCHEMA, SHOT_VALUES } from './schemas';

export function parsePosesCsv(csvText: string): ParseResult<Pose> {
  const errors: ParseError[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
  });

  for (const err of parsed.errors) {
    errors.push({ line: (err.row ?? 0) + 2, message: err.message });
  }

  const headers = parsed.meta.fields ?? [];
  const expected = POSE_SCHEMA.columns;
  if (
    headers.length !== expected.length ||
    !expected.every((c, i) => headers[i] === c)
  ) {
    errors.push({
      message: `header 欄位必須為「${expected.join(',')}」，實際為「${headers.join(',')}」`,
    });
    return { ok: false, errors };
  }

  const items: Pose[] = [];
  const codeLines = new Map<string, number[]>();
  const shotSet = new Set<string>(SHOT_VALUES);

  parsed.data.forEach((row, idx) => {
    const line = idx + 2;
    for (const col of ['code', 'name', 'prompt', 'shot_suggestion'] as const) {
      if (!row[col] || row[col].trim() === '') {
        errors.push({ line, column: col, message: `第 ${line} 行 ${col} 欄位為空` });
      }
    }

    const suggestion = (row.shot_suggestion ?? '').split('|');
    const cleanSuggestion: string[] = [];
    for (const s of suggestion) {
      if (s === '') {
        errors.push({
          line,
          column: 'shot_suggestion',
          message: `第 ${line} 行 shot_suggestion 有空元素（相鄰 | 或尾端 |）`,
        });
        continue;
      }
      if (!shotSet.has(s)) {
        errors.push({
          line,
          column: 'shot_suggestion',
          message: `第 ${line} 行 shot_suggestion 值 "${s}" 不屬於 (${SHOT_VALUES.join(', ')})`,
        });
        continue;
      }
      cleanSuggestion.push(s);
    }

    const code = row.code?.trim() ?? '';
    if (code) {
      const list = codeLines.get(code) ?? [];
      list.push(line);
      codeLines.set(code, list);
    }

    items.push({
      code,
      name: row.name ?? '',
      prompt: row.prompt ?? '',
      shot_suggestion: cleanSuggestion,
    });
  });

  for (const [code, lines] of codeLines) {
    if (lines.length > 1) {
      errors.push({ message: `code "${code}" 在第 ${lines.join('、')} 行重複` });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, items };
}
```

- [ ] **Step 5: 實作 `src/lib/csv/serializePoses.ts`**

```ts
import Papa from 'papaparse';
import type { Pose } from '@/types';
import { POSE_SCHEMA } from './schemas';

export function serializePosesCsv(items: Pose[]): string {
  const csv = Papa.unparse({
    fields: [...POSE_SCHEMA.columns],
    data: items.map((p) => [p.code, p.name, p.prompt, p.shot_suggestion.join('|')]),
  });
  return '\uFEFF' + csv;
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `npm test -- tests/lib/csv/parsePoses.test.ts tests/lib/csv/serializePoses.test.ts`
Expected: PASS 全部 11 個測試。

- [ ] **Step 7: Commit**

```bash
git add src/lib/csv/parsePoses.ts src/lib/csv/serializePoses.ts tests/lib/csv/parsePoses.test.ts tests/lib/csv/serializePoses.test.ts
git commit -m "feat(csv): add Poses parser/serializer with pipe-separated shot_suggestion"
```

---

### Task 6: Expressions Parser/Serializer（TDD）

**Files:**
- Create: `src/lib/csv/parseExpressions.ts`
- Create: `src/lib/csv/serializeExpressions.ts`
- Test: `tests/lib/csv/parseExpressions.test.ts`
- Test: `tests/lib/csv/serializeExpressions.test.ts`

- [ ] **Step 1: 寫 failing parse tests**

Create `tests/lib/csv/parseExpressions.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { parseExpressionsCsv } from '@/lib/csv/parseExpressions';

describe('parseExpressionsCsv', () => {
  it('parses valid CSV', () => {
    const csv = 'code,name,prompt\nEXP-01,微笑,gentle smile';
    const result = parseExpressionsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([{ code: 'EXP-01', name: '微笑', prompt: 'gentle smile' }]);
    }
  });

  it('rejects column mismatch', () => {
    const csv = 'code,name\nE1,n';
    expect(parseExpressionsCsv(csv).ok).toBe(false);
  });

  it('rejects empty prompt', () => {
    const csv = 'code,name,prompt\nE1,n,';
    expect(parseExpressionsCsv(csv).ok).toBe(false);
  });

  it('rejects duplicate code', () => {
    const csv = 'code,name,prompt\nE1,n,p\nE1,n2,p2';
    expect(parseExpressionsCsv(csv).ok).toBe(false);
  });

  it('parses multiple rows', () => {
    const csv = 'code,name,prompt\nE1,n1,p1\nE2,n2,p2';
    const result = parseExpressionsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(2);
  });

  it('accepts BOM', () => {
    expect(parseExpressionsCsv('\uFEFFcode,name,prompt\nE1,n,p').ok).toBe(true);
  });
});
```

- [ ] **Step 2: 寫 failing serialize tests**

Create `tests/lib/csv/serializeExpressions.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { serializeExpressionsCsv } from '@/lib/csv/serializeExpressions';
import { parseExpressionsCsv } from '@/lib/csv/parseExpressions';
import type { Expression } from '@/types';

describe('serializeExpressionsCsv', () => {
  it('returns BOM + header when empty', () => {
    const csv = serializeExpressionsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt');
  });

  it('round-trips', () => {
    const items: Expression[] = [{ code: 'E1', name: 'n', prompt: 'p' }];
    const parsed = parseExpressionsCsv(serializeExpressionsCsv(items));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npm test -- tests/lib/csv/parseExpressions.test.ts tests/lib/csv/serializeExpressions.test.ts`
Expected: FAIL。

- [ ] **Step 4: 實作 `src/lib/csv/parseExpressions.ts`**

```ts
import Papa from 'papaparse';
import type { Expression } from '@/types';
import type { ParseError, ParseResult } from './types';
import { EXPRESSION_SCHEMA } from './schemas';

export function parseExpressionsCsv(csvText: string): ParseResult<Expression> {
  const errors: ParseError[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
  });

  for (const err of parsed.errors) {
    errors.push({ line: (err.row ?? 0) + 2, message: err.message });
  }

  const headers = parsed.meta.fields ?? [];
  const expected = EXPRESSION_SCHEMA.columns;
  if (
    headers.length !== expected.length ||
    !expected.every((c, i) => headers[i] === c)
  ) {
    errors.push({
      message: `header 欄位必須為「${expected.join(',')}」，實際為「${headers.join(',')}」`,
    });
    return { ok: false, errors };
  }

  const items: Expression[] = [];
  const codeLines = new Map<string, number[]>();

  parsed.data.forEach((row, idx) => {
    const line = idx + 2;
    for (const col of expected) {
      if (!row[col] || row[col].trim() === '') {
        errors.push({ line, column: col, message: `第 ${line} 行 ${col} 欄位為空` });
      }
    }
    const code = row.code?.trim() ?? '';
    if (code) {
      const list = codeLines.get(code) ?? [];
      list.push(line);
      codeLines.set(code, list);
    }
    items.push({
      code,
      name: row.name ?? '',
      prompt: row.prompt ?? '',
    });
  });

  for (const [code, lines] of codeLines) {
    if (lines.length > 1) {
      errors.push({ message: `code "${code}" 在第 ${lines.join('、')} 行重複` });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, items };
}
```

- [ ] **Step 5: 實作 `src/lib/csv/serializeExpressions.ts`**

```ts
import Papa from 'papaparse';
import type { Expression } from '@/types';
import { EXPRESSION_SCHEMA } from './schemas';

export function serializeExpressionsCsv(items: Expression[]): string {
  const csv = Papa.unparse({
    fields: [...EXPRESSION_SCHEMA.columns],
    data: items.map((e) => [e.code, e.name, e.prompt]),
  });
  return '\uFEFF' + csv;
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `npm test -- tests/lib/csv/parseExpressions.test.ts tests/lib/csv/serializeExpressions.test.ts`
Expected: PASS 全部 8 個測試。

- [ ] **Step 7: Commit**

```bash
git add src/lib/csv/parseExpressions.ts src/lib/csv/serializeExpressions.ts tests/lib/csv/parseExpressions.test.ts tests/lib/csv/serializeExpressions.test.ts
git commit -m "feat(csv): add Expressions parser/serializer"
```

---

### Task 7: Compositions Parser/Serializer（TDD，含 enum）

**Files:**
- Create: `src/lib/csv/parseCompositions.ts`
- Create: `src/lib/csv/serializeCompositions.ts`
- Test: `tests/lib/csv/parseCompositions.test.ts`
- Test: `tests/lib/csv/serializeCompositions.test.ts`

- [ ] **Step 1: 寫 failing parse tests**

Create `tests/lib/csv/parseCompositions.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { parseCompositionsCsv } from '@/lib/csv/parseCompositions';

describe('parseCompositionsCsv', () => {
  it('parses valid CSV', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,特寫,"close-up",close_up,front';
    const result = parseCompositionsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].shot).toBe('close_up');
      expect(result.items[0].angle).toBe('front');
    }
  });

  it('rejects invalid shot value', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,n,p,portrait,front';
    const result = parseCompositionsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toContain('portrait');
    }
  });

  it('rejects invalid angle value', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,n,p,close_up,sideways';
    const result = parseCompositionsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toContain('sideways');
    }
  });

  it('rejects when shot is empty', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,n,p,,front';
    expect(parseCompositionsCsv(csv).ok).toBe(false);
  });

  it('rejects column mismatch', () => {
    const csv = 'code,name,prompt,shot\nC1,n,p,close_up';
    expect(parseCompositionsCsv(csv).ok).toBe(false);
  });

  it('rejects duplicate code', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,n,p,close_up,front\nC1,n2,p2,medium,profile';
    expect(parseCompositionsCsv(csv).ok).toBe(false);
  });

  it('accepts BOM', () => {
    expect(parseCompositionsCsv('\uFEFFcode,name,prompt,shot,angle\nC1,n,p,close_up,front').ok).toBe(true);
  });
});
```

- [ ] **Step 2: 寫 failing serialize tests**

Create `tests/lib/csv/serializeCompositions.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { serializeCompositionsCsv } from '@/lib/csv/serializeCompositions';
import { parseCompositionsCsv } from '@/lib/csv/parseCompositions';
import type { Composition } from '@/types';

describe('serializeCompositionsCsv', () => {
  it('returns BOM + header when empty', () => {
    const csv = serializeCompositionsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt,shot,angle');
  });

  it('round-trips', () => {
    const items: Composition[] = [
      { code: 'C1', name: 'n', prompt: 'p', shot: 'full_body', angle: 'low_up' },
    ];
    const parsed = parseCompositionsCsv(serializeCompositionsCsv(items));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npm test -- tests/lib/csv/parseCompositions.test.ts tests/lib/csv/serializeCompositions.test.ts`
Expected: FAIL。

- [ ] **Step 4: 實作 `src/lib/csv/parseCompositions.ts`**

```ts
import Papa from 'papaparse';
import type { Composition, Shot, Angle } from '@/types';
import type { ParseError, ParseResult } from './types';
import { COMPOSITION_SCHEMA, SHOT_VALUES, ANGLE_VALUES } from './schemas';

export function parseCompositionsCsv(csvText: string): ParseResult<Composition> {
  const errors: ParseError[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
  });

  for (const err of parsed.errors) {
    errors.push({ line: (err.row ?? 0) + 2, message: err.message });
  }

  const headers = parsed.meta.fields ?? [];
  const expected = COMPOSITION_SCHEMA.columns;
  if (
    headers.length !== expected.length ||
    !expected.every((c, i) => headers[i] === c)
  ) {
    errors.push({
      message: `header 欄位必須為「${expected.join(',')}」，實際為「${headers.join(',')}」`,
    });
    return { ok: false, errors };
  }

  const items: Composition[] = [];
  const codeLines = new Map<string, number[]>();
  const shotSet = new Set<string>(SHOT_VALUES);
  const angleSet = new Set<string>(ANGLE_VALUES);

  parsed.data.forEach((row, idx) => {
    const line = idx + 2;
    for (const col of expected) {
      if (!row[col] || row[col].trim() === '') {
        errors.push({ line, column: col, message: `第 ${line} 行 ${col} 欄位為空` });
      }
    }
    const shot = (row.shot ?? '').trim();
    if (shot && !shotSet.has(shot)) {
      errors.push({
        line,
        column: 'shot',
        message: `第 ${line} 行 shot 值 "${shot}" 不屬於 (${SHOT_VALUES.join(', ')})`,
      });
    }
    const angle = (row.angle ?? '').trim();
    if (angle && !angleSet.has(angle)) {
      errors.push({
        line,
        column: 'angle',
        message: `第 ${line} 行 angle 值 "${angle}" 不屬於 (${ANGLE_VALUES.join(', ')})`,
      });
    }

    const code = row.code?.trim() ?? '';
    if (code) {
      const list = codeLines.get(code) ?? [];
      list.push(line);
      codeLines.set(code, list);
    }

    items.push({
      code,
      name: row.name ?? '',
      prompt: row.prompt ?? '',
      shot: shot as Shot,
      angle: angle as Angle,
    });
  });

  for (const [code, lines] of codeLines) {
    if (lines.length > 1) {
      errors.push({ message: `code "${code}" 在第 ${lines.join('、')} 行重複` });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, items };
}
```

- [ ] **Step 5: 實作 `src/lib/csv/serializeCompositions.ts`**

```ts
import Papa from 'papaparse';
import type { Composition } from '@/types';
import { COMPOSITION_SCHEMA } from './schemas';

export function serializeCompositionsCsv(items: Composition[]): string {
  const csv = Papa.unparse({
    fields: [...COMPOSITION_SCHEMA.columns],
    data: items.map((c) => [c.code, c.name, c.prompt, c.shot, c.angle]),
  });
  return '\uFEFF' + csv;
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `npm test -- tests/lib/csv/parseCompositions.test.ts tests/lib/csv/serializeCompositions.test.ts`
Expected: PASS 全部 9 個測試。

- [ ] **Step 7: Commit**

```bash
git add src/lib/csv/parseCompositions.ts src/lib/csv/serializeCompositions.ts tests/lib/csv/parseCompositions.test.ts tests/lib/csv/serializeCompositions.test.ts
git commit -m "feat(csv): add Compositions parser/serializer with Shot + Angle enums"
```

---

### Task 8: Character JSON Parser（TDD）

**Files:**
- Create: `src/lib/characters/parseCharacter.ts`
- Test: `tests/lib/characters/parseCharacter.test.ts`

- [ ] **Step 1: 寫 failing tests**

Create `tests/lib/characters/parseCharacter.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { parseCharactersJson } from '@/lib/characters/parseCharacter';

const valid = {
  character_id: 'ACC-001',
  display_name: 'Test',
  model: { base: 'b', lora: 'l', lora_weight_range: [0.7, 1.0], trigger_word: 't' },
  appearance: {
    face_type: 'oval',
    eye: 'brown',
    hair_default: 'black',
    hair_variations: ['bob'],
    skin_tone: 'fair',
    skin_hex: '#FFDDCC',
    body: 'slim',
    age_range: [20, 25],
  },
  signature_features: ['mole'],
  prohibited: ['tattoo'],
  personality: ['calm'],
  color_palette: { theme: 'warm', colors: ['beige'], usage: 'prompt_inject' },
};

describe('parseCharactersJson', () => {
  it('accepts a single character object and wraps into map', () => {
    const result = parseCharactersJson(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ 'ACC-001': valid });
    }
  });

  it('accepts a map of characters', () => {
    const input = { 'ACC-001': valid, 'ACC-002': { ...valid, character_id: 'ACC-002' } };
    const result = parseCharactersJson(JSON.stringify(input));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value)).toHaveLength(2);
    }
  });

  it('rejects non-JSON input', () => {
    const result = parseCharactersJson('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toMatch(/JSON/i);
    }
  });

  it('rejects missing character_id', () => {
    const { character_id, ...rest } = valid;
    const result = parseCharactersJson(JSON.stringify(rest));
    expect(result.ok).toBe(false);
  });

  it('rejects missing appearance.eye', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    delete clone.appearance.eye;
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toContain('appearance.eye');
    }
  });

  it('rejects age_range of wrong length', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    clone.appearance.age_range = [20];
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
  });

  it('rejects lora_weight_range of wrong length', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    clone.model.lora_weight_range = [0.7, 1.0, 1.2];
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
  });

  it('rejects signature_features that is not an array', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    clone.signature_features = 'mole';
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
  });

  it('rejects color_palette.usage outside the union', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    clone.color_palette.usage = 'wallpaper';
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
  });

  it('rejects map entry that is invalid (whole batch fails)', () => {
    const badClone = JSON.parse(JSON.stringify(valid));
    delete badClone.display_name;
    const input = { 'ACC-001': valid, 'ACC-002': badClone };
    const result = parseCharactersJson(JSON.stringify(input));
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/lib/characters/parseCharacter.test.ts`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作 `src/lib/characters/parseCharacter.ts`**

```ts
import type { Character } from '@/types';
import type { ParseError } from '@/lib/csv/types';

export type CharacterParseResult =
  | { ok: true; value: Record<string, Character> }
  | { ok: false; errors: ParseError[] };

const USAGE_VALUES = new Set(['outfit_filter_only', 'prompt_inject']);

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function isNumberTuple2(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number');
}

function validateCharacter(
  input: unknown,
  pathPrefix: string,
  errors: ParseError[],
): input is Character {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    errors.push({ message: `${pathPrefix} 必須為物件` });
    return false;
  }
  const c = input as Record<string, unknown>;

  const requireString = (k: string) => {
    if (!isString(c[k]) || (c[k] as string).length === 0) {
      errors.push({ message: `${pathPrefix} 缺少必填欄位 "${k}"` });
    }
  };
  requireString('character_id');
  requireString('display_name');

  const model = c.model as Record<string, unknown> | undefined;
  if (!model || typeof model !== 'object') {
    errors.push({ message: `${pathPrefix} 缺少必填欄位 "model"` });
  } else {
    for (const k of ['base', 'lora', 'trigger_word'] as const) {
      if (!isString(model[k])) {
        errors.push({ message: `${pathPrefix} 缺少必填欄位 "model.${k}"` });
      }
    }
    if (!isNumberTuple2(model.lora_weight_range)) {
      errors.push({
        message: `${pathPrefix} "model.lora_weight_range" 應為 [number, number]`,
      });
    }
  }

  const appearance = c.appearance as Record<string, unknown> | undefined;
  if (!appearance || typeof appearance !== 'object') {
    errors.push({ message: `${pathPrefix} 缺少必填欄位 "appearance"` });
  } else {
    for (const k of [
      'face_type',
      'eye',
      'hair_default',
      'skin_tone',
      'skin_hex',
      'body',
    ] as const) {
      if (!isString(appearance[k])) {
        errors.push({ message: `${pathPrefix} 缺少必填欄位 "appearance.${k}"` });
      }
    }
    if (!isStringArray(appearance.hair_variations)) {
      errors.push({
        message: `${pathPrefix} "appearance.hair_variations" 應為字串陣列`,
      });
    }
    if (!isNumberTuple2(appearance.age_range)) {
      errors.push({
        message: `${pathPrefix} "appearance.age_range" 應為 [number, number]`,
      });
    }
  }

  for (const k of ['signature_features', 'prohibited', 'personality'] as const) {
    if (!isStringArray(c[k])) {
      errors.push({ message: `${pathPrefix} "${k}" 應為字串陣列` });
    }
  }

  const cp = c.color_palette as Record<string, unknown> | undefined;
  if (!cp || typeof cp !== 'object') {
    errors.push({ message: `${pathPrefix} 缺少必填欄位 "color_palette"` });
  } else {
    if (!isString(cp.theme)) {
      errors.push({ message: `${pathPrefix} "color_palette.theme" 必須為字串` });
    }
    if (!isStringArray(cp.colors)) {
      errors.push({ message: `${pathPrefix} "color_palette.colors" 應為字串陣列` });
    }
    if (!isString(cp.usage) || !USAGE_VALUES.has(cp.usage as string)) {
      errors.push({
        message: `${pathPrefix} "color_palette.usage" 必須為 "outfit_filter_only" 或 "prompt_inject"`,
      });
    }
  }

  return errors.length === 0;
}

export function parseCharactersJson(jsonText: string): CharacterParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return { ok: false, errors: [{ message: `JSON 解析失敗：${(err as Error).message}` }] };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: [{ message: '根值必須為物件' }] };
  }

  const obj = parsed as Record<string, unknown>;
  const errors: ParseError[] = [];

  if (isString(obj.character_id)) {
    const startErrorCount = errors.length;
    validateCharacter(obj, 'character', errors);
    if (errors.length > startErrorCount) {
      return { ok: false, errors };
    }
    return { ok: true, value: { [obj.character_id as string]: obj as unknown as Character } };
  }

  const map: Record<string, Character> = {};
  for (const [key, value] of Object.entries(obj)) {
    const startErrorCount = errors.length;
    validateCharacter(value, `character[${key}]`, errors);
    if (errors.length === startErrorCount) {
      map[key] = value as Character;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: map };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/lib/characters/parseCharacter.test.ts`
Expected: PASS 全部 10 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/lib/characters/ tests/lib/characters/
git commit -m "feat(characters): add Character JSON parser with deep validation"
```

---

### Task 9: `useDataStore` Zustand Store（TDD）

**Files:**
- Create: `src/store/useDataStore.ts`
- Test: `tests/store/useDataStore.test.ts`

- [ ] **Step 1: 寫 failing tests**

Create `tests/store/useDataStore.test.ts`：

```ts
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDataStore } from '@/store/useDataStore';
import type { Character, Outfit } from '@/types';

const sampleCharacter: Character = {
  character_id: 'ACC-001',
  display_name: 'Test',
  model: { base: 'b', lora: 'l', lora_weight_range: [0.7, 1.0], trigger_word: 't' },
  appearance: {
    face_type: 'oval',
    eye: 'brown',
    hair_default: 'black',
    hair_variations: ['bob'],
    skin_tone: 'fair',
    skin_hex: '#FFDDCC',
    body: 'slim',
    age_range: [20, 25],
  },
  signature_features: ['mole'],
  prohibited: ['tattoo'],
  personality: ['calm'],
  color_palette: { theme: 'warm', colors: ['beige'], usage: 'prompt_inject' },
};

beforeEach(() => {
  localStorage.clear();
  useDataStore.getState().reloadFromStorage();
});

describe('useDataStore', () => {
  it('initial state reads from empty localStorage', () => {
    const { result } = renderHook(() => useDataStore());
    expect(result.current.outfits).toEqual([]);
    expect(result.current.charactersById).toEqual({});
    expect(result.current.activeCharacterId).toBeNull();
  });

  it('importOutfits updates state and writes to localStorage', () => {
    const items: Outfit[] = [{ code: 'O1', name: 'n', prompt: 'p' }];
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.importOutfits(items);
    });
    expect(result.current.outfits).toEqual(items);
    expect(JSON.parse(localStorage.getItem('prompt-tool:data:outfits') ?? '[]')).toEqual(items);
  });

  it('importCharacters replaces the whole map and writes to localStorage', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.importCharacters({ 'ACC-001': sampleCharacter });
    });
    expect(result.current.charactersById).toEqual({ 'ACC-001': sampleCharacter });
  });

  it('setActiveCharacterId writes to localStorage', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.setActiveCharacterId('ACC-001');
    });
    expect(result.current.activeCharacterId).toBe('ACC-001');
    expect(localStorage.getItem('prompt-tool:data:activeCharacterId')).toBe('ACC-001');
  });

  it('setActiveCharacterId(null) clears', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.setActiveCharacterId('ACC-001');
      result.current.setActiveCharacterId(null);
    });
    expect(result.current.activeCharacterId).toBeNull();
    expect(localStorage.getItem('prompt-tool:data:activeCharacterId')).toBeNull();
  });

  it('reloadFromStorage re-reads localStorage into state', () => {
    localStorage.setItem(
      'prompt-tool:data:outfits',
      JSON.stringify([{ code: 'O1', name: 'n', prompt: 'p' }]),
    );
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.reloadFromStorage();
    });
    expect(result.current.outfits).toHaveLength(1);
  });

  it('importScenes updates scenes state', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.importScenes([
        { code: 'S1', name: 'n', prompt: 'p', lighting_hint: 'l' },
      ]);
    });
    expect(result.current.scenes).toHaveLength(1);
  });

  it('importPoses / importExpressions / importCompositions update their states', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.importPoses([{ code: 'P1', name: 'n', prompt: 'p', shot_suggestion: ['full_body'] }]);
      result.current.importExpressions([{ code: 'E1', name: 'n', prompt: 'p' }]);
      result.current.importCompositions([{ code: 'C1', name: 'n', prompt: 'p', shot: 'close_up', angle: 'front' }]);
    });
    expect(result.current.poses).toHaveLength(1);
    expect(result.current.expressions).toHaveLength(1);
    expect(result.current.compositions).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/store/useDataStore.test.ts`
Expected: FAIL。

- [ ] **Step 3: 實作 `src/store/useDataStore.ts`**

```ts
import { create } from 'zustand';
import type {
  Character,
  Composition,
  Expression,
  Outfit,
  Pose,
  Scene,
} from '@/types';
import {
  loadActiveCharacterId,
  loadCharacters,
  loadCompositions,
  loadExpressions,
  loadOutfits,
  loadPoses,
  loadScenes,
  saveActiveCharacterId,
  saveCharacters,
  saveCompositions,
  saveExpressions,
  saveOutfits,
  savePoses,
  saveScenes,
} from '@/lib/dataStorage';

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
  importCharacters: (map: Record<string, Character>) => void;
  setActiveCharacterId: (id: string | null) => void;
  reloadFromStorage: () => void;
}

function initialState(): DataState {
  return {
    outfits: loadOutfits(),
    scenes: loadScenes(),
    poses: loadPoses(),
    expressions: loadExpressions(),
    compositions: loadCompositions(),
    charactersById: loadCharacters(),
    activeCharacterId: loadActiveCharacterId(),
  };
}

export const useDataStore = create<DataState & DataActions>((set) => ({
  ...initialState(),

  importOutfits: (items) => {
    saveOutfits(items);
    set({ outfits: items });
  },
  importScenes: (items) => {
    saveScenes(items);
    set({ scenes: items });
  },
  importPoses: (items) => {
    savePoses(items);
    set({ poses: items });
  },
  importExpressions: (items) => {
    saveExpressions(items);
    set({ expressions: items });
  },
  importCompositions: (items) => {
    saveCompositions(items);
    set({ compositions: items });
  },
  importCharacters: (map) => {
    saveCharacters(map);
    set({ charactersById: map });
  },
  setActiveCharacterId: (id) => {
    saveActiveCharacterId(id);
    set({ activeCharacterId: id });
  },
  reloadFromStorage: () => {
    set(initialState());
  },
}));
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/store/useDataStore.test.ts`
Expected: PASS 全部 8 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/store/useDataStore.ts tests/store/useDataStore.test.ts
git commit -m "feat(store): add useDataStore (Zustand) backed by dataStorage"
```

---

### Task 10: 遷移腳本

**Files:**
- Create: `scripts/export-yaml-to-csv.ts`
- Modify: `.gitignore`

- [ ] **Step 1: 更新 .gitignore**

Read current `.gitignore`，在檔尾加入（若不存在）：

```
tmp/
```

執行：
```bash
grep -q "^tmp/" .gitignore || echo "tmp/" >> .gitignore
```

Expected: `.gitignore` 新增一行 `tmp/`（已存在則無變動）。

- [ ] **Step 2: 實作 `scripts/export-yaml-to-csv.ts`**

Create `scripts/export-yaml-to-csv.ts`：

```ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import type {
  Character,
  Composition,
  Expression,
  Outfit,
  Pose,
  Scene,
} from '../src/types';
import { serializeOutfitsCsv } from '../src/lib/csv/serializeOutfits';
import { serializeScenesCsv } from '../src/lib/csv/serializeScenes';
import { serializePosesCsv } from '../src/lib/csv/serializePoses';
import { serializeExpressionsCsv } from '../src/lib/csv/serializeExpressions';
import { serializeCompositionsCsv } from '../src/lib/csv/serializeCompositions';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, '..');
const OUT_DIR = join(ROOT, 'tmp', 'migration');

function readYaml<T>(relPath: string): T {
  const full = join(ROOT, relPath);
  return yaml.load(readFileSync(full, 'utf-8')) as T;
}

function writeFile(name: string, content: string): void {
  const path = join(OUT_DIR, name);
  writeFileSync(path, content, 'utf-8');
  console.log(`  → ${path}`);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log('Exporting current YAML data to tmp/migration/...');

  const outfits = readYaml<Outfit[]>('src/data/styles/outfits.yaml') ?? [];
  writeFile('outfits.csv', serializeOutfitsCsv(outfits));

  const scenes = readYaml<Scene[]>('src/data/styles/scenes.yaml') ?? [];
  writeFile('scenes.csv', serializeScenesCsv(scenes));

  const poses = readYaml<Pose[]>('src/data/styles/poses.yaml') ?? [];
  writeFile('poses.csv', serializePosesCsv(poses));

  const expressions = readYaml<Expression[]>('src/data/styles/expressions.yaml') ?? [];
  writeFile('expressions.csv', serializeExpressionsCsv(expressions));

  const compositions = readYaml<Composition[]>('src/data/styles/compositions.yaml') ?? [];
  writeFile('compositions.csv', serializeCompositionsCsv(compositions));

  const charactersDir = join(ROOT, 'src/data/characters');
  const characterFiles = readdirSync(charactersDir).filter((f) => f.endsWith('.yaml'));
  const charactersMap: Record<string, Character> = {};
  for (const file of characterFiles) {
    const character = readYaml<Character>(`src/data/characters/${file}`);
    if (character && character.character_id) {
      charactersMap[character.character_id] = character;
    }
  }
  writeFile('characters.json', JSON.stringify(charactersMap, null, 2));

  console.log('\nDone. Save these files to a private backup location before emptying YAMLs.');
  console.log(`Summary: ${outfits.length} outfits, ${scenes.length} scenes, ${poses.length} poses,`);
  console.log(`         ${expressions.length} expressions, ${compositions.length} compositions,`);
  console.log(`         ${Object.keys(charactersMap).length} characters`);
}

main();
```

- [ ] **Step 3: 執行腳本並驗證輸出**

Run: `npx tsx scripts/export-yaml-to-csv.ts`

Expected 輸出類似：
```
Exporting current YAML data to tmp/migration/...
  → .../tmp/migration/outfits.csv
  → .../tmp/migration/scenes.csv
  → .../tmp/migration/poses.csv
  → .../tmp/migration/expressions.csv
  → .../tmp/migration/compositions.csv
  → .../tmp/migration/characters.json

Done. Save these files to a private backup location before emptying YAMLs.
Summary: N outfits, N scenes, ..., 1 characters
```

驗證：
```bash
ls -la tmp/migration/
```
應見 5 個 .csv + 1 .json。

- [ ] **Step 4: 驗證可 round-trip（重要）**

手動或在 node REPL 中讀一個 csv 回來 parse，確認能 roundtrip。或跑：
```bash
npm test -- tests/lib/csv/ tests/lib/characters/
```
所有 csv / character 測試仍 PASS。

- [ ] **Step 5: Commit 腳本與 .gitignore（但不要 commit tmp/ 內容）**

```bash
git add scripts/export-yaml-to-csv.ts .gitignore
git status  # 驗證 tmp/ 不在 staging
git commit -m "feat(scripts): add one-off YAML → CSV/JSON migration script"
```

---

### Task 11: 手動備份遷移輸出

**Files:**（無程式碼改動）

- [ ] **Step 1: 確認 `tmp/migration/` 內容完整**

```bash
ls -la tmp/migration/
wc -l tmp/migration/*.csv
cat tmp/migration/characters.json | head -20
```

應見 5 個 CSV（有資料）與 `characters.json`（含 ACC-001）。

- [ ] **Step 2: 複製到私人備份位置**

**這是手動步驟，不自動化。** 請把 `tmp/migration/` 整個資料夾複製到你選擇的私人位置（例如 `~/Dropbox/prompt-tool-backup/2026-04-19/` 或你另一個 private repo），並記錄該位置。

警告：Task 12 會清空原始 YAML 資料；**如果沒備份，資料就永久消失**。

確認完備份 ✓，才進 Task 12。

---

### Task 12: 原子重構 — dataLoader + App.tsx + 清空 YAML

**Files:**
- Modify: `src/lib/dataLoader.ts`
- Modify: `src/App.tsx`
- Modify: `src/data/styles/outfits.yaml`
- Modify: `src/data/styles/scenes.yaml`
- Modify: `src/data/styles/poses.yaml`
- Modify: `src/data/styles/expressions.yaml`
- Modify: `src/data/styles/compositions.yaml`
- Modify: `src/data/characters/ACC-001.yaml`

- [ ] **Step 1: 清空 5 個 styles YAML**

將以下 5 個檔案的內容替換為：

```yaml
[]
```

- `src/data/styles/outfits.yaml`
- `src/data/styles/scenes.yaml`
- `src/data/styles/poses.yaml`
- `src/data/styles/expressions.yaml`
- `src/data/styles/compositions.yaml`

- [ ] **Step 2: 清空 `src/data/characters/ACC-001.yaml`**

將整個檔案替換為：

```yaml
{}
```

- [ ] **Step 3: 改寫 `src/lib/dataLoader.ts`**

將檔案完整替換為：

```ts
import type { TierConstraints } from '@/types';
import tierConstraintsYaml from '@/data/rules/tier_constraints.yaml';

export function loadTierConstraints(): TierConstraints {
  return tierConstraintsYaml as TierConstraints;
}
```

刪除原本的 5 個 load styles 函式、`loadCharacter`、以及對應 5 + 1 YAML imports。`acc001Yaml` / `outfitsYaml` 等 symbol 一律移除。

- [ ] **Step 4: 改寫 `src/App.tsx`**

修改內容（以 diff 描述）：

4a) imports 區把原本的 `loadCharacter, loadCompositions, loadExpressions, loadOutfits, loadPoses, loadScenes, loadTierConstraints` 改為：

```ts
import { loadTierConstraints } from '@/lib/dataLoader';
import { useDataStore } from '@/store/useDataStore';
```

4b) 移除第 87-92 行的：

```ts
const character = loadCharacter('ACC-001');
const outfits = loadOutfits();
const scenes = loadScenes();
const poses = loadPoses();
const expressions = loadExpressions();
const compositions = loadCompositions();
```

替換為：

```ts
const outfits = useDataStore((s) => s.outfits);
const scenes = useDataStore((s) => s.scenes);
const poses = useDataStore((s) => s.poses);
const expressions = useDataStore((s) => s.expressions);
const compositions = useDataStore((s) => s.compositions);
const charactersById = useDataStore((s) => s.charactersById);
const activeCharacterId = useDataStore((s) => s.activeCharacterId);
const character = activeCharacterId ? charactersById[activeCharacterId] : undefined;
```

4c) 在 `return (` 之前、所有 handler 定義**之後**，加入空態與按鈕 disable 計算：

```ts
const canAddOrder =
  outfits.length > 0 &&
  scenes.length > 0 &&
  poses.length > 0 &&
  expressions.length > 0;

if (!character) {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-3xl font-bold text-slate-100">AI 虛擬網紅提示詞產生器</h1>
          <p className="mt-2 text-sm text-slate-400">尚未匯入角色資料（Sub-plan B 將加入匯入介面）</p>
        </header>
        <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
          資料層已就緒，但 UI 匯入介面尚未實作。請先等 Sub-plan B 完成，或在 devtools 以
          <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-xs text-slate-200">
            useDataStore.getState().importCharacters(...)
          </code>
          手動注入資料進行驗證。
        </section>
      </div>
    </div>
  );
}
```

4d) 將既有 `+ 新增工單` 按鈕改為使用 `canAddOrder`：

把既有：
```tsx
<button
  type="button"
  onClick={handleAddBlankOrder}
  className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
>
  + 新增工單
</button>
```

改為：
```tsx
<button
  type="button"
  onClick={handleAddBlankOrder}
  disabled={!canAddOrder}
  className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50"
>
  + 新增工單
</button>
```

4e) `handleAddBlankOrder` 的內部仍使用 `outfits[0].code` 等，這在 `canAddOrder` 為 true 時才會被觸發，不需要額外保護。但為安全起見，在函式最上方加：

```ts
function handleAddBlankOrder() {
  if (!canAddOrder) return;
  addOrder({
    outfit: outfits[0].code,
    ...
  });
}
```

- [ ] **Step 5: 全量 build + 測試**

Run: `npm run build && npm test`

Expected：
- `tsc -b` 無誤；Vite build 成功
- 全部測試 PASS（既有 + 新增約 170 個）

- [ ] **Step 6: 手動煙霧測試**

```bash
npm run dev
```

瀏覽器開啟後：
- 若 localStorage 空（首次）→ 見「尚未匯入角色資料」空態 header 與中央虛線區塊
- 若 localStorage 含舊 prompt-tool 資料 → 可能直接正常運作（測 devtools 手動清空驗空態）
- 可選：devtools 執行：
  ```js
  const json = await fetch('/tmp/migration/characters.json').then(r => r.json()); // 或從你備份 paste
  // 手動注入驗證（非正式流程）
  ```
  非必要，但可作為 Task 12 的額外確認。

- [ ] **Step 7: Commit 原子變更**

```bash
git add src/lib/dataLoader.ts src/App.tsx src/data/styles/ src/data/characters/
git commit -m "refactor(data): move styles + characters to localStorage (Sub-plan A)"
```

---

## Self-Review

### 1. Spec coverage 逐條

| Spec 鎖定前提 | Plan 對應 |
|---|---|
| 1. 動機：資料不進 git | Task 12 清空 YAML |
| 2. 範圍：styles + characters | Task 3-8 parsers + Task 12 |
| 3. 格式：CSV + JSON | Task 3-7 CSV + Task 8 JSON |
| 4. UI：Data Manager modal | **Sub-plan B**（本 plan 不含） |
| 5. Replace + 確認提示 | Task 9 store actions 是 replace 語義；確認 UI 在 Sub-plan B |
| 6. 全或無驗證 | Task 3-8 每個 parser 都是驗證失敗就 reject |
| 7. 多角色 | Task 2/9 `charactersById` Map + `activeCharacterId` |
| 8. Pipe 陣列 | Task 5 Poses parser/serializer |
| 9. papaparse | Task 1 install + Task 3-7 使用 |
| 10. 遷移腳本 | Task 10 + 11 |
| 11. localStorage 引擎 | Task 2 dataStorage |
| 12. dataLoader 處理 | Task 12 Step 3 |
| 13. YAML 留空不 delete | Task 12 Step 1-2 |
| 14. CharacterPicker 位置 | **Sub-plan B** |

本 Sub-plan A 明確不含「UI 變動」（CharacterPicker、DataManagerModal、ImportEntityModal），這些屬於 Sub-plan B；Task 12 的 App.tsx 僅做「最小維持編譯 + 空態降級」的改動。

### 2. Placeholder scan

無 TBD / TODO / 「similar to」/「implement later」。每個 step 皆附完整程式碼或命令。

### 3. Type consistency

- `ParseResult<T>` / `ParseError` 定義於 Task 3 `types.ts`，Task 3-7 parsers 全部引用一致
- `StorageError` 定義於 Task 2，Task 9 store 未重新定義（依賴 dataStorage 拋出，store 允許 propagate 給 UI）
- `CharacterParseResult` 定義於 Task 8，Sub-plan B 的 UI 會引用
- `useDataStore` 的 action 簽名（`importOutfits(items: Outfit[])` 等）在 Task 9 定義，Sub-plan B 的 ImportEntityModal 會呼叫

### 4. 特別說明

本 plan 的 Task 11 是**人工步驟**（備份）而非自動化，這是故意的安全閘：實作階段應嚴格要求執行者停下來手動備份，不可跳過。
