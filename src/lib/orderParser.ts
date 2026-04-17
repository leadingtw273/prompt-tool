const CODE_PREFIXES = {
  outfit: /^(CAS|GRL|FIT|ELG|INT|THM)-\d{2}$/,
  scene: /^SCN-\d{2}$/,
  pose: /^POS-\d{2}$/,
  expr: /^EXP-\d{2}$/,
};

export type CodesParseResult =
  | { ok: true; codes: { outfit: string; scene: string; pose: string; expr: string } }
  | { ok: false; error: string };

export function parseCodes(input: string): CodesParseResult {
  const codes = input.trim().split('_');
  if (codes.length !== 4) {
    return { ok: false, error: `需要四個以 "_" 連接的代碼，目前有 ${codes.length} 個` };
  }
  const [outfit, scene, pose, expr] = codes;
  if (!CODE_PREFIXES.outfit.test(outfit)) {
    return { ok: false, error: `無效的服裝代碼：${outfit}` };
  }
  if (!CODE_PREFIXES.scene.test(scene)) {
    return { ok: false, error: `無效的場景代碼：${scene}` };
  }
  if (!CODE_PREFIXES.pose.test(pose)) {
    return { ok: false, error: `無效的姿勢代碼：${pose}` };
  }
  if (!CODE_PREFIXES.expr.test(expr)) {
    return { ok: false, error: `無效的表情代碼：${expr}` };
  }
  return { ok: true, codes: { outfit, scene, pose, expr } };
}
