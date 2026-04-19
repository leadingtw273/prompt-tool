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
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
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
