// 用戶自選嘅徽章圖案：區章／地域章、優異旅團章年份、童軍小隊章 — v1.0 · © SCOUT SYSTEM
// 純計數（冇 DOM），build 同 node --test 共用。資料（districts_v1.0.json）由外面傳入。

/** 優異旅團章顏色：每 3 年輪一次，1999 = 紅、2000 = 紫、2001 = 藍（手冊 P.159：2016 藍、2017 紅、2018 紫） */
export const MERIT_START = 1999;
export const MERIT_COLOURS = ['red', 'purple', 'blue'];
export function meritColour(year) {
  const y = Math.trunc(Number(year));
  if (!Number.isFinite(y)) return null;
  return MERIT_COLOURS[(((y - MERIT_START) % 3) + 3) % 3];
}

/** 年份合唔合理（計劃 1999 年開始；最多去到明年） */
export function meritYearOk(year, now = new Date()) {
  const y = Number(year);
  return Number.isInteger(y) && y >= MERIT_START && y <= now.getFullYear() + 1;
}

/**
 * 優異旅團章底圖（手冊 P.159 三個顏色，數字位已抹走）同數字位置。
 * digits = 原本「2016」等年份數字喺圖入面嘅框（0–1，左、上、右、下）；text = 原本字色。
 */
export const MERIT_ART = {
  red: { file: '/badges/meritorious_base_red.png', digits: [0.0885, 0.2922, 0.3312, 0.7032], text: '#ffca93' },
  purple: { file: '/badges/meritorious_base_purple.png', digits: [0.0816, 0.2911, 0.3285, 0.7136], text: '#f6cdaf' },
  blue: { file: '/badges/meritorious_base_blue.png', digits: [0.0816, 0.3009, 0.3326, 0.7315], text: '#d4d793' },
};

/** 搵區：回傳 { district, region }；搵唔到 = null */
export function findDistrict(data, id) {
  for (const region of data.regions) {
    const district = region.districts.find((d) => d.id === id);
    if (district) return { district, region };
  }
  return null;
}

/** 搵小隊（patrols_v1.0.json）；搵唔到 = null */
export function findPatrol(patrols, id) {
  return patrols?.patrols?.find((p) => p.id === id) ?? null;
}

/** 全部區（排好次序，方便做選單） */
export function allDistricts(data) {
  return data.regions.flatMap((region) => region.districts.map((district) => ({ district, region })));
}

/**
 * 某個章而家用邊個圖案。
 * - 普通章：{ kind: 'image', file }
 * - 區章／地域章：揀咗嘅區；未揀 = 手冊示例；冇地域章（例如總會總部屬下）= null（唔顯示）
 * - 優異旅團章：{ kind: 'merit', year, colour, base, digits, text }
 * - 童軍小隊章：揀咗嘅小隊（綱要 P.200–202 圖案）；未揀 = 示例（獾）
 * picks = { districtId, meritYear, patrolId }；patrols = patrols_v1.0.json
 */
export function resolveArt(badge, picks, data, patrols = null) {
  const fallback = { kind: 'image', file: Array.isArray(badge.art) ? badge.art[0].file : badge.art.file, example: !!badge.art.example };
  if (badge.dynamic === 'district' || badge.dynamic === 'region') {
    const hit = picks?.districtId ? findDistrict(data, picks.districtId) : null;
    if (!hit) return fallback; // 未揀區：手冊示例色塊
    if (badge.dynamic === 'district') return { kind: 'image', file: hit.district.file, example: false, district: hit.district, region: hit.region };
    if (!hit.region.badge) return null;
    return { kind: 'image', file: hit.region.badge.file, example: false, district: hit.district, region: hit.region };
  }
  if (badge.dynamic === 'patrol') {
    const patrol = picks?.patrolId ? findPatrol(patrols, picks.patrolId) : null;
    if (!patrol) return fallback;
    return { kind: 'image', file: patrol.file, example: false, patrol };
  }
  if (badge.dynamic === 'rank') {
    const row = rankRowOf(badge, picks?.rank);
    if (!row) return fallback;
    return { kind: 'image', file: row.art.file, example: false, row };
  }
  if (badge.dynamic === 'metalRank') {
    // 晚禮服金屬職級肩章（手冊 P.206–211）：夏季白、冬季黑
    const row = rankRowOf(badge, picks?.rank);
    if (!row) return fallback;
    const season = picks?.season === 'summer' ? 'summer' : 'winter';
    return { kind: 'image', file: row.art[season].file, example: false, row, season };
  }
  if (badge.dynamic === 'nameTag') {
    // 布質名牌（手冊 P.128）：綠底黃字中英文姓名；未輸入就用手冊示例圖
    const zh = cleanName(picks?.nameZh, 8);
    const en = cleanName(picks?.nameEn, 24).toUpperCase();
    if (!zh && !en) return { ...fallback, example: true };
    return { kind: 'nameTag', zh, en, example: false };
  }
  if (badge.dynamic === 'meritorious') {
    const year = Math.trunc(Number(picks?.meritYear));
    const colour = meritColour(year);
    if (!colour) return null;
    const a = MERIT_ART[colour];
    return { kind: 'merit', year, colour, base: a.file, digits: a.digits, text: a.text, example: false };
  }
  return fallback;
}

