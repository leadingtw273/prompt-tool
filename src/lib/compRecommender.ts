import type { Composition, Shot } from '@/types';

interface RecommendArgs {
  pool: Composition[];
  n: number;
  rngSeed?: number;
}

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groupByShot(pool: Composition[]): Map<Shot, Composition[]> {
  const m = new Map<Shot, Composition[]>();
  for (const c of pool) {
    const bucket = m.get(c.shot) ?? [];
    bucket.push(c);
    m.set(c.shot, bucket);
  }
  return m;
}

export function recommendComps(args: RecommendArgs): Composition[] {
  const { pool, n, rngSeed = Date.now() } = args;
  if (pool.length === 0 || n <= 0) {
    return [];
  }

  const rng = mulberry32(rngSeed);
  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const buckets = groupByShot(pool);
  const selected: Composition[] = [];
  const seen = new Set<string>();

  for (const bucketItems of buckets.values()) {
    if (selected.length >= n) {
      break;
    }
    const pick = pickRandom(bucketItems);
    selected.push(pick);
    seen.add(pick.code);
  }

  if (selected.length < n) {
    const remaining = pool.filter((c) => !seen.has(c.code));
    while (selected.length < n && remaining.length > 0) {
      const idx = Math.floor(rng() * remaining.length);
      const pick = remaining.splice(idx, 1)[0];
      selected.push(pick);
      seen.add(pick.code);
    }
  }

  return selected.slice(0, n);
}
