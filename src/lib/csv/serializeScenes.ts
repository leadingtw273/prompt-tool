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
