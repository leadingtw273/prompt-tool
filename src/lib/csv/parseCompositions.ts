import Papa from 'papaparse';
import type { Composition } from '@/types';
import type { ParseError, ParseResult } from './types';
import {
  ANGLE_VALUES,
  type AngleValue,
  COMPOSITION_SCHEMA,
  SHOT_VALUES,
  type ShotValue,
} from './schemas';

export function parseCompositionsCsv(csvText: string): ParseResult<Composition> {
  const errors: ParseError[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
  });

  for (const err of parsed.errors) {
    errors.push({ line: (err.row ?? 0) + 2, message: err.message });
  }

  const headers = parsed.meta.fields ?? [];
  const expected = COMPOSITION_SCHEMA.columns;
  if (
    headers.length !== expected.length ||
    !expected.every((c, i) => headers[i] === c)
  ) {
    errors.push({
      message: `header 欄位必須為「${expected.join(',')}」，實際為「${headers.join(',')}」`,
    });
    return { ok: false, errors };
  }

  const items: Composition[] = [];
  const codeLines = new Map<string, number[]>();
  const shotSet = new Set<string>(SHOT_VALUES);
  const angleSet = new Set<string>(ANGLE_VALUES);

  parsed.data.forEach((row, idx) => {
    const line = idx + 2;
    for (const col of expected) {
      if (!row[col] || row[col].trim() === '') {
        errors.push({ line, column: col, message: `第 ${line} 行 ${col} 欄位為空` });
      }
    }
    const shot = (row.shot ?? '').trim();
    if (shot && !shotSet.has(shot)) {
      errors.push({
        line,
        column: 'shot',
        message: `第 ${line} 行 shot 值 "${shot}" 不屬於 (${SHOT_VALUES.join(', ')})`,
      });
    }
    const angle = (row.angle ?? '').trim();
    if (angle && !angleSet.has(angle)) {
      errors.push({
        line,
        column: 'angle',
        message: `第 ${line} 行 angle 值 "${angle}" 不屬於 (${ANGLE_VALUES.join(', ')})`,
      });
    }

    const code = row.code?.trim() ?? '';
    if (code) {
      const list = codeLines.get(code) ?? [];
      list.push(line);
      codeLines.set(code, list);
    }

    items.push({
      code,
      name: row.name?.trim() ?? '',
      prompt: row.prompt?.trim() ?? '',
      shot: shot as ShotValue,
      angle: angle as AngleValue,
    });
  });

  for (const [code, lines] of codeLines) {
    if (lines.length > 1) {
      errors.push({ message: `code "${code}" 在第 ${lines.join('、')} 行重複` });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, items };
}
