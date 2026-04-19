import { describe, expect, it } from 'vitest';
import { ENTITY_KINDS, ENTITY_METADATA, type EntityKind } from '@/lib/entityRegistry';

describe('entityRegistry', () => {
  it('exports all 6 entity kinds', () => {
    expect(ENTITY_KINDS).toEqual([
      'outfits',
      'scenes',
      'poses',
      'expressions',
      'compositions',
      'characters',
    ]);
  });

  it('every kind has a metadata entry with all required fields', () => {
    for (const kind of ENTITY_KINDS) {
      const meta = ENTITY_METADATA[kind];
      expect(meta.displayName).toBeTruthy();
      expect(meta.chineseName).toBeTruthy();
      expect(meta.hint).toBeTruthy();
      expect(meta.example).toBeTruthy();
      expect(meta.downloadName).toBeTruthy();
      expect(meta.mimeType).toBeTruthy();
      expect(meta.fileAccept).toBeTruthy();
      expect(['csv', 'json']).toContain(meta.format);
    }
  });

  it('5 styles entities use csv format, characters uses json', () => {
    expect(ENTITY_METADATA.outfits.format).toBe('csv');
    expect(ENTITY_METADATA.scenes.format).toBe('csv');
    expect(ENTITY_METADATA.poses.format).toBe('csv');
    expect(ENTITY_METADATA.expressions.format).toBe('csv');
    expect(ENTITY_METADATA.compositions.format).toBe('csv');
    expect(ENTITY_METADATA.characters.format).toBe('json');
  });

  it('csv entities set mimeType to text/csv and fileAccept to .csv', () => {
    const csvKinds: EntityKind[] = ['outfits', 'scenes', 'poses', 'expressions', 'compositions'];
    for (const kind of csvKinds) {
      expect(ENTITY_METADATA[kind].mimeType).toBe('text/csv;charset=utf-8');
      expect(ENTITY_METADATA[kind].fileAccept).toBe('.csv');
    }
  });

  it('characters sets mimeType to application/json and fileAccept to .json', () => {
    expect(ENTITY_METADATA.characters.mimeType).toBe('application/json');
    expect(ENTITY_METADATA.characters.fileAccept).toBe('.json');
  });

  it('downloadName matches format', () => {
    expect(ENTITY_METADATA.outfits.downloadName).toBe('outfits.csv');
    expect(ENTITY_METADATA.scenes.downloadName).toBe('scenes.csv');
    expect(ENTITY_METADATA.poses.downloadName).toBe('poses.csv');
    expect(ENTITY_METADATA.expressions.downloadName).toBe('expressions.csv');
    expect(ENTITY_METADATA.compositions.downloadName).toBe('compositions.csv');
    expect(ENTITY_METADATA.characters.downloadName).toBe('characters.json');
  });
});
