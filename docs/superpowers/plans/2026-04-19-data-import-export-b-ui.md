# Styles / Characters 資料匯入匯出 — Sub-plan B：UI 整合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加上 `DataManagerModal`、`ImportEntityModal`、`CharacterPicker` 與 `App.tsx` header 整合，讓使用者透過 UI 匯入 / 匯出 CSV / JSON 至 localStorage、切換多角色；本 plan 完成後 Sub-plan A 的空態 placeholder 被正式 UI 取代。

**Architecture:** 新增 `entityRegistry.ts` 集中管理 6 entity 的 metadata；`downloadFile.ts` / `readFileAsText.ts` 為小工具；3 個元件（CharacterPicker / ImportEntityModal / DataManagerModal）分層組合；App.tsx header 新增資料管理 icon 與 CharacterPicker、清掉 Sub-plan A 的 devtools hint。

**Tech Stack:** React 19, TypeScript, Tailwind 3, Zustand 5, react-select 5, vitest, @testing-library/react, @testing-library/user-event。

Spec: `docs/superpowers/specs/2026-04-19-data-import-export-design.md`
Prerequisite: Sub-plan A 已完成（分支 `feat/data-import-export`, HEAD `f9f18a8` 或更新）

---

## File Structure

### 新增

| 檔案 | 用途 |
|---|---|
| `src/lib/downloadFile.ts` | Blob → browser download 小工具 |
| `src/lib/readFileAsText.ts` | `File` → text 字串（Promise 包裝 FileReader） |
| `src/lib/entityRegistry.ts` | 6 個 entity 的 metadata 集中 lookup（displayName / hint / example / format / downloadName / mimeType / fileAccept） |
| `src/components/CharacterPicker.tsx` | react-select 驅動的角色下拉 + 自動 fallback |
| `src/components/ImportEntityModal.tsx` | 共用的匯入 modal（CSV / JSON 依 kind 切換），含上傳 / 貼上、schema hint、確認對話框 |
| `src/components/DataManagerModal.tsx` | 頂層資料管理 modal，列 6 entity rows |
| `tests/lib/downloadFile.test.ts` | `downloadFile` 測試 |
| `tests/lib/readFileAsText.test.ts` | `readFileAsText` 測試 |
| `tests/lib/entityRegistry.test.ts` | 設定合約測試 |
| `tests/components/CharacterPicker.test.tsx` | CharacterPicker 測試 |
| `tests/components/ImportEntityModal.test.tsx` | ImportEntityModal 測試 |
| `tests/components/DataManagerModal.test.tsx` | DataManagerModal 測試 |

### 修改

| 檔案 | 修改內容 |
|---|---|
| `src/App.tsx` | header 加資料管理 icon + CharacterPicker；移除 Sub-plan A 的空態 devtools hint（改為真正的空態指向資料管理 modal）；清理舊註解 |

### 不動

- 所有 Sub-plan A 交付：`dataStorage.ts`、`useDataStore.ts`、5 個 csv parser/serializer、`parseCharacter.ts`、`entityRegistry` 以外的 schemas
- `ConfirmDialog.tsx`（重用既有）
- `CompPicker.tsx`、`SettingsModal.tsx`、`OrderInput.tsx`、`PromptCard.tsx`
- `src/data/rules/tier_constraints.yaml`

---

### Task 1: `downloadFile` 與 `readFileAsText` 小工具（TDD）

**Files:**
- Create: `src/lib/downloadFile.ts`
- Create: `src/lib/readFileAsText.ts`
- Test: `tests/lib/downloadFile.test.ts`
- Test: `tests/lib/readFileAsText.test.ts`

- [ ] **Step 1: 寫 failing tests — `downloadFile`**

Create `tests/lib/downloadFile.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from '@/lib/downloadFile';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadFile', () => {
  it('creates a Blob with correct MIME, triggers click, revokes URL', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadFile({ content: 'hello', filename: 'test.csv', mimeType: 'text/csv;charset=utf-8' });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('uses the provided filename on the download attribute', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let capturedAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedAnchor = this;
    });

    downloadFile({ content: '{}', filename: 'characters.json', mimeType: 'application/json' });

    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toBe('characters.json');
  });
});
```

- [ ] **Step 2: 寫 failing tests — `readFileAsText`**

Create `tests/lib/readFileAsText.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { readFileAsText } from '@/lib/readFileAsText';

describe('readFileAsText', () => {
  it('resolves with file text content', async () => {
    const file = new File(['hello,world'], 'test.csv', { type: 'text/csv' });
    const text = await readFileAsText(file);
    expect(text).toBe('hello,world');
  });

  it('resolves with UTF-8 content including Chinese', async () => {
    const file = new File(['咖啡廳,cafe'], 'test.csv', { type: 'text/csv' });
    const text = await readFileAsText(file);
    expect(text).toBe('咖啡廳,cafe');
  });
});
```

- [ ] **Step 3: Run → expect FAIL**

Run: `pnpm test -- tests/lib/downloadFile tests/lib/readFileAsText`
Expected: FAIL（modules do not exist）。

- [ ] **Step 4: Implement `src/lib/downloadFile.ts`**

