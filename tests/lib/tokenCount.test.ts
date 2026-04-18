import { describe, it, expect } from 'vitest';
import { countWords, checkLengthStatus, type LengthStatus } from '@/lib/tokenCount';

describe('tokenCount', () => {
  describe('Given a plain prompt string', () => {
    describe('When countWords is called', () => {
      it('Then returns the number of whitespace-separated tokens', () => {
        expect(countWords('a b c d')).toBe(4);
        expect(countWords('  a   b  ')).toBe(2);
        expect(countWords('')).toBe(0);
      });
    });
  });

  describe('Given a CJK-heavy string', () => {
    describe('When countWords is called', () => {
      it('Then each Han character counts as one word', () => {
        expect(countWords('一個適合咖啡廳的構圖')).toBe(10);
      });

      it('Then mixes CJK characters with whitespace-separated Latin words', () => {
        expect(countWords('close-up 特寫 正面 front view')).toBe(7);
      });

      it('Then Hiragana and Katakana also count per character', () => {
        expect(countWords('あいうカタカナ')).toBe(7);
      });
    });
  });

  describe('Given length thresholds 80 (too short) / 250 (too long)', () => {
    describe('When checkLengthStatus is called with 50 words', () => {
      it('Then returns "too_short"', () => {
        const status: LengthStatus = checkLengthStatus(50);
        expect(status).toBe('too_short');
      });
    });

    describe('When checkLengthStatus is called with 150 words', () => {
      it('Then returns "ok"', () => {
        expect(checkLengthStatus(150)).toBe('ok');
      });
    });

    describe('When checkLengthStatus is called with 300 words', () => {
      it('Then returns "too_long"', () => {
        expect(checkLengthStatus(300)).toBe('too_long');
      });
    });
  });
});
