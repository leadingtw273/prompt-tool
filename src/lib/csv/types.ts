export interface ParseError {
  line?: number;
  column?: string;
  message: string;
}

export type ParseResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; errors: ParseError[] };
