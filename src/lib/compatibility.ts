import type {
  Composition,
  CompCompatibilityRule,
  Expression,
  ForbiddenCombination,
  Order,
  Tier,
} from '@/types';

interface CompCheckContext {
  pose: string;
  outfit: string;
  scene: string;
}

export function isCompCompatible(
  comp: Composition,
  ctx: CompCheckContext,
  rules: CompCompatibilityRule[],
): boolean {
  const rule = rules.find((r) => r.comp_code === comp.code);
  if (!rule) {
    return true;
  }

  if (rule.forbidden_poses?.includes(ctx.pose)) {
    return false;
  }
  if (rule.forbidden_outfits?.includes(ctx.outfit)) {
    return false;
  }
  if (rule.forbidden_scenes?.includes(ctx.scene)) {
    return false;
  }

  return true;
}

export function isOrderForbidden(
  order: Omit<Order, 'id'>,
  forbiddenRules: ForbiddenCombination[],
): { forbidden: boolean; reason?: string } {
  for (const group of forbiddenRules) {
    for (const rule of group.rules) {
      if (rule.tier_blacklist?.includes(order.tier)) {
        return { forbidden: true, reason: `${group.reason}: tier ${order.tier} blacklisted` };
      }
      if (rule.outfit_blacklist?.includes(order.outfit)) {
        return { forbidden: true, reason: `${group.reason}: outfit ${order.outfit} blacklisted` };
      }
      if (rule.expression_blacklist?.includes(order.expr)) {
        return { forbidden: true, reason: `${group.reason}: expression ${order.expr} blacklisted` };
      }
      if (rule.outfit === order.outfit && rule.scene_blacklist?.includes(order.scene)) {
        return {
          forbidden: true,
          reason: `${group.reason}: outfit ${order.outfit} × scene ${order.scene}`,
        };
      }
      if (rule.outfit === order.outfit && rule.pose_blacklist?.includes(order.pose)) {
        return {
          forbidden: true,
          reason: `${group.reason}: outfit ${order.outfit} × pose ${order.pose}`,
        };
      }
    }
  }

  return { forbidden: false };
}

export function isTierAllowedForExpression(expr: Expression, tier: Tier): boolean {
  return expr.tier_restriction.includes(tier);
}