```ts
interface DownloadOptions {
  content: string;
  filename: string;
  mimeType: string;
}

export function downloadFile({ content, filename, mimeType }: DownloadOptions): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 5: Implement `src/lib/readFileAsText.ts`**

```ts
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('File content is not a string'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsText(file, 'utf-8');
  });
}
```

- [ ] **Step 6: Run → expect PASS**

Run: `pnpm test -- tests/lib/downloadFile tests/lib/readFileAsText`
Expected: PASS 4 tests (2 each)。

- [ ] **Step 7: Commit**

```bash
git add src/lib/downloadFile.ts src/lib/readFileAsText.ts tests/lib/downloadFile.test.ts tests/lib/readFileAsText.test.ts
git commit -m "feat(lib): add downloadFile + readFileAsText helpers"
```

---

### Task 2: `entityRegistry.ts` — 6 entity metadata lookup（TDD，contract test only）

**Files:**
- Create: `src/lib/entityRegistry.ts`
- Test: `tests/lib/entityRegistry.test.ts`

- [ ] **Step 1: 寫 failing tests**

Create `tests/lib/entityRegistry.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { ENTITY_KINDS, ENTITY_METADATA, type EntityKind } from '@/lib/entityRegistry';

describe('entityRegistry', () => {
  it('exports all 6 entity kinds', () => {
    expect(ENTITY_KINDS).toEqual([
      'outfits',
      'scenes',
      'poses',
      'expressions',
      'compositions',
      'characters',
    ]);
  });

  it('every kind has a metadata entry with all required fields', () => {
    for (const kind of ENTITY_KINDS) {
      const meta = ENTITY_METADATA[kind];
      expect(meta.displayName).toBeTruthy();
      expect(meta.hint).toBeTruthy();
      expect(meta.example).toBeTruthy();
      expect(meta.downloadName).toBeTruthy();
      expect(meta.mimeType).toBeTruthy();
      expect(meta.fileAccept).toBeTruthy();
      expect(['csv', 'json']).toContain(meta.format);
    }
  });

  it('5 styles entities use csv format, characters uses json', () => {
    expect(ENTITY_METADATA.outfits.format).toBe('csv');
    expect(ENTITY_METADATA.scenes.format).toBe('csv');
    expect(ENTITY_METADATA.poses.format).toBe('csv');
    expect(ENTITY_METADATA.expressions.format).toBe('csv');
    expect(ENTITY_METADATA.compositions.format).toBe('csv');
    expect(ENTITY_METADATA.characters.format).toBe('json');
  });

  it('csv entities set mimeType to text/csv and fileAccept to .csv', () => {
    const csvKinds: EntityKind[] = ['outfits', 'scenes', 'poses', 'expressions', 'compositions'];
    for (const kind of csvKinds) {
      expect(ENTITY_METADATA[kind].mimeType).toBe('text/csv;charset=utf-8');
      expect(ENTITY_METADATA[kind].fileAccept).toBe('.csv');
    }
  });

  it('characters sets mimeType to application/json and fileAccept to .json', () => {
    expect(ENTITY_METADATA.characters.mimeType).toBe('application/json');
    expect(ENTITY_METADATA.characters.fileAccept).toBe('.json');
  });

  it('downloadName matches format', () => {
    expect(ENTITY_METADATA.outfits.downloadName).toBe('outfits.csv');
    expect(ENTITY_METADATA.scenes.downloadName).toBe('scenes.csv');
    expect(ENTITY_METADATA.poses.downloadName).toBe('poses.csv');
    expect(ENTITY_METADATA.expressions.downloadName).toBe('expressions.csv');
    expect(ENTITY_METADATA.compositions.downloadName).toBe('compositions.csv');
    expect(ENTITY_METADATA.characters.downloadName).toBe('characters.json');
  });
});
```

- [ ] **Step 2: Run → expect FAIL**

Run: `pnpm test -- tests/lib/entityRegistry`
Expected: FAIL (module missing)。

- [ ] **Step 3: Implement `src/lib/entityRegistry.ts`**

```ts
import {
  COMPOSITION_SCHEMA,
  EXPRESSION_SCHEMA,
  OUTFIT_SCHEMA,
  POSE_SCHEMA,
  SCENE_SCHEMA,
} from '@/lib/csv/schemas';

export type EntityKind =
  | 'outfits'
  | 'scenes'
  | 'poses'
  | 'expressions'
  | 'compositions'
  | 'characters';

export const ENTITY_KINDS: readonly EntityKind[] = [
  'outfits',
  'scenes',
  'poses',
  'expressions',
  'compositions',
  'characters',
] as const;

interface EntityMetadata {
  displayName: string;
  format: 'csv' | 'json';
  hint: string;
  example: string;
  downloadName: string;
  mimeType: string;
  fileAccept: string;
}

const CHARACTERS_HINT =
  'JSON 物件：單一 character（`{character_id, display_name, model, appearance, signature_features, prohibited, personality, color_palette}`）' +
  '或以 character_id 為 key 的 map；所有欄位必填，tuple 長度需正確。';

const CHARACTERS_EXAMPLE = JSON.stringify(
  {
    'ACC-001': {
      character_id: 'ACC-001',
      display_name: 'Example',
      model: {
        base: 'base_model',
        lora: 'lora.safetensors',
        lora_weight_range: [0.7, 1.0],
        trigger_word: 'example_trigger',
      },
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
      signature_features: ['example_feature'],
      prohibited: ['example_prohibited'],
      personality: ['calm'],
      color_palette: { theme: 'warm', colors: ['beige'], usage: 'prompt_inject' },
    },
  },
  null,
  2,
);

