// SCOUT3D 規則資料驗證（build 時同 node --test 共用）— v1.0 · © SCOUT SYSTEM
// 防呆（F）：資料唔齊就 fail closed，唔會靜靜出一個冇來源嘅「權威」位置。

const STATUSES = new Set(['documented', 'pending', 'verified']);
const SIDES = new Set(['left', 'right', 'centre', 'both']); // both = 雙肩（深資童軍肩章）
const SHAPES = new Set(['circle', 'square', 'rect']);
const PARTS = new Set(['torso', 'sleeve', 'shoulder', 'neck']); // shoulder = 套喺肩帶上；neck = 掛頸（卓越服務勳章）
// rank = 成年成員職級肩章（跟所揀職級）；metalRank = 晚禮服金屬職級肩章（跟職級 + 夏季／冬季）；nameTag = 布質名牌（用戶輸入姓名）
const DYNAMIC = new Set(['district', 'region', 'meritorious', 'patrol', 'rank', 'metalRank', 'nameTag', 'troop']);
const ART_FILE = /^\/badges\/((districts|patrols|leader|awards|ribbons|extra)\/)?[\w-]+\.png$/;
/** 勳條圖：官方相下面嗰條（或者用戶提供），要有來源、頁碼同 px 尺寸 */
const ribbonOkWith = (sources) => (r) => !!r && ART_FILE.test(r.file || '') && !!sources[r.ref] && !!r.page && r.px?.[0] > 0 && r.px?.[1] > 0;
const POCKET = new Set(['centre', 'aboveFlap', 'flap']); // flap = 袋蓋中央（布質名牌、感謝章）
const RACKS = new Set(['pocket', 'lapel']); // 勳章排：禮服右胸袋袋蓋上方／晚禮服右襟領童軍徽上方
const SEASONS = ['summer', 'winter'];
const CAP_TRIMS = new Set(['oak2', 'oak1', 'cord', 'none', 'rim']);
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
  const ribbonOk = ribbonOkWith(sources);
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
    if (u.seasons != null && (!Array.isArray(u.seasons) || u.seasons.some((x) => !SEASONS.includes(x)))) errors.push(`${w}: seasons 只可以係 summer／winter`);
  }
  const uniformIds = new Set((rules.uniforms || []).map((u) => u.id));
  // 晚禮服黑色硬帽編號（手冊 P.206–211）
  const capIds = new Set();
  for (const c of rules.messCaps || []) {
    const w = `messCap ${c.id}`;
    if (!/^[UL]M\d\d$/.test(c.id || '') || capIds.has(c.id)) errors.push(`${w}: id 錯或重複`);
    capIds.add(c.id);
    if (!CAP_TRIMS.has(c.trim) || !['silver', 'gold'].includes(c.metal)) errors.push(`${w}: trim／metal 錯`);
    if (!c.zh || !c.en) errors.push(`${w}: 缺中英`);
    checkSources(c.sources, sources, w, errors);
  }

  const badgeIds = new Set((rules.badges || []).map((b) => b.id));
  // v21 slots：每行要有 part／side、layers（id 唔重複、gapCm ≥ 0、max 正整數）、中英說明同來源
  const FROM = new Set(['inner', 'outer', 'front', 'back']);
  for (const [k, d] of Object.entries(rules.slots || {})) {
    const w = `slot ${k}`;
    if (!['torso', 'sleeve'].includes(d.part) || !['left', 'right'].includes(d.side)) errors.push(`${w}: part／side 錯`);
    if (!Array.isArray(d.layers) || !d.layers.length) errors.push(`${w}: 冇 layers`);
    const seen = new Set();
    for (const l of d.layers || []) {
      if (!l.id || seen.has(l.id)) errors.push(`${w}: layer id 錯或重複`);
      seen.add(l.id);
      if (!(l.gapCm >= 0) || (l.max != null && !(Number.isInteger(l.max) && l.max > 0)) || (l.from != null && !FROM.has(l.from))) errors.push(`${w}: layer ${l.id} 設定錯`);
    }
    if (d.part === 'sleeve' && d.fromShoulderCm == null && !badgeIds.has(d.belowBadge)) errors.push(`${w}: 袖要有 fromShoulderCm 或 belowBadge`);
    if (!d.zh || !d.en) errors.push(`${w}: 缺中英說明`);
    checkSources(d.sources, sources, w, errors);
  }
  const hasSweaterGarment = (rules.garments || []).some((g) => g.id === 'sweater');
  for (const b of rules.badges || []) {
    const w = `badge ${b.id}`;
    /** 位置：上身要有 xCm + fromTopCm、pocket、rack（勳章排）、lanyard（笛繩）或 lapel（晚禮服襟領）其中一樣 */
    const checkAnchor = (x, where) => {
      if (!PARTS.has(x.part)) errors.push(`${where}: anchor.part 錯`);
      if (x.part === 'torso' && x.pocket == null && x.rack == null && !x.lanyard && x.lapel == null && x.slot == null && !(Number.isFinite(x.xCm) && Number.isFinite(x.fromTopCm))) {
        errors.push(`${where}: 上身位置要有 xCm + fromTopCm、pocket、rack、lanyard、lapel 或 slot`);
      }
      // v21 slot（佩戴位置「行」）：要已登記、層要存在、要有 rank；圖案要有 px（並排要知闊度）
      if (x.slot != null) {
        const def = (rules.slots || {})[x.slot];
        if (!def) errors.push(`${where}: slot ${x.slot} 未登記`);
        else {
          if (def.part !== x.part || def.side !== x.side) errors.push(`${where}: slot ${x.slot} 嘅 part／side 唔一致`);
          const layers = new Set(def.layers.map((l) => l.id));
          const ls = b.choices ? b.choices.filter((c) => c.art).map((c) => c.layer ?? x.layer) : [x.layer];
          if (ls.some((l) => !layers.has(l))) errors.push(`${where}: slot 層唔存在`);
          const rk = b.choices ? b.choices.filter((c) => c.art).map((c) => c.rank ?? x.rank) : [x.rank];
          if (rk.some((r) => !Number.isInteger(r))) errors.push(`${where}: slot 要有 rank（整數）`);
          const arts = b.choices ? b.choices.filter((c) => c.art).map((c) => c.art) : [b.art];
          if (arts.some((ar) => !(ar?.px?.[0] > 0 && ar?.px?.[1] > 0))) errors.push(`${where}: slot 章嘅圖案要有 px 尺寸`);
        }
      }
      if (x.pocket != null && !POCKET.has(x.pocket)) errors.push(`${where}: anchor.pocket 錯`);
      if (x.flapInnerCm != null && (x.pocket !== 'flap' || !(x.flapInnerCm >= 0))) errors.push(`${where}: anchor.flapInnerCm 只可以配 pocket: flap（cm ≥ 0）`);
      if (x.rack != null && (!RACKS.has(x.rack) || !b.choices && !b.art?.px)) errors.push(`${where}: anchor.rack 錯（勳章要有 px 尺寸）`);
      if (x.lapel != null && (x.lapel !== 'belowFleur' || !(x.gapCm >= 0))) errors.push(`${where}: anchor.lapel 只可以係 belowFleur（要有 gapCm）`);
      if (x.band && (x.part !== 'sleeve' || !Number.isFinite(x.aboveElbowCm))) errors.push(`${where}: band（袖圈）要喺袖上兼有 aboveElbowCm`);
      if (x.part === 'neck' && x.side !== 'centre') errors.push(`${where}: 掛頸要 side centre`);
    };
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
    if (b.uniforms != null && (!Array.isArray(b.uniforms) || !b.uniforms.length || b.uniforms.some((x) => !uniformIds.has(x)))) errors.push(`${w}: uniforms 要係已登記嘅制服編號`);
    for (const [u, ab] of Object.entries(b.anchorBy || {})) {
      if (!uniformIds.has(u) || !(b.uniforms || []).includes(u)) errors.push(`${w}: anchorBy ${u} 要係呢個章戴嘅制服`);
      checkAnchor(ab, `${w} anchorBy ${u}`);
    }
    const a = b.anchor || {};
    checkAnchor(a, w);
    // v22：alsoAnchor = 同一個章第二個位置（例：深資童軍急救章兩隻袖都戴）；lanyardEnd = 笛繩／肩帶末端
    if (b.alsoAnchor != null) checkAnchor(b.alsoAnchor, `${w} alsoAnchor`);
    if (a.lanyardEnd != null && (!a.lanyard || !['pocketMouth', 'flapInner'].includes(a.lanyardEnd))) errors.push(`${w}: lanyardEnd 只可以係 pocketMouth／flapInner（要配 lanyard）`);
    if (b.requires != null && !badgeIds.has(b.requires)) errors.push(`${w}: requires 指向不存在嘅章`);
    if (a.side !== b.side) errors.push(`${w}: anchor.side 同「side」唔一致`);
    if (a.rack && !b.choices && !(Number.isInteger(b.rackOrder) && b.rackOrder > 0)) errors.push(`${w}: 單一勳章要有 rackOrder`);
    if (a.belowBadge && !badgeIds.has(a.belowBadge)) errors.push(`${w}: belowBadge 指向不存在嘅章`);
    if (a.aboveBadge && !badgeIds.has(a.aboveBadge)) errors.push(`${w}: aboveBadge 指向不存在嘅章`);
    if ((a.part === 'shoulder') !== (b.side === 'both')) errors.push(`${w}: 雙肩（side both）同 part shoulder 要一齊用`);
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
    // 晚禮服金屬職級肩章：每個職級一行（夏季白、冬季黑兩個圖案 + 晚禮服黑色硬帽編號）
    if (b.dynamic === 'metalRank') {
      const seen = new Set();
      for (const row of b.rows || []) {
        for (const ss of SEASONS) {
          const x = row.art?.[ss];
          if (!x || !ART_FILE.test(x.file || '') || !sources[x.ref] || !x.page) errors.push(`${w}: row ${row.id} ${ss} 圖案要寫官方文件來源同頁碼`);
        }
        if (!capIds.has(row.cap)) errors.push(`${w}: row ${row.id} 硬帽編號 ${row.cap} 未登記`);
        if (!row.zh?.epaulette || !row.en?.epaulette) errors.push(`${w}: row ${row.id} 缺中英`);
        for (const r of row.ranks || []) {
          if (!rankIds.has(r) || seen.has(r)) errors.push(`${w}: row ${row.id} 職級 ${r} 未登記或重複`);
          seen.add(r);
        }
      }
      for (const r of rankIds) if (!seen.has(r)) errors.push(`${w}: 職級 ${r} 冇金屬肩章`);
    }
    // 制服毛衣（手冊 P.122）：有毛衣嘅支部，每個章都要講明戴唔戴得喺毛衣上
    if (hasSweaterGarment && typeof b.sweater !== 'boolean') errors.push(`${w}: 有制服毛衣嘅支部要寫 sweater（true/false）`);
    // 選項（例：深資童軍肩章「未考獲／深資童軍肩章」）：每個選項要有中英名；有圖案就要有官方來源；預設要係其中一個
    if (b.choices != null) {
      if (!Array.isArray(b.choices) || b.choices.length < 2) errors.push(`${w}: choices 最少要兩個`);
      const cids = new Set();
      for (const c of b.choices || []) {
        if (!/^[a-z][a-zA-Z]*$/.test(c.id || '') || cids.has(c.id)) errors.push(`${w}: choice id「${c.id}」錯或重複`);
        cids.add(c.id);
        if (!c.zh?.name || !c.en?.name) errors.push(`${w}: choice ${c.id} 缺中英名`);
        if (c.art && (!ART_FILE.test(c.art.file || '') || !sources[c.art.ref] || !c.art.page)) errors.push(`${w}: choice ${c.id} 圖案要寫官方文件來源同頁碼`);
        if (c.art && (b.anchor?.rack || b.anchor?.part === 'neck') && !(c.art.px?.[0] > 0 && c.art.px?.[1] > 0)) errors.push(`${w}: choice ${c.id} 要有 px 尺寸（排勳章用）`);
        if (c.art && b.anchor?.rack && !(Number.isInteger(c.order) && c.order > 0)) errors.push(`${w}: choice ${c.id} 要有 P.191–192 等級 order`);
        // 一般場合勳條（手冊 P.190、P.194）：有 ribbons 設定嘅支部，每個勳章選項都要有勳條圖（官方相下面嗰條）
        if (c.art && rules.ribbons && (b.anchor?.rack || b.anchor?.part === 'neck') && !ribbonOk(c.ribbon)) errors.push(`${w}: choice ${c.id} 要有勳條圖（ribbon：來源、頁碼、px）`);
      }
      if (!cids.has(b.default)) errors.push(`${w}: default 要係 choices 其中一個`);
      if (!(b.choices || []).some((c) => !c.art)) errors.push(`${w}: choices 要有一個「冇章」選項`);
    }
    if (rules.ribbons && b.anchor?.rack && !b.choices && !ribbonOk(b.ribbon)) errors.push(`${w}: 要有勳條圖（ribbon：來源、頁碼、px）`);
    // 圖案一定要來自官方文件（唔可以自己設計）
    const arts = Array.isArray(b.art) ? b.art : b.art ? [b.art] : [];
    if (!arts.length) errors.push(`${w}: 冇徽章圖案（art）`);
    for (const art of arts) {
      if (!ART_FILE.test(art.file || '')) errors.push(`${w}: art.file 格式錯`);
      if (!sources[art.ref] || !art.page) errors.push(`${w}: art 要寫官方文件來源同頁碼`);
    }
  }

  // 一般場合勳條設定（手冊 P.190、P.194–195）
  const R = rules.ribbons;
  if (R) {
    const uids = new Set((rules.uniforms || []).map((u) => u.id));
    if (!Array.isArray(R.uniforms) || !R.uniforms.length || R.uniforms.some((u) => !uids.has(u))) errors.push('ribbons.uniforms 要係已有嘅制服編號');
    if (!(R.wCm > 0 && R.hCm > 0 && Number.isInteger(R.perRow) && R.perRow > 0 && R.aboveFlapCm >= 0)) errors.push('ribbons 尺寸／每行數目錯');
    if (!R.zh?.name || !R.en?.name || !R.zh?.quote || !R.en?.quote) errors.push('ribbons 缺中英名或原文');
    checkSources(R.sources, sources, 'ribbons', errors);
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
