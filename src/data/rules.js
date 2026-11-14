// 規則資料入口（小童軍、幼童軍、童軍）— v1.0 · © SCOUT SYSTEM
import GRASSHOPPER from './grasshopper_rules_v1.0.json';
import CUB from './cub_rules_v1.0.json';
import SCOUT from './scout_rules_v1.0.json';
import DISTRICTS from './districts_v1.0.json';
import PATROLS from './patrols_v1.0.json';
import { validateRules } from './validate.js';

/** 支部（次序 = 頂部切換掣次序） */
export const SECTIONS = { grasshopper: GRASSHOPPER, cub: CUB, scout: SCOUT };
export const SECTION_IDS = Object.keys(SECTIONS);
export { DISTRICTS, PATROLS };

export const RULE_ERRORS = SECTION_IDS.flatMap((id) => validateRules(SECTIONS[id]).map((e) => `${SECTIONS[id].section.zh}：${e}`));

export function badgeById(rules, id) {
  const b = rules.badges.find((x) => x.id === id);
  if (!b) throw new Error(`未登記嘅徽章：${id}`);
  return b;
}

/** 「《儀容與制服手冊》p.24」呢類字串 */
export function sourceLines(rules, lang, list) {
  return (list || []).map((s) => {
    const src = rules.sources[s.ref];
    const name = src ? (lang === 'en' ? src.en || src.zh : src.zh) : s.ref;
    return { ref: s.ref, name, page: s.page, url: src?.url ?? null };
  });
}