export const ENTITY_METADATA: Record<EntityKind, EntityMetadata> = {
  outfits: {
    displayName: OUTFIT_SCHEMA.displayName,
    format: 'csv',
    hint: OUTFIT_SCHEMA.hint,
    example: OUTFIT_SCHEMA.example,
    downloadName: 'outfits.csv',
    mimeType: 'text/csv;charset=utf-8',
    fileAccept: '.csv',
  },
  scenes: {
    displayName: SCENE_SCHEMA.displayName,
    format: 'csv',
    hint: SCENE_SCHEMA.hint,
    example: SCENE_SCHEMA.example,
    downloadName: 'scenes.csv',
    mimeType: 'text/csv;charset=utf-8',
    fileAccept: '.csv',
  },
  poses: {
    displayName: POSE_SCHEMA.displayName,
    format: 'csv',
    hint: POSE_SCHEMA.hint,
    example: POSE_SCHEMA.example,
    downloadName: 'poses.csv',
    mimeType: 'text/csv;charset=utf-8',
    fileAccept: '.csv',
  },
  expressions: {
    displayName: EXPRESSION_SCHEMA.displayName,
    format: 'csv',
    hint: EXPRESSION_SCHEMA.hint,
    example: EXPRESSION_SCHEMA.example,
    downloadName: 'expressions.csv',
    mimeType: 'text/csv;charset=utf-8',
    fileAccept: '.csv',
  },
  compositions: {
    displayName: COMPOSITION_SCHEMA.displayName,
    format: 'csv',
    hint: COMPOSITION_SCHEMA.hint,
    example: COMPOSITION_SCHEMA.example,
    downloadName: 'compositions.csv',
    mimeType: 'text/csv;charset=utf-8',
    fileAccept: '.csv',
  },
  characters: {
    displayName: 'Characters',
    format: 'json',
    hint: CHARACTERS_HINT,
    example: CHARACTERS_EXAMPLE,
    downloadName: 'characters.json',
    mimeType: 'application/json',
    fileAccept: '.json',
  },
};
```

- [ ] **Step 4: Run → expect PASS**

Run: `pnpm test -- tests/lib/entityRegistry`
Expected: PASS 6 tests。

- [ ] **Step 5: Commit**

```bash
git add src/lib/entityRegistry.ts tests/lib/entityRegistry.test.ts
git commit -m "feat(lib): add entityRegistry with metadata for all 6 entity kinds"
```

---

### Task 3: `CharacterPicker` 元件（TDD）

**Files:**
- Create: `src/components/CharacterPicker.tsx`
- Test: `tests/components/CharacterPicker.test.tsx`

- [ ] **Step 1: 寫 failing tests**

Create `tests/components/CharacterPicker.test.tsx`：

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterPicker } from '@/components/CharacterPicker';
import { useDataStore } from '@/store/useDataStore';
import type { Character } from '@/types';

const sampleA: Character = {
  character_id: 'ACC-001',
  display_name: '角色 A',
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
  signature_features: ['f'],
  prohibited: ['p'],
  personality: ['calm'],
  color_palette: { theme: 'warm', colors: ['beige'], usage: 'prompt_inject' },
};
const sampleB: Character = { ...sampleA, character_id: 'ACC-002', display_name: '角色 B' };

beforeEach(() => {
  localStorage.clear();
  act(() => {
    useDataStore.setState({
      charactersById: {},
      activeCharacterId: null,
    });
  });
});

describe('CharacterPicker', () => {
  it('shows empty-state prompt when charactersById is empty', () => {
    render(<CharacterPicker />);
    expect(screen.getByText(/尚未匯入角色/)).toBeInTheDocument();
  });

  it('renders character options by display_name when data exists', async () => {
    act(() => {
      useDataStore.setState({
        charactersById: { 'ACC-001': sampleA, 'ACC-002': sampleB },
        activeCharacterId: 'ACC-001',
      });
    });
    render(<CharacterPicker />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByText('角色 A')).toBeInTheDocument();
    expect(screen.getByText('角色 B')).toBeInTheDocument();
  });

  it('calls setActiveCharacterId when user picks another character', async () => {
    act(() => {
      useDataStore.setState({
        charactersById: { 'ACC-001': sampleA, 'ACC-002': sampleB },
        activeCharacterId: 'ACC-001',
      });
    });
    const setSpy = vi.spyOn(useDataStore.getState(), 'setActiveCharacterId');
    render(<CharacterPicker />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('角色 B'));
    expect(setSpy).toHaveBeenCalledWith('ACC-002');
  });

  it('auto-fallbacks to first character when activeCharacterId points to missing', () => {
    const setSpy = vi.fn();
    act(() => {
      useDataStore.setState({
        charactersById: { 'ACC-001': sampleA, 'ACC-002': sampleB },
        activeCharacterId: 'ACC-999',
        setActiveCharacterId: setSpy,
      });
    });
    render(<CharacterPicker />);
    expect(setSpy).toHaveBeenCalledWith('ACC-001');
  });

  it('auto-fallbacks to first character when activeCharacterId is null but data exists', () => {
    const setSpy = vi.fn();
    act(() => {
      useDataStore.setState({
        charactersById: { 'ACC-001': sampleA },
        activeCharacterId: null,
        setActiveCharacterId: setSpy,
      });
    });
    render(<CharacterPicker />);
    expect(setSpy).toHaveBeenCalledWith('ACC-001');
  });
});
```

