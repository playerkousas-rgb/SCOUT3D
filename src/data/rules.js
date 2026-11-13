// 規則資料入口 — v1.0 · © SCOUT SYSTEM
import RULES from './grasshopper_rules_v1.0.json';
import { validateRules } from './validate.js';

export const RULE_ERRORS = validateRules(RULES);
export { RULES };

const byId = new Map(RULES.badges.map((b) => [b.id, b]));
export function badgeById(id) {
  const b = byId.get(id);
  if (!b) throw new Error(`未登記嘅徽章：${id}`);
  return b;
}

/** 「《儀容與制服手冊》p.24」呢類字串 */
export function sourceLines(lang, list) {
  return (list || []).map((s) => {
    const src = RULES.sources[s.ref];
    const name = src ? (lang === 'en' ? src.en || src.zh : src.zh) : s.ref;
    return { ref: s.ref, name, page: s.page, url: src?.url ?? null };
  });
}
