export type LengthStatus = 'too_short' | 'ok' | 'too_long';

const MIN_WORDS = 80;
const MAX_WORDS = 250;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') {
    return 0;
  }
  return trimmed.split(/\s+/).length;
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
