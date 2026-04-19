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
