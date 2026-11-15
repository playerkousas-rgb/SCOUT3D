// SCOUT3D 規則資料驗證（build 時同 node --test 共用）— v1.0 · © SCOUT SYSTEM
// 防呆（F）：資料唔齊就 fail closed，唔會靜靜出一個冇來源嘅「權威」位置。

const STATUSES = new Set(['documented', 'pending', 'verified']);
const SIDES = new Set(['left', 'right', 'centre', 'both']); // both = 雙肩（深資童軍肩章）
const SHAPES = new Set(['circle', 'square', 'rect']);
const PARTS = new Set(['torso', 'sleeve', 'shoulder']); // shoulder = 套喺肩帶上
const DYNAMIC = new Set(['district', 'region', 'meritorious', 'patrol', 'rank']); // rank = 成年成員職級肩章（跟所揀職級）
const ART_FILE = /^\/badges\/((districts|patrols|leader)\/)?[\w-]+\.png$/;
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

  // 支部入面嘅制服款式（例：童軍／海童軍／空童軍）：只可以換走已有嘅衣物，徽章一樣
  const garmentIds = new Set((rules.garments || []).map((g) => g.id));
  const variantIds = new Set();
  for (const v of rules.variants || []) {
    const w = `variant ${v.id}`;
    if (!/^[a-z]+$/.test(v.id || '')) errors.push(`${w}: id 格式錯`);
    if (variantIds.has(v.id)) errors.push(`${w}: id 重複`);
    variantIds.add(v.id);
    bilingual(v, ['name', 'note'], w, errors);
    checkSources(v.sources, sources, w, errors);
    if (!Array.isArray(v.garments)) errors.push(`${w}: garments 要係陣列`);
    for (const g of v.garments || []) {
      const wg = `${w} garment ${g.id}`;
      if (!garmentIds.has(g.id)) errors.push(`${wg}: 只可以換走基本衣物入面已有嘅 id`);
      bilingual(g, ['name', 'rule'], wg, errors);
      checkSources(g.sources, sources, wg, errors);
      if (!STATUSES.has(g.status)) errors.push(`${wg}: status 錯`);
    }
  }
  if (rules.variants && rules.variants[0]?.garments?.length) errors.push('第一個 variant 要係基本款（garments 空白）');

  // 成年成員：單位層級、職級、制服編號
  const levelIds = new Set((rules.levels || []).map((l) => l.id));
  for (const l of rules.levels || []) {
    if (!/^[a-z]+$/.test(l.id || '')) errors.push(`level ${l.id}: id 格式錯`);
    bilingual(l, ['name', 'note'], `level ${l.id}`, errors);
    checkSources(l.sources, sources, `level ${l.id}`, errors);
  }
  const rankIds = new Set();
  for (const r of rules.ranks || []) {
    const w = `rank ${r.id}`;
    if (!/^[a-zA-Z]+$/.test(r.id || '') || rankIds.has(r.id)) errors.push(`${w}: id 錯或重複`);
    rankIds.add(r.id);
    bilingual(r, ['name'], w, errors);
    checkSources(r.sources, sources, w, errors);
    if (!Array.isArray(r.levels) || !r.levels.length || r.levels.some((x) => !levelIds.has(x))) errors.push(`${w}: levels 要係已登記嘅層級`);
  }
  for (const l of levelIds) if (rules.ranks && !(rules.ranks || []).some((r) => r.levels.includes(l))) errors.push(`level ${l}: 冇職級`);
  for (const u of rules.uniforms || []) {
    const w = `uniform ${u.id}`;
    if (!/^u\d+$/.test(u.id || '')) errors.push(`${w}: id 格式錯`);
    bilingual(u, ['name', 'note'], w, errors);
    checkSources(u.sources, sources, w, errors);
    if (!Array.isArray(u.genders) || !u.genders.length) errors.push(`${w}: genders 空白`);
    for (const g of u.genders || []) if (!u.legwear?.[g]) errors.push(`${w}: 冇 ${g} 嘅 legwear`);
  }

  const badgeIds = new Set((rules.badges || []).map((b) => b.id));
  const hasSweaterGarment = (rules.garments || []).some((g) => g.id === 'sweater');
  for (const b of rules.badges || []) {
    const w = `badge ${b.id}`;
    if (ids.has(b.id)) errors.push(`${w}: id 重複`);
    ids.add(b.id);
    bilingual(b, ['name', 'place', 'quote', 'conditions'], w, errors);
    checkSources(b.sources, sources, w, errors);
    if (!SIDES.has(b.side)) errors.push(`${w}: side 必須以穿著者角度寫「left/right/centre/both」`);
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
    if ((a.part === 'shoulder') !== (b.side === 'both')) errors.push(`${w}: 雙肩（side both）同 part shoulder 要一齊用`);
    if (a.part === 'torso' && a.pocket == null && !(Number.isFinite(a.xCm) && Number.isFinite(a.fromTopCm))) errors.push(`${w}: 上身位置要有 xCm + fromTopCm 或 pocket`);
    if (a.pocket != null && !POCKET.has(a.pocket)) errors.push(`${w}: anchor.pocket 錯`);
    if (a.towards != null && (!TOWARDS.has(a.towards) || !(a.offsetCm > 0))) errors.push(`${w}: anchor.towards 要係 front/back 兼有 offsetCm`);
    if (b.dynamic != null && !DYNAMIC.has(b.dynamic)) errors.push(`${w}: dynamic 錯`);
    if (b.levels != null && (!Array.isArray(b.levels) || !b.levels.length || b.levels.some((x) => !levelIds.has(x)))) errors.push(`${w}: levels 要係已登記嘅層級`);
    if (a.onBadge != null && (!badgeIds.has(a.onBadge) || a.part !== 'shoulder' || !Number.isFinite(a.alongCm))) errors.push(`${w}: onBadge 要指向肩上嘅章兼有 alongCm`);
    if (a.upTowards != null && a.upTowards !== 'collar') errors.push(`${w}: upTowards 只可以係 collar`);
    // 職級肩章：每個職級要喺其中一行（一個肩章 + 一個帽章），兩個圖案都要有官方來源
    if (b.dynamic === 'rank') {
      if (!Array.isArray(b.rows) || !b.rows.length) errors.push(`${w}: rank 要有 rows`);
      const seen = new Map();
      for (const row of b.rows || []) {
        for (const x of [row.art, row.cap]) {
          if (!x || !ART_FILE.test(x.file || '') || !sources[x.ref] || !x.page) errors.push(`${w}: row ${row.id} 圖案要寫官方文件來源同頁碼`);
        }
        if (!row.cap?.zh || !row.cap?.en) errors.push(`${w}: row ${row.id} 帽章顏色缺中英`);
        for (const r of row.ranks || []) {
          if (!rankIds.has(r)) errors.push(`${w}: row ${row.id} 職級 ${r} 未登記`);
          if (seen.has(r)) errors.push(`${w}: 職級 ${r} 重複（${seen.get(r)}、${row.id}）`);
          seen.set(r, row.id);
        }
      }
      for (const r of rankIds) if (!seen.has(r)) errors.push(`${w}: 職級 ${r} 冇肩章`);
    }
    // 制服毛衣（手冊 P.122）：有毛衣嘅支部，每個章都要講明戴唔戴得喺毛衣上
    if (hasSweaterGarment && typeof b.sweater !== 'boolean') errors.push(`${w}: 有制服毛衣嘅支部要寫 sweater（true/false）`);
    // 選項（例：深資童軍肩章「未考獲／深資童軍肩章」）：每個選項要有中英名；有圖案就要有官方來源；預設要係其中一個
    if (b.choices != null) {
      if (!Array.isArray(b.choices) || b.choices.length < 2) errors.push(`${w}: choices 最少要兩個`);
      const cids = new Set();
      for (const c of b.choices || []) {
        if (!/^[a-z]+$/.test(c.id || '') || cids.has(c.id)) errors.push(`${w}: choice id「${c.id}」錯或重複`);
        cids.add(c.id);
        if (!c.zh?.name || !c.en?.name) errors.push(`${w}: choice ${c.id} 缺中英名`);
        if (c.art && (!/^\/badges\/[\w-]+\.png$/.test(c.art.file || '') || !sources[c.art.ref] || !c.art.page)) errors.push(`${w}: choice ${c.id} 圖案要寫官方文件來源同頁碼`);
      }
      if (!cids.has(b.default)) errors.push(`${w}: default 要係 choices 其中一個`);
      if (!(b.choices || []).some((c) => !c.art)) errors.push(`${w}: choices 要有一個「冇章」選項`);
    }
    // 圖案一定要來自官方文件（唔可以自己設計）
    const arts = Array.isArray(b.art) ? b.art : b.art ? [b.art] : [];
    if (!arts.length) errors.push(`${w}: 冇徽章圖案（art）`);
    for (const art of arts) {
      if (!ART_FILE.test(art.file || '')) errors.push(`${w}: art.file 格式錯`);
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

/** 某個制服款式嘅衣物清單：基本衣物，再用 variant 嘅同 id 衣物換走（次序不變） */
export function garmentsFor(rules, variantId) {
  const v = (rules.variants || []).find((x) => x.id === variantId);
  if (!v) return rules.garments || [];
  const over = new Map(v.garments.map((g) => [g.id, g]));
  return (rules.garments || []).map((g) => over.get(g.id) ?? g);
}

/** 款式 id 唔存在就用第一個（基本款） */
export function variantOf(rules, variantId) {
  const list = rules.variants || [];
  return list.find((x) => x.id === variantId) ?? list[0] ?? null;
}
