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
