// 用戶自選嘅徽章圖案：區章／地域章、優異旅團章年份 — v1.0 · © SCOUT SYSTEM
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

/** 全部區（排好次序，方便做選單） */
export function allDistricts(data) {
  return data.regions.flatMap((region) => region.districts.map((district) => ({ district, region })));
}

/**
 * 某個章而家用邊個圖案。
 * - 普通章：{ kind: 'image', file }
 * - 區章／地域章：揀咗嘅區；未揀 = 手冊示例；冇地域章（例如總會總部屬下）= null（唔顯示）
 * - 優異旅團章：{ kind: 'merit', year, colour, base, digits, text }
 * picks = { districtId, meritYear }
 */
export function resolveArt(badge, picks, data) {
  const fallback = { kind: 'image', file: Array.isArray(badge.art) ? badge.art[0].file : badge.art.file, example: !!badge.art.example };
  if (badge.dynamic === 'district' || badge.dynamic === 'region') {
    const hit = picks?.districtId ? findDistrict(data, picks.districtId) : null;
    if (!hit) return fallback; // 未揀區：手冊示例色塊
    if (badge.dynamic === 'district') return { kind: 'image', file: hit.district.file, example: false, district: hit.district, region: hit.region };
    if (!hit.region.badge) return null;
    return { kind: 'image', file: hit.region.badge.file, example: false, district: hit.district, region: hit.region };
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
