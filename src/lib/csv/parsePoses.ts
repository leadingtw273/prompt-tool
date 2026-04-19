import Papa from 'papaparse';
import type { Pose } from '@/types';
import type { ParseError, ParseResult } from './types';
import { POSE_SCHEMA, SHOT_VALUES } from './schemas';

export function parsePosesCsv(csvText: string): ParseResult<Pose> {
  const errors: ParseError[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
  });

  for (const err of parsed.errors) {
    errors.push({ line: (err.row ?? 0) + 2, message: err.message });
  }

  const headers = parsed.meta.fields ?? [];
  const expected = POSE_SCHEMA.columns;
  if (
    headers.length !== expected.length ||
    !expected.every((c, i) => headers[i] === c)
  ) {
    errors.push({
      message: `header 欄位必須為「${expected.join(',')}」，實際為「${headers.join(',')}」`,
    });
    return { ok: false, errors };
  }

  const items: Pose[] = [];
  const codeLines = new Map<string, number[]>();
  const shotSet = new Set<string>(SHOT_VALUES);

  parsed.data.forEach((row, idx) => {
    const line = idx + 2;
    for (const col of expected) {
      if (!row[col] || row[col].trim() === '') {
        errors.push({ line, column: col, message: `第 ${line} 行 ${col} 欄位為空` });
      }
    }

    const suggestion = (row.shot_suggestion ?? '').split('|');
    const cleanSuggestion: string[] = [];
    for (const s of suggestion) {
      if (s === '') {
        errors.push({
          line,
          column: 'shot_suggestion',
          message: `第 ${line} 行 shot_suggestion 有空元素（相鄰 | 或尾端 |）`,
        });
        continue;
      }
      if (!shotSet.has(s)) {
        errors.push({
          line,
          column: 'shot_suggestion',
          message: `第 ${line} 行 shot_suggestion 值 "${s}" 不屬於 (${SHOT_VALUES.join(', ')})`,
        });
        continue;
      }
      cleanSuggestion.push(s);
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
      shot_suggestion: cleanSuggestion,
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