- [ ] **Step 2: Run → expect FAIL**

Run: `pnpm test -- tests/components/CharacterPicker`
Expected: FAIL (component missing)。

- [ ] **Step 3: Implement `src/components/CharacterPicker.tsx`**

```tsx
import { useEffect } from 'react';
import Select, { type SingleValue } from 'react-select';
import { useDataStore } from '@/store/useDataStore';

interface Option {
  value: string;
  label: string;
}

export function CharacterPicker() {
  const charactersById = useDataStore((s) => s.charactersById);
  const activeCharacterId = useDataStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useDataStore((s) => s.setActiveCharacterId);

  const ids = Object.keys(charactersById);
  const firstId = ids[0] ?? null;

  useEffect(() => {
    if (ids.length === 0) return;
    if (activeCharacterId === null || !charactersById[activeCharacterId]) {
      if (firstId !== null) {
        setActiveCharacterId(firstId);
      }
    }
  }, [charactersById, activeCharacterId, firstId, ids.length, setActiveCharacterId]);

  if (ids.length === 0) {
    return (
      <p className="text-sm text-slate-400">尚未匯入角色資料，請從右上角「資料管理」匯入。</p>
    );
  }

  const options: Option[] = ids.map((id) => ({
    value: id,
    label: charactersById[id].display_name,
  }));
  const current = options.find((o) => o.value === activeCharacterId) ?? null;

  return (
    <Select<Option, false>
      options={options}
      value={current}
      onChange={(next: SingleValue<Option>) => {
        if (next) setActiveCharacterId(next.value);
      }}
      isClearable={false}
      placeholder="選擇角色…"
      aria-label="角色選擇"
      unstyled
      classNames={{
        control: ({ isFocused }) =>
          `rounded border px-2 py-1 text-sm transition ${
            isFocused ? 'border-blue-500' : 'border-slate-700'
          } bg-slate-950 min-w-[180px]`,
        valueContainer: () => 'gap-1',
        placeholder: () => 'text-slate-500',
        singleValue: () => 'text-slate-100',
        input: () => 'text-slate-100',
        indicatorsContainer: () => 'text-slate-400',
        dropdownIndicator: () => 'px-1 hover:text-slate-200',
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
      }}
    />
  );
}
```

- [ ] **Step 4: Run → expect PASS**

Run: `pnpm test -- tests/components/CharacterPicker`
Expected: PASS 5 tests。

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterPicker.tsx tests/components/CharacterPicker.test.tsx
git commit -m "feat(CharacterPicker): add multi-character selector with auto-fallback"
```

---

### Task 4: `ImportEntityModal` 元件（TDD）

**Files:**
- Create: `src/components/ImportEntityModal.tsx`
- Test: `tests/components/ImportEntityModal.test.tsx`

- [ ] **Step 1: 寫 failing tests**

Create `tests/components/ImportEntityModal.test.tsx`：

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportEntityModal } from '@/components/ImportEntityModal';
import { useDataStore } from '@/store/useDataStore';

beforeEach(() => {
  localStorage.clear();
  act(() => {
    useDataStore.setState({
      outfits: [],
      scenes: [],
      poses: [],
      expressions: [],
      compositions: [],
      charactersById: {},
      activeCharacterId: null,
    });
  });
});

describe('ImportEntityModal', () => {
  it('renders title and schema hint matching entity kind', () => {
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/匯入\s*Outfits/)).toBeInTheDocument();
    expect(screen.getByText(/3 個欄位皆為字串/)).toBeInTheDocument();
  });

  it('pastes valid CSV and imports when no existing data (no confirm dialog)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={onClose} />);
    await user.type(
      screen.getByLabelText('貼上內容'),
      'code,name,prompt\nO1,n1,p1',
    );
    await user.click(screen.getByRole('button', { name: '匯入' }));
    await waitFor(() => {
      expect(useDataStore.getState().outfits).toEqual([
        { code: 'O1', name: 'n1', prompt: 'p1' },
      ]);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows ConfirmDialog when existing data exists; cancel → no save', async () => {
    act(() => {
      useDataStore.setState({
        outfits: [{ code: 'O0', name: 'existing', prompt: 'p' }],
      });
    });
    const user = userEvent.setup();
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={vi.fn()} />);
    await user.type(
      screen.getByLabelText('貼上內容'),
      'code,name,prompt\nO1,n1,p1',
    );
    await user.click(screen.getByRole('button', { name: '匯入' }));
    expect(await screen.findByText(/將取代既有 1 筆 Outfits/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(useDataStore.getState().outfits).toEqual([
      { code: 'O0', name: 'existing', prompt: 'p' },
    ]);
  });

  it('ConfirmDialog confirm → replaces and closes', async () => {
    act(() => {
      useDataStore.setState({
        outfits: [{ code: 'O0', name: 'existing', prompt: 'p' }],
      });
    });
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={onClose} />);
    await user.type(
      screen.getByLabelText('貼上內容'),
      'code,name,prompt\nO1,n1,p1',
    );
    await user.click(screen.getByRole('button', { name: '匯入' }));
    const confirmBtn = await screen.findByRole('button', { name: '確認' });
    await user.click(confirmBtn);
    await waitFor(() => {
      expect(useDataStore.getState().outfits).toEqual([
        { code: 'O1', name: 'n1', prompt: 'p1' },
      ]);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error list when parse fails and does not write to store', async () => {
    const user = userEvent.setup();
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText('貼上內容'), 'bad,csv,content\nA,B');
    await user.click(screen.getByRole('button', { name: '匯入' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(useDataStore.getState().outfits).toEqual([]);
  });

  it('accepts character JSON when entityKind is characters', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportEntityModal entityKind="characters" open={true} onClose={onClose} />);
    const json = JSON.stringify({
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
      signature_features: ['f'],
      prohibited: ['p'],
      personality: ['calm'],
      color_palette: { theme: 'warm', colors: ['beige'], usage: 'prompt_inject' },
    });
    await user.type(screen.getByLabelText('貼上內容'), json);
    await user.click(screen.getByRole('button', { name: '匯入' }));
    await waitFor(() => {
      expect(Object.keys(useDataStore.getState().charactersById)).toEqual(['ACC-001']);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <ImportEntityModal entityKind="outfits" open={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run → expect FAIL**

Run: `pnpm test -- tests/components/ImportEntityModal`
Expected: FAIL (component missing)。

- [ ] **Step 3: Implement `src/components/ImportEntityModal.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { parseCharactersJson } from '@/lib/characters/parseCharacter';
import { parseCompositionsCsv } from '@/lib/csv/parseCompositions';
import { parseExpressionsCsv } from '@/lib/csv/parseExpressions';
import { parseOutfitsCsv } from '@/lib/csv/parseOutfits';
import { parsePosesCsv } from '@/lib/csv/parsePoses';
import { parseScenesCsv } from '@/lib/csv/parseScenes';
import { ENTITY_METADATA, type EntityKind } from '@/lib/entityRegistry';
import { readFileAsText } from '@/lib/readFileAsText';
import { useDataStore } from '@/store/useDataStore';
import type { ParseError } from '@/lib/csv/types';

