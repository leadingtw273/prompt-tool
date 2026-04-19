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
