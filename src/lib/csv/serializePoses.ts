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
