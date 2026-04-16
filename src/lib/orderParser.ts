import type { Order, Tier } from '@/types';

export type ParseResult =
  | { ok: true; order: Omit<Order, 'id'> }
  | { ok: false; error: string };

const TIER_WHITELIST: readonly Tier[] = ['T0', 'T1', 'T2', 'T3'];
const CODE_PREFIXES = {
  outfit: /^(CAS|GRL|FIT|ELG|INT|THM)-\d{2}$/,
  scene: /^SCN-\d{2}$/,
  pose: /^POS-\d{2}$/,
  expr: /^EXP-\d{2}$/,
};

export function parseOrderText(input: string): ParseResult {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 3) {
    return { ok: false, error: `Expected 3 space-separated sections, got ${parts.length}` };
  }

  const [codesSection, tierSection, countSection] = parts;
  const codes = codesSection.split('_');
  if (codes.length !== 4) {
    return { ok: false, error: `Expected four codes joined by "_", got ${codes.length}` };
  }

  const [outfit, scene, pose, expr] = codes;
  if (!CODE_PREFIXES.outfit.test(outfit)) {
    return { ok: false, error: `Invalid outfit code: ${outfit}` };
  }
  if (!CODE_PREFIXES.scene.test(scene)) {
    return { ok: false, error: `Invalid scene code: ${scene}` };
  }
  if (!CODE_PREFIXES.pose.test(pose)) {
    return { ok: false, error: `Invalid pose code: ${pose}` };
  }
  if (!CODE_PREFIXES.expr.test(expr)) {
    return { ok: false, error: `Invalid expression code: ${expr}` };
  }

  const tier = tierSection as Tier;
  if (!TIER_WHITELIST.includes(tier)) {
    return { ok: false, error: `Invalid tier: ${tierSection}` };
  }

  if (!countSection.startsWith('x')) {
    return { ok: false, error: `Count must start with "x", got ${countSection}` };
  }
  const countNum = Number(countSection.slice(1));
  if (!Number.isInteger(countNum) || countNum <= 0) {
    return { ok: false, error: `Count must be a positive integer, got ${countSection}` };
  }

  return {
    ok: true,
    order: { outfit, scene, pose, expr, tier, count: countNum },
  };
}
