// SCOUT3D 規則資料驗證（build 時同 node --test 共用）— v1.0 · © SCOUT SYSTEM
// 防呆（F）：資料唔齊就 fail closed，唔會靜靜出一個冇來源嘅「權威」位置。

const STATUSES = new Set(['documented', 'pending', 'verified']);
const SIDES = new Set(['left', 'right', 'centre']);
const SHAPES = new Set(['circle', 'square', 'rect']);
const PARTS = new Set(['torso', 'sleeve']);
const DYNAMIC = new Set(['district', 'region', 'meritorious', 'patrol']);
const POCKET = new Set(['centre', 'aboveFlap']);
const TOWARDS = new Set(['front', 'back']);

function bilingual(obj, keys, where, errors) {
  for (const lang of ['zh', 'en']) {
    if (!obj[lang] || typeof obj[lang] !== 'object') {
      errors.push(`${where}: 缺 ${lang}`);
      continue;
    }
    for (const k of keys) {
      if (typeof obj[lang][k] !== 'string' || !obj[lang][k].trim()) errors.push(`${where}.${lang}.${k}: 空白`);
    }
  }
}

function checkSources(list, sources, where, errors) {
  if (!Array.isArray(list) || list.length === 0) {
    errors.push(`${where}: 冇來源（sources）`);
    return;
  }
  for (const s of list) {
    if (!sources[s.ref]) errors.push(`${where}: 來源 ${s.ref} 未登記`);
    if (!s.page) errors.push(`${where}: 來源 ${s.ref} 冇頁碼`);
  }
}

export function validateRules(rules) {
  const errors = [];
  if (!/^v\d+\.\d+(\.\d+)?$/.test(rules.fileVersion || '')) errors.push('fileVersion 格式錯');
  if (rules.copyright !== '© SCOUT SYSTEM') errors.push('copyright 必須係 © SCOUT SYSTEM');
  const sources = rules.sources || {};
  if (!Object.keys(sources).length) errors.push('sources 空白');
  if (!rules.review || !STATUSES.has(rules.review.status)) errors.push('review.status 錯');

  const ids = new Set();
  for (const g of rules.garments || []) {
    const w = `garment ${g.id}`;
    if (ids.has(g.id)) errors.push(`${w}: id 重複`);
    ids.add(g.id);
    bilingual(g, ['name', 'rule'], w, errors);
    checkSources(g.sources, sources, w, errors);
    if (!STATUSES.has(g.status)) errors.push(`${w}: status 錯`);
  }

  const badgeIds = new Set((rules.badges || []).map((b) => b.id));
  for (const b of rules.badges || []) {
    const w = `badge ${b.id}`;
    if (ids.has(b.id)) errors.push(`${w}: id 重複`);
    ids.add(b.id);
    bilingual(b, ['name', 'place', 'quote', 'conditions'], w, errors);
    checkSources(b.sources, sources, w, errors);
    if (!SIDES.has(b.side)) errors.push(`${w}: side 必須以穿著者角度寫「left/right/centre」`);
    if (!STATUSES.has(b.status)) errors.push(`${w}: status 錯`);
    if (b.status === 'pending' && !(b.pendingReason && b.pendingReason.zh && b.pendingReason.en)) {
      errors.push(`${w}: 待確認項目要寫「pendingReason」（中英）`);
    }
    if (b.status === 'verified' && !rules.review.lastChecked) errors.push(`${w}: verified 但「review.lastChecked」空白`);
    const s = b.size || {};
    if (!SHAPES.has(s.shape) || !(s.wCm > 0) || !(s.hCm > 0)) errors.push(`${w}: size 錯`);
    if (s.measured && !(s.ref && s.page)) errors.push(`${w}: 有實際尺寸就要寫來源頁`);
    const a = b.anchor || {};
    if (!PARTS.has(a.part)) errors.push(`${w}: anchor.part 錯`);
    if (a.side !== b.side) errors.push(`${w}: anchor.side 同「side」唔一致`);
    if (a.belowBadge && !badgeIds.has(a.belowBadge)) errors.push(`${w}: belowBadge 指向不存在嘅章`);
    if (a.aboveBadge && !badgeIds.has(a.aboveBadge)) errors.push(`${w}: aboveBadge 指向不存在嘅章`);
    if (a.part === 'torso' && a.pocket == null && !(Number.isFinite(a.xCm) && Number.isFinite(a.fromTopCm))) errors.push(`${w}: 上身位置要有 xCm + fromTopCm 或 pocket`);
    if (a.pocket != null && !POCKET.has(a.pocket)) errors.push(`${w}: anchor.pocket 錯`);
    if (a.towards != null && (!TOWARDS.has(a.towards) || !(a.offsetCm > 0))) errors.push(`${w}: anchor.towards 要係 front/back 兼有 offsetCm`);
    if (b.dynamic != null && !DYNAMIC.has(b.dynamic)) errors.push(`${w}: dynamic 錯`);
    // 圖案一定要來自官方文件（唔可以自己設計）
    const arts = Array.isArray(b.art) ? b.art : b.art ? [b.art] : [];
    if (!arts.length) errors.push(`${w}: 冇徽章圖案（art）`);
    for (const art of arts) {
      if (!/^\/badges\/((districts|patrols)\/)?[\w-]+\.png$/.test(art.file || '')) errors.push(`${w}: art.file 格式錯`);
      if (!sources[art.ref] || !art.page) errors.push(`${w}: art 要寫官方文件來源同頁碼`);
    }
  }

  const st = rules.schoolTop;
  if (!st && rules.section?.id === 'grasshopper') errors.push('缺「schoolTop」');
  else if (st) {
    bilingual(st, ['name', 'place', 'quote'], 'schoolTop', errors);
    checkSources(st.sources, sources, 'schoolTop', errors);
  }
  if (!rules.uninvested?.zh || !rules.uninvested?.en) errors.push('缺「uninvested」');
  if (!rules.artCredit?.zh || !rules.artCredit?.en) errors.push('缺「artCredit」');
  for (const n of rules.notAllowed || []) {
    if (!n.zh || !n.en) errors.push(`notAllowed ${n.id}: 缺中英`);
    checkSources(n.sources, sources, `notAllowed ${n.id}`, errors);
  }
  for (const c of rules.conflicts || []) if (!c.zh || !c.en) errors.push(`conflict ${c.id}: 缺中英`);
  return errors;
}
