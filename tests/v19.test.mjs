// v19：嘉許笛繩穿過職級肩章下面（用戶相片 image-11）；110 周年、童心抗疫、同行未來（用戶提供官方參考圖） — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { validateRules } from '../src/data/validate.js';
import { placeFor, visible } from '../src/three/badgeLayout.js';
import { layout, strapLayout, lanyardPoints, RANK_SLIDE_H } from '../src/three/body.js';

const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const rules = JSON.parse(text('src/data/leader_rules_v1.0.json'));
const badge = (id) => rules.badges.find((b) => b.id === id);
const outfit = (u, extra = {}) => ({ gender: 'boy', uniform: `u${u}`, invested: true, ...extra });
const shown = (u, state, extra) => visible(placeFor(rules, outfit(u, extra)), state, { invested: true, level: 'group' });
const pngSize = (file) => {
  const buf = readFileSync(new URL(`../public${file}`, import.meta.url));
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
};

/* ---------- 笛繩路線 ---------- */

for (const [gender, sweater] of [['male', false], ['girl', false], ['male', true]]) {
  test(`嘉許笛繩（${gender}${sweater ? '＋毛衣' : ''}）：由左肩職級肩章下面穿出，兜過膊頭、沿袖窿前面落到胸袋下面，再上左胸袋口`, () => {
    const L = layout(gender, 'leader');
    const S = strapLayout(L, { sweater });
    const thick = 0.55;
    const z = L.B.torso.d / 2 + 0.3;
    const pts = lanyardPoints({ L, strap: S, z, thick });
    const slideC = S.outer - 0.3 - RANK_SLIDE_H / 2;
    const slideY = S.base + S.t + 0.04; // badgeLayout：職級肩章面
    // 頭兩點喺職級肩章下面：x 喺肩章範圍入面、繩面低過肩章、喺肩帶闊度入面（前後）
    for (const p of pts.slice(0, 2)) {
      assert.ok(Math.abs(p[0] - slideC) < RANK_SLIDE_H / 2, `x ${p[0]} 喺肩章下面`);
      assert.ok(p[1] + thick / 2 <= slideY + 1e-9, '繩面唔可以高過肩章');
      assert.ok(p[1] + thick / 2 > S.base + S.t - 0.1, '繩貼住肩帶面（肩章同肩帶中間）');
    }
    assert.ok(pts[0][2] < 0 && pts[1][2] >= S.w / 2, '由肩帶前邊穿出');
    // 唔再由衣領那頭（肩帶內端）出發
    assert.ok(Math.min(...pts.slice(0, 3).map((p) => p[0])) > S.cx, '起點喺膊頭嗰半，唔係衣領');
    // 兜過袖頂前邊：唔可以插入袖頂
    const edge = pts[2];
    assert.ok(edge[1] >= L.top, '袖頂邊喺袖頂上面');
    assert.ok(edge[2] >= L.B.sleeve.d / 2 - 1e-9, '袖頂前邊');
    // 沿袖窿前面吊落：x 近身邊（唔斜過心口）
    const P = L.B.pocket;
    const flapTop = L.top - P.top;
    const pocketBottom = flapTop - P.h;
    const low = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
    assert.ok(low[1] < pocketBottom, '吊落到胸袋下面');
    for (const p of pts.slice(4, -2)) assert.ok(p[0] > P.x + P.w / 2, '落嘅一段喺胸袋外側（袖窿前面）');
    // 尾：左胸袋口近中線（笛子由胸袋口右方放入）
    const end = pts.at(-1);
    assert.ok(Math.abs(end[1] - flapTop) < 0.5);
    assert.ok(end[0] < P.x && end[0] > P.x - P.w / 2);
    assert.ok(pts.every((p) => p[0] > 0), '全部喺左邊（+X）');
  });
}

test('嘉許笛繩：有職級肩章就跟佢個位（slideX）；晚禮服小型笛繩一樣由肩章下面起，去左襟領', () => {
  const L = layout('male', 'leader');
  const S = strapLayout(L);
  const pts = lanyardPoints({ L, strap: S, z: 9.5, thick: 0.55, slideX: 23.9 });
  assert.equal(pts[0][0], 23.9);
  const D = { fleur: { x: 8, y: 128, size: 2 } };
  const mini = lanyardPoints({ L, strap: S, D, z: 9.5, thick: 0.3 });
  assert.equal(mini.length, 4);
  assert.ok(mini[0][1] + 0.15 <= S.base + S.t + 0.04 + 1e-9);
  assert.deepEqual(mini.at(-1), [8.4, 124.5, 9.5]);
  // 職級肩章 placement 同 RANK_SLIDE_H 一致
  assert.equal(badge('epaulette').size.hCm, RANK_SLIDE_H);
  const ep = placeFor(rules, outfit(3)).find((p) => p.key === 'epaulette-l');
  assert.ok(Math.abs(ep.x - (S.outer - 0.3 - RANK_SLIDE_H / 2)) < 1e-9);
});