interface Props {
  entityKind: EntityKind;
  open: boolean;
  onClose: () => void;
}

interface ParsedOutcome {
  apply: () => void;
  existingCount: number;
}

const MAX_ERRORS_SHOWN = 10;

function parseAndPrepare(
  entityKind: EntityKind,
  text: string,
): { ok: true; outcome: ParsedOutcome } | { ok: false; errors: ParseError[] } {
  const store = useDataStore.getState();
  if (entityKind === 'characters') {
    const r = parseCharactersJson(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: {
        apply: () => store.importCharacters(r.value),
        existingCount: Object.keys(store.charactersById).length,
      },
    };
  }
  if (entityKind === 'outfits') {
    const r = parseOutfitsCsv(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: { apply: () => store.importOutfits(r.items), existingCount: store.outfits.length },
    };
  }
  if (entityKind === 'scenes') {
    const r = parseScenesCsv(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: { apply: () => store.importScenes(r.items), existingCount: store.scenes.length },
    };
  }
  if (entityKind === 'poses') {
    const r = parsePosesCsv(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: { apply: () => store.importPoses(r.items), existingCount: store.poses.length },
    };
  }
  if (entityKind === 'expressions') {
    const r = parseExpressionsCsv(text);
    if (!r.ok) return { ok: false, errors: r.errors };
    return {
      ok: true,
      outcome: {
        apply: () => store.importExpressions(r.items),
        existingCount: store.expressions.length,
      },
    };
  }
  const r = parseCompositionsCsv(text);
  if (!r.ok) return { ok: false, errors: r.errors };
  return {
    ok: true,
    outcome: {
      apply: () => store.importCompositions(r.items),
      existingCount: store.compositions.length,
    },
  };
}

