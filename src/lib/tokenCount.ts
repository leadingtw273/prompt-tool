export type LengthStatus = 'too_short' | 'ok' | 'too_long';

const MIN_WORDS = 80;
const MAX_WORDS = 250;

const CJK_CHAR_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') {
    return 0;
  }
  const cjkCount = (trimmed.match(CJK_CHAR_RE) ?? []).length;
  const nonCjk = trimmed.replace(CJK_CHAR_RE, ' ').trim();
  const wordCount = nonCjk === '' ? 0 : nonCjk.split(/\s+/).length;
  return cjkCount + wordCount;
}

export function checkLengthStatus(wordCount: number): LengthStatus {
  if (wordCount < MIN_WORDS) {
    return 'too_short';
  }
  if (wordCount > MAX_WORDS) {
    return 'too_long';
  }
  return 'ok';
}
