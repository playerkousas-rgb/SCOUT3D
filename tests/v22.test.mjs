// v22：深資童軍非基本章（2026 年 8 月版綱要 + 手冊 P.170 附圖）＋ 模範童軍肩帶（手冊 P.158）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { validateRules } from '../src/data/validate.js';
import { placeAll, placeFor, visible, shownReason, sleeveFace } from '../src/three/badgeLayout.js';
import { layout, strapLayout, lanyardPoints, lanyardBackPoints, LANYARD_COLOURS } from '../src/three/body.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const pub = (f) => new URL(`../public${f}`, import.meta.url);
const venture = read('src/data/venture_rules_v1.0.json');
const scout = read('src/data/scout_rules_v1.0.json');
const rover = read('src/data/rover_rules_v1.0.json');
const leader = read('src/data/leader_rules_v1.0.json');
const OUTFIT = { gender: 'boy', invested: true };
const BASIC = { membership: true, hongKong: true, troop: true, region: true, district: true, meritorious: true, epaulette: 'venture' };
const EXTRAS = venture.badges.filter((b) => b.group === 'extra');
// 全部非基本章開（有選項就揀最後一個 = 最高級）；熄紀念章（v24b 前同和平使者章爭位，保留原有測試狀態）
const ALL = { ...BASIC, ...Object.fromEntries(EXTRAS.map((b) => [b.id, b.choices ? b.choices[b.choices.length - 1].id : true])), commemorative: false };
// PNG 闊高（IHDR）同第一粒像素（RGBA、第一行嘅濾鏡唔會改第一粒）
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
function firstPixel(buf) {
  const idat = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    if (buf.toString('ascii', o + 4, o + 8) === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  assert.equal(buf[25], 6, 'RGBA');
  return [...inflateSync(Buffer.concat(idat)).subarray(1, 5)];
}
const by = (list, id) => list.filter((p) => p.id === id);
const one = (list, id) => list.find((p) => p.id === id);

test('四個規則檔驗證 0 錯', () => {
  for (const r of [venture, scout, rover, leader]) assert.deepEqual(validateRules(r), [], r.section.id);
});

test('深資童軍非基本章：綱要 2026 新段章、金帶、深資童軍獎章／榮譽童軍獎章（Dragon Scout Award）', () => {
  const ids = EXTRAS.map((b) => b.id);
  for (const k of ['Project', 'Service', 'Activity', 'Exploration']) {
    assert.ok(ids.includes(`stage${k}`) && ids.includes(`bar${k}`), k);
    assert.equal(one(venture.badges, `bar${k}`).requires, `stage${k}`, '金帶跟段章');
  }
  assert.deepEqual(['活動策劃段章', '社會服務段章', '多元技能段章', '戶外探險段章'], ['Project', 'Service', 'Activity', 'Exploration'].map((k) => one(venture.badges, `stage${k}`).zh.name));
  const award = one(venture.badges, 'ventureAward');
  assert.deepEqual(award.choices.map((c) => c.id), ['none', 'venture', 'dragon']);
  assert.equal(award.choices[2].zh.name, '榮譽童軍獎章');
  assert.equal(award.choices[2].en.name, 'Dragon Scout Award');
  for (const id of ['firstAid', 'community', 'faith', 'peace', 'emblemBauhinia', 'emblemChief', 'ventureLink', 'wings', 'serviceStar', 'airCrew', 'seaBadge', 'hkayp', 'lifesaving', 'modelScout', 'earthTribe', 'worldScout', 'citizenGreen']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('emblemScoutAward'), '榮譽童軍獎章標誌係深資童軍自己嘅獎章，唔喺深資童軍制服戴');
  assert.ok(venture.conflicts.some((c) => c.id === 'v22VentureFigure'));
  assert.ok(venture.review.userChecks.some((u) => u.item === 'v22VentureExtras'));
  assert.ok(!venture.notAllowed.some((n) => n.id === 'activityBadges'));
  for (const b of EXTRAS) assert.equal(b.sweater, false, `${b.id} 唔戴喺制服毛衣`);
});

test('圖案：檔案存在、px 啱、細過 480 KB；深資童軍服務年星紅色（手冊 P.129）', () => {
  const arts = venture.badges.flatMap((b) => [b.art, ...(b.choices || []).map((c) => c.art)]).filter((a) => a && a.px);
  for (const a of arts) {
    assert.ok(existsSync(pub(a.file)), a.file);
    assert.ok(statSync(pub(a.file)).size < 480_000, a.file);
    assert.deepEqual(pngSize(readFileSync(pub(a.file))), a.px, a.file);
  }
  const [r, g, b] = firstPixel(readFileSync(pub('/badges/extra/service_star_venture_3.png')));
  assert.ok(r > 180 && g < 70 && b < 70, `紅底 ${r},${g},${b}`);
});

// v24b：深資童軍議會最新附圖 —— 右袖唔再戴急救章同社區參與章；地域章／區章喺旅章下 2 cm，下面一行世界童軍組織徽章（4 cm）最多四個
test('右袖：地域章／區章喺旅章下 2 cm；下面一行世界童軍組織徽章同積極公民最多四個；冇急救章', () => {
  const all = placeFor(venture, OUTFIT);
  const on = visible(all, ALL, { invested: true });
  const troop = one(on, 'troop');
  assert.ok(!on.some((p) => p.id === 'firstAid' && p.mount === 'r'), '右袖冇急救章');
  const region = one(on, 'region');
  const district = one(on, 'district');
  assert.ok(Math.abs(region.v - region.h / 2 - (troop.v + troop.h / 2 + 2)) < 1e-9, '旅章下 2 cm');
  assert.ok(region.u > 0 && district.u < 0, '地域章前、區章後');
  assert.ok(Math.abs(region.u - region.w / 2 - (district.u + district.w / 2) - 1) < 1e-9, '相距 1 cm（手冊 P.95）');
  const row = on.filter((p) => p.slot?.layer === 'row');
  assert.equal(row.length, 4);
  assert.equal(row[0].id, 'earthTribe');
  assert.ok(!row.some((p) => p.id === 'community'), '社區參與章唔喺右袖');
  for (const p of row) assert.ok(p.v - p.h / 2 > region.v + region.h / 2, `${p.id} 喺地域章下面`);
  assert.equal(shownReason(venture, OUTFIT, ALL, 'citizenGreen'), 'slotFull');
});

test('急救章：只戴左袖、樂行童軍新圖案（深資童軍議會附圖）', () => {
  const on = visible(placeFor(venture, OUTFIT), ALL, { invested: true });
  const aid = by(on, 'firstAid');
  assert.deepEqual(aid.map((p) => p.mount), ['l']);
  assert.equal(aid[0].art, '/badges/extra/rover_first_aid.png');
  assert.equal(one(venture.badges, 'firstAid').alsoAnchor, undefined);
  const L = aid[0];
  assert.ok(Math.abs(L.u) < 0.05, '左袖中間');
  const air = on.find((p) => p.id === 'airCrew');
  const sea = on.find((p) => p.id === 'seaBadge');
  assert.ok(air.u < 0 && sea.u > 0, '左袖：u − = 前面 → 航空前、海上後');
  const hkayp = one(on, 'hkayp');
  const ls = one(on, 'lifesaving');
  assert.ok(hkayp.v < L.v && L.v < ls.v, '香港青年獎勵計劃 → 急救章 → 拯溺布章（由上至下）');
});

test('段章＋金帶：左袖下面兩行兩欄，金帶喺段章下面，最底一行貼住袖口縫線（手冊 P.170 附圖）', () => {
  const face = sleeveFace('boy', 'venture');
  const on = visible(placeFor(venture, OUTFIT), ALL, { invested: true });
  const g = (id) => one(on, id);
  for (const k of ['Activity', 'Exploration']) assert.ok(Math.abs(g(`bar${k}`).v + g(`bar${k}`).h / 2 - (face.cuffSeam - 0.2)) < 1e-9, `${k} 金帶貼袖口縫線`);
  for (const k of ['Project', 'Service', 'Activity', 'Exploration']) {
    const s = g(`stage${k}`);
    const b = g(`bar${k}`);
    assert.equal(s.mount, 'l');
    assert.equal(s.u, b.u, '同一欄');
    assert.ok(b.v - b.h / 2 > s.v + s.h / 2 - 0.5, '金帶喺段章下面');
  }
  assert.ok(g('stageProject').u < 0 && g('stageService').u > 0, '活動策劃近前、社會服務近後');
  assert.ok(g('stageProject').v < g('stageActivity').v, '活動策劃喺上行');
  // 金帶要先有段章
  const noStage = visible(placeFor(venture, OUTFIT), { ...ALL, stageService: false }, { invested: true });
  assert.equal(one(noStage, 'barService'), undefined);
  assert.equal(shownReason(venture, OUTFIT, { ...ALL, stageService: false }, 'barService'), 'needsStage');
});

test('全部開：同一面嘅章唔重疊（袖、胸前），全部喺袖外側入面', () => {
  const face = sleeveFace('boy', 'venture');
  const on = visible(placeFor(venture, OUTFIT), ALL, { invested: true }).filter((p) => p.kind !== 'lanyard' && p.facing !== 'up');
  const rect = (p) => (p.mount === 'torso' ? [p.x - p.w / 2, p.x + p.w / 2, p.y - p.h / 2, p.y + p.h / 2] : [p.u - p.w / 2, p.u + p.w / 2, p.v - p.h / 2, p.v + p.h / 2]);
  for (let i = 0; i < on.length; i++) {
    for (let j = i + 1; j < on.length; j++) {
      const [a, b] = [on[i], on[j]];
      if (a.mount !== b.mount) continue;
      const [A, B] = [rect(a), rect(b)];
      const ov = Math.min(A[1], B[1]) - Math.max(A[0], B[0]) > 0.01 && Math.min(A[3], B[3]) - Math.max(A[2], B[2]) > 0.01;
      assert.ok(!ov, `${a.key} 同 ${b.key} 重疊`);
    }
  }
  for (const p of on.filter((q) => q.mount !== 'torso')) {
    assert.ok(Math.abs(p.u) + p.w / 2 <= face.width / 2 + 1e-9, `${p.key} 出咗袖`);
    assert.ok(p.v + p.h / 2 <= face.cuffSeam + 1e-9, `${p.key} 落咗袖口`);
  }
});

test('胸前：右胸袋袋蓋上金紫荊（外）→ 總領袖 → 深資童軍先修章 → 樂行童軍先修章（內）；宗教章喺紀念章內側；左胸袋服務年星、飛行章、香港章', () => {
  const { B, top } = layout('boy', 'venture');
  const flapTop = top - B.pocket.top;
  // v29b：香港特區章另外測（tests/v29.test.mjs；位唔夠時會迫細章距）—— 呢度驗手冊位置
  const on = visible(placeFor(venture, OUTFIT), { ...ALL, hksarFlag: false }, { invested: true });
  const [bau, chief, link, rlink] = ['emblemBauhinia', 'emblemChief', 'ventureLink', 'roverLink'].map((id) => one(on, id));
  assert.ok(bau.x < chief.x && chief.x < link.x && link.x < rlink.x && rlink.x < 0, '右胸（x −）：外 → 內');
  for (const p of [bau, chief, link, rlink]) assert.ok(Math.abs(p.y - p.h / 2 - flapTop) < 1e-9, `${p.id} 緊貼袋蓋`);
  const faith = one(on, 'faith');
  const comm = one(visible(placeFor(venture, OUTFIT), { ...ALL, commemorative: true }, { invested: true }), 'commemorative');
  assert.ok(faith.x > comm.x, '宗教章內側（近中線）');
  assert.ok(Math.abs(faith.y - faith.h / 2 - (flapTop + 3)) < 1e-9, '袋蓋上方 3 cm');
  assert.equal(one(on, 'ventureAward').x, -B.pocket.x, '進度性獎章喺右胸袋中央');
  const [star, wings, hk] = ['serviceStar', 'wings', 'hongKong'].map((id) => one(on, id));
  assert.ok(Math.abs(star.y - star.h / 2 - flapTop) < 1e-9);
  assert.ok(Math.abs(wings.y - wings.h / 2 - (flapTop + 2)) < 1e-9, '飛行章喺袋蓋上方 2 cm');
  assert.ok(hk.y - hk.h / 2 >= wings.y + wings.h / 2, '香港章喺飛行章上面');
  // 只得香港章：照舊袋蓋上方 3 cm
  const basic = visible(placeFor(venture, OUTFIT), BASIC, { invested: true });
  const hk0 = one(basic, 'hongKong');
  assert.ok(Math.abs(hk0.y - hk0.h / 2 - (flapTop + 3)) < 1e-9);
});

test('制服毛衣：非基本章同模範童軍肩帶都唔戴', () => {
  const ids = new Set(visible(placeFor(venture, { ...OUTFIT, sweater: true }), ALL, { invested: true }).map((p) => p.id));
  for (const b of EXTRAS) assert.ok(!ids.has(b.id), b.id);
  assert.equal(shownReason(venture, { ...OUTFIT, sweater: true }, ALL, 'modelScout'), 'sweater');
});

test('模範童軍肩帶：童軍、深資、樂行、成年成員（編號 3–6）；右肩、末端扣喺右胸袋袋蓋左方（手冊 P.158）', () => {
  for (const r of [scout, venture, rover, leader]) {
    const b = one(r.badges, 'modelScout');
    assert.ok(b, r.section.id);
    assert.equal(b.side, 'right');
    assert.equal(b.anchor.lanyard, true);
    assert.equal(b.anchor.lanyardEnd, 'flapInner');
    assert.deepEqual(b.choices.map((c) => c.id), ['none', 'modelScout']);
    assert.equal(b.sources[0].page, '158');
  }
  const lb = one(leader.badges, 'modelScout');
  assert.deepEqual(lb.uniforms, ['u3', 'u4', 'u5', 'u6'], '唔戴喺禮服、晚禮服');
  assert.deepEqual(lb.hiddenBy, ['commendation'], '同嘉許笛繩只揀一條');
  const st = { modelScout: 'modelScout', commendation: 'high' };
  const shown = visible(placeFor(leader, { gender: 'boy', uniform: 'u3' }), st, { invested: true, level: 'group' });
  assert.ok(!shown.some((p) => p.id === 'modelScout') && shown.some((p) => p.id === 'commendation'));
  assert.equal(shownReason(leader, { gender: 'boy', uniform: 'u3' }, st, 'modelScout', { level: 'group' }), 'replaced_commendation');
  const alone = visible(placeFor(leader, { gender: 'boy', uniform: 'u3' }), { modelScout: 'modelScout' }, { invested: true, level: 'group' });
  const p = one(alone, 'modelScout');
  assert.equal(p.kind, 'lanyard');
  assert.equal(p.end, 'flapInner');
  assert.ok(p.x < 0, '右邊');
  assert.equal(by(placeFor(leader, { gender: 'boy', uniform: 'u1' }), 'modelScout').length, 0, '禮服冇');
  assert.equal(by(placeFor(leader, { gender: 'boy', uniform: 'u4', sweater: true }), 'modelScout').length, 0, '毛衣冇');
  assert.ok(LANYARD_COLOURS.modelScout[0].c && LANYARD_COLOURS.modelScout[0].alt, '綠／黃扭紋');
});

test('模範童軍肩帶路線：左肩笛繩左右反轉；末端喺右胸袋袋蓋近中線嗰邊；童軍冇肩帶用 virtual 肩帶', () => {
  for (const section of ['venture', 'scout']) {
    const L = layout('boy', section);
    const P = L.B.pocket;
    const strap = strapLayout(L) ?? strapLayout(L, { virtual: true });
    assert.ok(strap, section);
    if (section === 'scout') assert.equal(strapLayout(L), null, '童軍模型冇畫肩帶');
    const args = { L, strap, z: L.B.torso.d / 2 + 0.3, thick: 0.55 };
    const right = lanyardPoints({ ...args, side: -1, end: 'flapInner' });
    const leftSame = lanyardPoints({ ...args, end: 'flapInner' });
    right.forEach((pt, i) => assert.deepEqual(pt, [-leftSame[i][0], leftSame[i][1], leftSame[i][2]]));
    const end = right[right.length - 1];
    const flapTop = L.top - P.top;
    assert.ok(end[0] < 0 && end[0] > -P.x, `${section} 末端喺右胸袋近中線嗰邊`);
    assert.ok(end[0] > -(P.x + P.w / 2) && end[0] < -(P.x - P.w / 2), '喺袋蓋闊度入面');
    assert.ok(end[1] < flapTop && end[1] > flapTop - P.flap, '喺袋蓋高度入面');
    const back = lanyardBackPoints({ ...args, side: -1 });
    assert.ok(back.every((pt) => pt[0] <= 0.0001), '後面一段都喺右邊');
    // 嘉許笛繩（左肩、袋口）唔變
    const comm = lanyardPoints(args);
    assert.ok(comm[comm.length - 1][0] > 0);
    assert.ok(Math.abs(comm[comm.length - 1][1] - (flapTop + 0.1)) < 1e-9);
  }
});

test('Blocky：右肩肩帶、扭紋、穗；童軍用 virtual 肩帶', () => {
  const src = text('src/three/Blocky.jsx');
  assert.match(src, /strap \?\? strapLayout\(L, \{ virtual: true \}\)/);
  assert.match(src, /epaulette-\$\{side < 0 \? 'r' : 'l'\}/);
  assert.match(src, /tasselPoints\(paths\[0\]\)/);
  assert.match(src, /k\.alt && i % 2 \? k\.alt : k\.c/);
});

test('說明：其他獎章說明分支部；規定分頁有深資童軍同模範童軍肩帶', () => {
  const app = text('src/App.jsx');
  assert.match(app, /venture: 'badges\.extraNoteVenture', scout: 'badges\.extraNoteScout'/);
  const guide = text('src/rulesGuide.js');
  for (const k of ['badges.extraNoteVenture', 'badges.extraNoteScout', 'badge.why.needsStage', 'badge.why.replaced_commendation']) assert.ok(guide.includes(`'${k}'`), k);
  const i18n = text('src/i18n.jsx');
  for (const k of ['badges.extraNoteVenture', 'badges.extraNoteScout', 'badge.why.needsStage', 'badge.why.replaced_commendation']) assert.equal(i18n.split(`'${k}'`).length - 1, 2, `${k} 中英都有`);
});

test('用戶回覆：以前支部嘅服務年星並排（手冊 P.130 附圖）——本支部最內側，向外按支部由高至低', () => {
  const pairs = [
    [venture, ['serviceStar', 'serviceStarScout', 'serviceStarCub', 'serviceStarGrasshopper'], [6, 5, 4, 3]],
    [rover, ['serviceStar', 'serviceStarVenture', 'serviceStarScout', 'serviceStarCub', 'serviceStarGrasshopper'], [7, 6, 5, 4, 3]],
  ];
  const { B, top } = layout('boy', 'venture');
  for (const [r, ids, max] of pairs) {
    ids.forEach((id, i) => {
      const b = one(r.badges, id);
      assert.equal(b.group, 'extra', id);
      assert.equal(b.choices.length - 1, max[i], `${id} 年數`);
      assert.equal(b.default, 'none');
      for (const c of b.choices.slice(1)) assert.ok(existsSync(pub(c.art.file)), c.art.file);
    });
    const st = Object.fromEntries(ids.map((id) => [id, 'three']));
    const on = visible(placeFor(r, OUTFIT), st, { invested: true }).filter((p) => ids.includes(p.id));
    assert.equal(on.length, ids.length, r.section.id);
    const xs = ids.map((id) => one(on, id).x);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], `${ids[i]} 喺 ${ids[i - 1]} 外側`);
    const mid = (xs[0] + xs[xs.length - 1]) / 2;
    assert.ok(Math.abs(mid - B.pocket.x) < 1e-9, '成行喺袋蓋中央');
    for (const p of on) assert.ok(Math.abs(p.y - p.h / 2 - (top - B.pocket.top)) < 1e-9, `${p.id} 緊貼袋蓋`);
  }
  const [r, g, b] = firstPixel(readFileSync(pub('/badges/extra/service_star_scout_2.png')));
  assert.ok(g > r && g > b, `綠色 ${r},${g},${b}`);
  assert.ok(!one(venture.notAllowed, 'preEntry').zh.includes('服務年星'));
});

test('用戶回覆：空勤員章、海上活動徽章深資同樂行同一個章（唔再標示例）；段章按考獲先後', () => {
  for (const id of ['airCrew', 'seaBadge']) {
    const b = one(venture.badges, id);
    for (const c of b.choices.slice(1)) assert.equal(c.art.example, false, `${id} ${c.id}`);
    assert.match(b.zh.conditions, /深資童軍同樂行童軍用同一個章/);
  }
  for (const k of ['Project', 'Service', 'Activity', 'Exploration']) assert.match(one(venture.badges, `stage${k}`).zh.place, /邊個考先就戴先/);
  assert.match(one(venture.conflicts, 'v22VentureFigure').zh, /以綱要為準（較新），綱要冇寫嘅跟手冊/);
});
