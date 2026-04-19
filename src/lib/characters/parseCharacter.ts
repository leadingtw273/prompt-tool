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