export function ImportEntityModal({ entityKind, open, onClose }: Props) {
  const meta = ENTITY_METADATA[entityKind];
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<ParseError[] | null>(null);
  const [pending, setPending] = useState<ParsedOutcome | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setText('');
      setErrors(null);
      setPending(null);
    }
  }, [open]);

  if (!open) return null;

  function handleApply() {
    const result = parseAndPrepare(entityKind, text);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors(null);
    if (result.outcome.existingCount > 0) {
      setPending(result.outcome);
      return;
    }
    result.outcome.apply();
    onClose();
  }

  function handleConfirm() {
    pending?.apply();
    setPending(null);
    onClose();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsText(file).then(setText).catch((err) => {
      setErrors([{ message: `檔案讀取失敗：${(err as Error).message}` }]);
    });
    e.target.value = '';
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label={`匯入 ${meta.displayName}`}
          className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">匯入 {meta.displayName}</h2>
            <button
              type="button"
              aria-label="關閉"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1 text-sm text-slate-300">
            <div className="font-semibold">欄位說明</div>
            <div className="text-slate-400">{meta.hint}</div>
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-blue-400 hover:underline">
                顯示範例
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-xs text-slate-200">
                {meta.example}
              </pre>
            </details>
          </div>

          <div className="space-y-2">
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700"
              >
                上傳 {meta.fileAccept}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={meta.fileAccept}
                className="hidden"
                onChange={handleFile}
              />
            </div>
            <label className="block space-y-1">
              <span className="text-xs text-slate-400">或貼上內容</span>
              <textarea
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
                aria-label="貼上內容"
              />
            </label>
          </div>

          {errors && errors.length > 0 && (
            <div role="alert" className="space-y-1 rounded border border-red-800 bg-red-900/30 p-3 text-xs text-red-300">
              <div className="font-semibold">匯入失敗</div>
              <ul className="space-y-0.5">
                {errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
              </ul>
              {errors.length > MAX_ERRORS_SHOWN && (
                <div className="text-slate-400">
                  另有 {errors.length - MAX_ERRORS_SHOWN} 行錯誤未顯示
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={text.trim().length === 0}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              匯入
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        message={
          pending
            ? `將取代既有 ${pending.existingCount} 筆 ${meta.displayName}，此操作無法復原。確認？`
            : ''
        }
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
```

- [ ] **Step 4: Run → expect PASS**

Run: `pnpm test -- tests/components/ImportEntityModal`
Expected: PASS 7 tests。

- [ ] **Step 5: Commit**

```bash
git add src/components/ImportEntityModal.tsx tests/components/ImportEntityModal.test.tsx
git commit -m "feat(ImportEntityModal): add shared import modal for 5 CSV + 1 JSON entity"
```

---

### Task 5: `DataManagerModal` 元件（TDD）

**Files:**
- Create: `src/components/DataManagerModal.tsx`
- Test: `tests/components/DataManagerModal.test.tsx`

- [ ] **Step 1: 寫 failing tests**

Create `tests/components/DataManagerModal.test.tsx`：

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataManagerModal } from '@/components/DataManagerModal';
import { useDataStore } from '@/store/useDataStore';

beforeEach(() => {
  localStorage.clear();
  act(() => {
    useDataStore.setState({
      outfits: [],
      scenes: [],
      poses: [],
      expressions: [],
      compositions: [],
      charactersById: {},
      activeCharacterId: null,
    });
  });
});

describe('DataManagerModal', () => {
  it('renders 6 entity rows with display names', () => {
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Outfits')).toBeInTheDocument();
    expect(screen.getByText('Scenes')).toBeInTheDocument();
    expect(screen.getByText('Poses')).toBeInTheDocument();
    expect(screen.getByText('Expressions')).toBeInTheDocument();
    expect(screen.getByText('Compositions')).toBeInTheDocument();
    expect(screen.getByText('Characters')).toBeInTheDocument();
  });

  it('shows count 0 when store is empty and disables Export buttons', () => {
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    const exportButtons = screen.getAllByRole('button', { name: /匯出/ });
    for (const btn of exportButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it('displays correct counts for each entity', () => {
    act(() => {
      useDataStore.setState({
        outfits: [{ code: 'O1', name: 'n', prompt: 'p' }],
        scenes: [
          { code: 'S1', name: 'n', prompt: 'p', lighting_hint: 'l' },
          { code: 'S2', name: 'n', prompt: 'p', lighting_hint: 'l' },
        ],
      });
    });
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    const outfitsRow = screen.getByText('Outfits').closest('tr')!;
    const scenesRow = screen.getByText('Scenes').closest('tr')!;
    expect(within(outfitsRow).getByText('1')).toBeInTheDocument();
    expect(within(scenesRow).getByText('2')).toBeInTheDocument();
  });

  it('clicking Import opens ImportEntityModal for that entity', async () => {
    const user = userEvent.setup();
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    const outfitsRow = screen.getByText('Outfits').closest('tr')!;
    const importBtn = within(outfitsRow).getByRole('button', { name: /匯入/ });
    await user.click(importBtn);
    expect(await screen.findByRole('dialog', { name: /匯入\s*Outfits/ })).toBeInTheDocument();
  });

  it('clicking Export triggers download with correct filename + mimeType', async () => {
    act(() => {
      useDataStore.setState({
        outfits: [{ code: 'O1', name: 'n', prompt: 'p' }],
      });
    });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let capturedAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedAnchor = this;
    });
    const user = userEvent.setup();
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    const outfitsRow = screen.getByText('Outfits').closest('tr')!;
    await user.click(within(outfitsRow).getByRole('button', { name: /匯出/ }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(capturedAnchor!.download).toBe('outfits.csv');
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DataManagerModal open={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: '關閉' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<DataManagerModal open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run → expect FAIL**

Run: `pnpm test -- tests/components/DataManagerModal`
Expected: FAIL (component missing)。

- [ ] **Step 3: Implement `src/components/DataManagerModal.tsx`**

```tsx
import { useState } from 'react';
import { ImportEntityModal } from '@/components/ImportEntityModal';
import { serializeCompositionsCsv } from '@/lib/csv/serializeCompositions';
import { serializeExpressionsCsv } from '@/lib/csv/serializeExpressions';
import { serializeOutfitsCsv } from '@/lib/csv/serializeOutfits';
import { serializePosesCsv } from '@/lib/csv/serializePoses';
import { serializeScenesCsv } from '@/lib/csv/serializeScenes';
import { downloadFile } from '@/lib/downloadFile';
import { ENTITY_KINDS, ENTITY_METADATA, type EntityKind } from '@/lib/entityRegistry';
import { useDataStore } from '@/store/useDataStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

function getCount(kind: EntityKind): number {
  const s = useDataStore.getState();
  if (kind === 'characters') return Object.keys(s.charactersById).length;
  return s[kind].length;
}

function getSerializedContent(kind: EntityKind): string {
  const s = useDataStore.getState();
  switch (kind) {
    case 'outfits':
      return serializeOutfitsCsv(s.outfits);
    case 'scenes':
      return serializeScenesCsv(s.scenes);
    case 'poses':
      return serializePosesCsv(s.poses);
    case 'expressions':
      return serializeExpressionsCsv(s.expressions);
    case 'compositions':
      return serializeCompositionsCsv(s.compositions);
    case 'characters':
      return JSON.stringify(s.charactersById, null, 2);
  }
}

export function DataManagerModal({ open, onClose }: Props) {
  const outfits = useDataStore((s) => s.outfits);
  const scenes = useDataStore((s) => s.scenes);
  const poses = useDataStore((s) => s.poses);
  const expressions = useDataStore((s) => s.expressions);
  const compositions = useDataStore((s) => s.compositions);
  const charactersById = useDataStore((s) => s.charactersById);
  const [importKind, setImportKind] = useState<EntityKind | null>(null);

  if (!open) return null;

  const counts: Record<EntityKind, number> = {
    outfits: outfits.length,
    scenes: scenes.length,
    poses: poses.length,
    expressions: expressions.length,
    compositions: compositions.length,
    characters: Object.keys(charactersById).length,
  };

  function handleExport(kind: EntityKind) {
    const meta = ENTITY_METADATA[kind];
    const content = getSerializedContent(kind);
    downloadFile({ content, filename: meta.downloadName, mimeType: meta.mimeType });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label="資料管理"
          className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">資料管理</h2>
            <button
              type="button"
              aria-label="關閉視窗"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="py-2">Entity</th>
                <th className="py-2">筆數</th>
                <th className="py-2"></th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {ENTITY_KINDS.map((kind) => {
                const meta = ENTITY_METADATA[kind];
                const count = counts[kind];
                return (
                  <tr key={kind} className="border-t border-slate-800">
                    <td className="py-2 text-slate-100">{meta.displayName}</td>
                    <td className="py-2 text-slate-300">{count}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setImportKind(kind)}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
                      >
                        匯入
                      </button>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleExport(kind)}
                        disabled={count === 0}
                        className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                      >
                        匯出
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
            >
              關閉
            </button>
          </div>
        </div>
      </div>

      {importKind && (
        <ImportEntityModal
          entityKind={importKind}
          open={true}
          onClose={() => setImportKind(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Run → expect PASS**

Run: `pnpm test -- tests/components/DataManagerModal`
Expected: PASS 7 tests。

- [ ] **Step 5: Commit**

```bash
git add src/components/DataManagerModal.tsx tests/components/DataManagerModal.test.tsx
git commit -m "feat(DataManagerModal): add top-level data management modal with 6 entity rows"
```

---

### Task 6: `App.tsx` 整合（取代空態 placeholder，加 header 資料管理 icon + CharacterPicker）

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports**

Read current `src/App.tsx`. In the imports block, add:

```ts
import { CharacterPicker } from '@/components/CharacterPicker';
import { DataManagerModal } from '@/components/DataManagerModal';
```

Place alongside other `@/components/*` imports alphabetically.

- [ ] **Step 2: Add state for DataManagerModal**

After the line `const [settingsOpen, setSettingsOpen] = useState(false);`, add:

```ts
const [dataManagerOpen, setDataManagerOpen] = useState(false);
```

- [ ] **Step 3: Replace empty-state early-return block**

Find the existing Sub-plan A empty-state early return (the block that starts with `if (!character) {` and contains the `useDataStore.getState().importCharacters(...)` devtools hint). Replace the entire `if (!character) { return (...); }` block with:

```tsx
if (!character) {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="relative rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Prompt Tool
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">AI 虛擬網紅提示詞產生器</h1>
          <div className="mt-3"><CharacterPicker /></div>
          <button
            type="button"
            aria-label="資料管理"
            onClick={() => setDataManagerOpen(true)}
            className="absolute right-16 top-6 rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14a9 3 0 0 0 18 0V5" />
              <path d="M3 12a9 3 0 0 0 18 0" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="設定"
            onClick={() => setSettingsOpen(true)}
            className="absolute right-6 top-6 rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </header>
        <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
          尚未匯入角色資料。請點右上方「資料管理」匯入 Characters 與 5 個 styles 資料集。
        </section>
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={(next) => setSettings(next)}
        />
        <DataManagerModal
          open={dataManagerOpen}
          onClose={() => setDataManagerOpen(false)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update normal header (when character exists)**

Find the `<header ...>` block inside the main `return (` (non-empty state). Find the existing header content with the character display line `角色：{character.display_name}（{character.character_id}）` and the settings gear button.

Replace the full `<header>` element with:

```tsx
<header className="relative rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
  <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
    Prompt Tool
  </p>
  <h1 className="mt-2 text-3xl font-bold text-slate-100">AI 虛擬網紅提示詞產生器</h1>
  <div className="mt-3"><CharacterPicker /></div>
  <button
    type="button"
    aria-label="資料管理"
    onClick={() => setDataManagerOpen(true)}
    className="absolute right-16 top-6 rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  </button>
  <button
    type="button"
    aria-label="設定"
    onClick={() => setSettingsOpen(true)}
    className="absolute right-6 top-6 rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  </button>
</header>
```

The `角色：{character.display_name}（{character.character_id}）` line is **removed** since CharacterPicker now shows the active character.

- [ ] **Step 5: Mount DataManagerModal in main tree**

Find where `SettingsModal` is rendered in the main `return` (non-empty state). Add right after it:

```tsx
<DataManagerModal
  open={dataManagerOpen}
  onClose={() => setDataManagerOpen(false)}
/>
```

- [ ] **Step 6: Clean up stale comment**

Find the inline comment near the `recommended = compositions.filter(...)` block that references `commit a46774f`. Remove the comment line entirely — it's now misleading since App uses useDataStore directly.

Before:
```tsx
                // `recommended` 源自 store（commit a46774f 起實際為全部 compositions，名稱 stale）；`recommendedCodes` 為 pose 建議子集，兩者獨立。
                const recommended = compositions.filter((composition) =>
```

After:
```tsx
                const recommended = compositions.filter((composition) =>
```

- [ ] **Step 7: Build + full test**

Run: `pnpm run build && pnpm test`
Expected: tsc + vite clean, all tests PASS (189 old + 31 new = ~220 total; exact number depends on run).

- [ ] **Step 8: Manual smoke test**

```bash
pnpm dev
```

Browser verify:
1. Clear localStorage in devtools → reload → see "尚未匯入角色資料" + empty-state section. Header has 資料管理 + 設定 icons.
2. Click 資料管理 → DataManagerModal opens with 6 rows, all counts = 0, Export disabled.
3. Click Characters Import → ImportEntityModal opens. Paste the content of your backed-up `characters.json` → click 匯入 → modal closes, row updates to "1".
4. Close DataManagerModal → CharacterPicker auto-selects the imported character → empty-state is replaced by the normal UI.
5. Import 5 styles CSVs via 資料管理 → order workflow becomes usable.
6. Export any entity (with data) → file downloads with the correct filename.
7. Re-import with existing data → ConfirmDialog shows "將取代既有 N 筆 X" → 取消 preserves data / 確認 replaces.
8. Paste malformed CSV → error list shows, localStorage unchanged.
9. Open Settings → still works; OrderInput / CompPicker / PromptCard → still work.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "feat(App): integrate CharacterPicker + DataManagerModal in header"
```

---

## Self-Review

### 1. Spec coverage 逐條

| Spec 鎖定前提 (14 條) | Plan B task |
|---|---|
| 1. 動機：資料不進 git | Sub-plan A Task 12（已完成） |
| 2. 範圍：styles + characters | 本 plan Task 4/5（modal）|
| 3. 格式：CSV + JSON | Task 4 `parseAndPrepare` switch |
| 4. UI：Data Manager modal + 6 entity rows | Task 5 |
| 5. Replace + confirm | Task 4 `pending` state + ConfirmDialog |
| 6. 全或無驗證 | parsers（Sub-plan A）+ Task 4 error display |
| 7. 多角色 | Task 3 CharacterPicker |
| 8. CSV pipe 陣列 | Sub-plan A Task 5 |
| 9. papaparse | Sub-plan A Task 1 |
| 10. 遷移腳本 | Sub-plan A Task 10 |
| 11. localStorage | Sub-plan A Task 2 |
| 12. dataLoader.ts 處理 | Sub-plan A Task 12 |
| 13. YAML 留空（實際調整為 git-rm + gitignore） | Sub-plan A Task 12 |
| 14. CharacterPicker 位置 | Task 6 Step 4（header h1 下一行）|

### 2. Placeholder scan

無 TBD / TODO / 「similar to」/「add appropriate」/ 空 step 描述。每個 step 含完整程式碼或命令。

### 3. Type consistency

- `EntityKind` 在 Task 2 定義，Task 4/5 consistent 使用
- `ENTITY_METADATA` / `ENTITY_KINDS` 在 Task 2 定義，Task 5 循序呼叫
- `ImportEntityModal` 的 props `{entityKind, open, onClose}` — Task 4 定義、Task 5 呼叫
- `DataManagerModal` 的 props `{open, onClose}` — Task 5 定義、Task 6 呼叫
- `CharacterPicker` 無 props（自 store 讀）— Task 3 定義、Task 6 使用
- `parseAndPrepare` 內所有 parser 函式都來自 Sub-plan A 既有檔案，簽名一致

### 4. 未被 plan 涵蓋的 spec 要求

無。Spec 的「非目標」段列的都沒做；spec 的所有主功能都由 Task 1–6 實作。

### 5. Minor 清理項目（反映先前 reviewer 提到的 Sub-plan A 技術債）

- ✅ `useDataStore.getState().importCharacters(...)` devtools hint → Task 6 Step 3 以正式空態區塊取代
- ✅ `commit a46774f` 舊註解 → Task 6 Step 6 移除
- ✅ `Shot`/`ShotValue` 型別統一 → Sub-plan A 收尾 commit `f9f18a8` 已處理
- `parseCharactersJson` 多角色錯誤集中顯示的 UX 考量 → Task 4 透過顯示全部錯誤清單（最多 10 行）來應對，使用者看得到哪個 character 失敗（因錯誤訊息含 `character[ACC-002]` 路徑前綴）