test('Blocky：笛繩用 lanyardPoints＋四元數（3D 方向），唔再由肩帶內端斜落心口', () => {
  const src = text('src/three/Blocky.jsx');
  assert.match(src, /const args = \{ L, strap, D: p\.mini \? D : null, z, thick, slideX: slide\?\.x \}/);
  assert.match(src, /lanyardPoints\(args\)/); // v20：再加 lanyardBackPoints(args)
  assert.match(src, /setFromUnitVectors\(up, dir\)/);
  assert.doesNotMatch(src, /strap\.inner \+ 2\.6/);
});

/* ---------- 新獎章 ---------- */

test('110 周年紀念章：銀（第 20 位）／銅（第 30 位）只戴一個；圖片由用戶提供（ACR 來源）', () => {
  assert.deepEqual(validateRules(rules), []);
  const b = badge('anniv110');
  assert.deepEqual(b.choices.map((c) => c.id), ['none', 'bronze', 'silver']);
  assert.equal(b.choices.find((c) => c.id === 'silver').order, 20);
  assert.equal(b.choices.find((c) => c.id === 'bronze').order, 30);
  assert.equal(b.default, 'none');
  const v = shown(3, { anniv110: 'silver' }).filter((p) => p.id === 'anniv110');
  assert.equal(v.length, 1);
  assert.equal(v[0].art, '/badges/awards/anniv110Silver.png');
  assert.ok(rules.sources.ACR);
});

test('童心抗疫（21）、同行未來（22）、110 特別貢獻（26）：單一獎章；冇星章', () => {
  assert.equal(badge('healthGuard').rackOrder, 21);
  assert.equal(badge('walkTogether').rackOrder, 22);
  assert.equal(badge('sp110').rackOrder, 26);
  assert.equal(badge('healthGuard').zh.name, '「香港童軍 – 童心抗疫」徽章');
  assert.equal(badge('walkTogether').zh.name, '同行未來—香港童軍大露營紀念章');
  assert.match(badge('sp110').zh.conditions, /唔分星數/);
  assert.ok(!JSON.stringify(rules.badges).includes('anniv110Star'), '星章用戶決定唔加');
});

test('新獎章圖檔：存在、px 一致、細（< 60 KB）、user 旗；勳條 160 × 48', () => {
  const ids = ['anniv110', 'healthGuard', 'walkTogether', 'sp110'];
  let n = 0;
  for (const id of ids) {
    const b = badge(id);
    for (const c of b.choices ? b.choices.filter((x) => x.art) : [b]) {
      assert.equal(c.art.ref, 'ACR');
      assert.equal(c.art.user, true);
      assert.deepEqual(pngSize(c.art.file), c.art.px);
      assert.ok(statSync(new URL(`../public${c.art.file}`, import.meta.url)).size < 60_000);
      assert.deepEqual(pngSize(c.ribbon.file), [160, 48]);
      assert.equal(c.ribbon.user, true);
      n++;
    }
  }
  assert.equal(n, 5);
});

test('禮服勳章架：按等級由內至外 — 百周年 19 → 110 銀 20 → 童心抗疫 21 → 同行未來 22 → 110 特別貢獻 26 → 110 銅（換）30', () => {
  const v = shown(3, { centenary: 'bronze', anniv110: 'silver', healthGuard: true, walkTogether: true, sp110: true }).filter((p) => p.rack);
  assert.equal(v.length, 5);
  assert.deepEqual(v.map((p) => p.order).sort((a, b) => a - b), [19, 20, 21, 22, 26]);
  assert.deepEqual(new Set(v.map((p) => p.id)), new Set(['centenary', 'anniv110', 'healthGuard', 'walkTogether', 'sp110']));
});

test('一般場合：新獎章都變勳條，110 銅排喺長期服務前面', () => {
  const v = shown(3, { anniv110: 'bronze', healthGuard: true, walkTogether: true, longService: 'one' }, { occasion: 'general' }).filter((p) => p.kind === 'ribbon');
  assert.equal(v.length, 4);
  const arts = v.map((p) => p.art).sort();
  assert.deepEqual(arts, ['/badges/ribbons/anniv110_bronze.png', '/badges/ribbons/healthGuard.png', '/badges/ribbons/longService_one.png', '/badges/ribbons/walkTogether.png']);
  const b = v.find((p) => p.id === 'anniv110');
  const ls = v.find((p) => p.id === 'longService');
  // 上面一行 = n % 3 個最高等級（童心抗疫 21）；下面一行由內至外：同行未來 22 → 110 銅 30 → 長期服務 31
  assert.equal(b.row, ls.row);
  assert.ok(b.x > ls.x, '110 銅（30）喺長期服務（31）內側');
});
