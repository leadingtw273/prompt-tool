import { describe, expect, it } from 'vitest';
import { readFileAsText } from '@/lib/readFileAsText';

describe('readFileAsText', () => {
  it('resolves with file text content', async () => {
    const file = new File(['hello,world'], 'test.csv', { type: 'text/csv' });
    const text = await readFileAsText(file);
    expect(text).toBe('hello,world');
  });

  it('resolves with UTF-8 content including Chinese', async () => {
    const file = new File(['咖啡廳,cafe'], 'test.csv', { type: 'text/csv' });
    const text = await readFileAsText(file);
    expect(text).toBe('咖啡廳,cafe');
  });
});
