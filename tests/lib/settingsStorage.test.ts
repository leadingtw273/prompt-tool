import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SYSTEM_PROMPT,
  STORAGE_KEY,
  isConfigured,
  loadSettings,
  saveSettings,
} from '@/lib/settingsStorage';

describe('settingsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadSettings', () => {
    it('returns defaults when localStorage is empty', () => {
      const s = loadSettings();
      expect(s.apiKey).toBe('');
      expect(s.model).toBe('gemini-3-flash');
      expect(s.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
    });

    it('returns defaults when stored JSON is invalid', () => {
      localStorage.setItem(STORAGE_KEY, '{not json');
      const s = loadSettings();
      expect(s.apiKey).toBe('');
      expect(s.model).toBe('gemini-3-flash');
    });

    it('fills missing fields with defaults', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ apiKey: 'abc' }),
      );
      const s = loadSettings();
      expect(s.apiKey).toBe('abc');
      expect(s.model).toBe('gemini-3-flash');
      expect(s.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
    });
  });

  describe('saveSettings', () => {
    it('writes JSON to localStorage and round-trips', () => {
      saveSettings({
        apiKey: 'key-123',
        model: 'gemini-2.5-pro',
        systemPrompt: 'custom',
      });
      const loaded = loadSettings();
      expect(loaded.apiKey).toBe('key-123');
      expect(loaded.model).toBe('gemini-2.5-pro');
      expect(loaded.systemPrompt).toBe('custom');
    });
  });

  describe('isConfigured', () => {
    it('returns false for empty or whitespace apiKey', () => {
      expect(isConfigured({ apiKey: '', model: 'gemini-2.5-flash', systemPrompt: 'x' })).toBe(false);
      expect(isConfigured({ apiKey: '   ', model: 'gemini-2.5-flash', systemPrompt: 'x' })).toBe(false);
    });

    it('returns true when apiKey has content', () => {
      expect(isConfigured({ apiKey: 'abc', model: 'gemini-2.5-flash', systemPrompt: 'x' })).toBe(true);
    });
  });
});
