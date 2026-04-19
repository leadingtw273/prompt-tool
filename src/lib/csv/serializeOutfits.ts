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