/** 名牌姓名：去走控制字元、頭尾空白，限長度 */
export function cleanName(v, max) {
  return String(v ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .trim()
    .slice(0, max);
}

/* ---------- 成年成員：單位層級、職級（手冊 P.94–95、P.103–105） ---------- */

/** 職級肩章章（dynamic = 'rank'）入面，某個職級屬於邊一行（肩章 + 帽章）；搵唔到 = null */
export function rankRowOf(badge, rankId) {
  return badge?.rows?.find((r) => r.ranks.includes(rankId)) ?? null;
}

/** 某個層級可以揀嘅職級（次序跟規則 JSON，即手冊 P.103–104 表格次序） */
export function ranksFor(rules, level) {
  return (rules?.ranks || []).filter((r) => r.levels.includes(level));
}

/** 職級唔屬於呢個層級（例如由旅轉去總部）→ 改做呢個層級第一個職級 */
export function fixRank(rules, level, rankId) {
  const list = ranksFor(rules, level);
  return list.some((r) => r.id === rankId) ? rankId : list[0]?.id ?? null;
}

/** 揀咗嘅職級嘅帽章（職級帽章；海童軍領袖用海童軍領袖帽章，唔經呢度） */
export function rankCap(rules, rankId) {
  const b = (rules?.badges || []).find((x) => x.dynamic === 'rank');
  return rankRowOf(b, rankId)?.cap ?? null;
}

/** 晚禮服黑色硬帽（手冊 P.206–211）：揀咗嘅職級用邊個編號（UM01–06、LM01–04）；女裝 M 改 F */
export function messCapOf(rules, rankId, gender = 'boy') {
  const b = (rules?.badges || []).find((x) => x.dynamic === 'metalRank');
  const row = rankRowOf(b, rankId);
  const cap = (rules?.messCaps || []).find((c) => c.id === row?.cap);
  if (!cap) return null;
  return { ...cap, code: gender === 'girl' ? cap.id.replace('M', 'F') : cap.id };
}

/**
 * 成年成員領巾、巾圈、木章（手冊 P.108–111、P.115–116）：
 * - 旅巾：旅成員；會巾：總會總部／地域／區幹部、會務委員、專業領袖、受薪職員（旅層級唔可以揀）；
 * - 基維爾領巾：木章持有人（同時戴基維爾巾圈同木章）；
 * - 基維爾巾圈：完成木章訓練系統第 4 階段（training = 'basic' 或 'woodBadge'）；
 * - 木章：完成第 6 階段並獲頒木章（training = 'woodBadge'）；助理領袖訓練主任 3 顆、領袖訓練主任 4 顆木珠，其餘 2 顆。
 * 揀咗唔合資格嘅選項會自動退返（例如由區轉返旅，會巾變旅巾）。
 */
export function leaderNeckwear(rules, outfit, picks) {
  const training = ['none', 'basic', 'woodBadge'].includes(outfit?.training) ? outfit.training : 'none';
  const level = picks?.level ?? 'group';
  const evening = outfit?.uniform === 'u2'; // 晚禮服唔戴木章（手冊 P.116）
  const allowed = { association: level !== 'group', gilwell: training === 'woodBadge', gilwellWoggle: training !== 'none', woodBadge: training === 'woodBadge' && !evening };
  let necker = outfit?.leaderNecker ?? 'unit';
  if (!['unit', 'association', 'gilwell'].includes(necker) || (necker === 'association' && !allowed.association) || (necker === 'gilwell' && !allowed.gilwell)) {
    necker = 'unit';
  }
  const gilwell = necker === 'gilwell';
  const rank = (rules?.ranks || []).find((r) => r.id === picks?.rank);
  return {
    training,
    necker,
    allowed,
    gilwellWoggle: gilwell || (allowed.gilwellWoggle && outfit?.leaderWoggle === 'gilwell'),
    woodBadge: !evening && (gilwell || (allowed.woodBadge && !!outfit?.woodBadge)),
    beads: rank?.woodBadgeBeads ?? 2,
    trainer: !!rank?.trainingTeam,
  };
}
