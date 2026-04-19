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
