// v29：帽唔再有黑色層、頭髮唔穿出帽、專章帶喺香港章前面同更斜、幼童軍銅／銀／金邊
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { layout, sashLayout, sashCovers, SASH } from '../src/three/body.js';
import { placeFor, visible } from '../src/three/badgeLayout.js';
import { headSdf, headRadiusAt, hairGeometry, headBandGeometry, beretShape } from '../src/three/anatomy.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const read = (p) => JSON.parse(src(p));
const SECTIONS = ['grasshopper', 'cub', 'scout', 'venture', 'leader'];

function outwardBad(g, axisOnly = false) {
  const P = g.attributes.position, idx = g.index;
  const v = [0, 1, 2].map(() => new THREE.Vector3());
  let bad = 0, n = 0;
  for (let i = 0; i < idx.count; i += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, idx.getX(i + k));
    const nrm = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
    if (nrm.lengthSq() < 1e-10) continue;
    const c = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
    if (axisOnly) c.y = 0;
    n++;
    if (nrm.dot(c) < 0) bad++;
  }
  return bad / Math.max(1, n);
}

test('戴帽：帽口以上嘅頭髮全部收埋入頭皮（唔會穿出帽）；帽口 1.5 cm 以下有返頭髮', () => {
  for (const s of SECTIONS) {
    for (const gender of ['boy', 'girl']) {
      const B = layout(gender, s).B;
      const head = { w: B.head.w, h: B.head.h, d: B.head.d };
      const top = head.h / 2;
      for (const cut of [3.5, 4, 4.5, 5, 5.5]) {
        const g = hairGeometry(head, B.hair, cut);
        const P = g.attributes.position;
        let out = 0, shown = 0;
        for (let i = 0; i < P.count; i++) {
          const p = [P.getX(i), P.getY(i), P.getZ(i)];
          const sdf = headSdf(p, head);
          // 帽口嗰行頭髮最多高過帽口 0.1 cm、離頭皮 < 0.25 cm（帽帶 BAND_GAP），會俾帽帶遮住
          if ((p[1] > top - cut + 1e-6 && sdf > 0.25) || (p[1] > top - cut + 0.1 && sdf > 0.01)) out++;
          if (p[1] < top - cut - 1.6 && sdf > 0.3) shown++;
        }
        assert.equal(out, 0, `${s} ${gender} cut ${cut}：${out} 點喺帽口以上露出頭皮`);
        assert.ok(shown > 50, `${s} ${gender} cut ${cut}：帽口以下要有頭髮`);
      }
      assert.notEqual(hairGeometry(head, B.hair, 4), hairGeometry(head, B.hair, 5.5), '唔同帽口唔共用 cache');
      assert.equal(hairGeometry(head, B.hair, true), hairGeometry(head, B.hair, 4), 'true = 4 cm');
    }
  }
});

test('流線帽帶：貼住個頭一圈（喺頭外面、向外），唔再係大過個頭嘅黑色長方體', () => {
  const B = layout('boy', 'scout').B;
  const head = { w: B.head.w, h: B.head.h, d: B.head.d };
  const y0 = head.h / 2 - 5.5;
  const g = headBandGeometry(head, y0, y0 + 1.2, 0.25, 0.35);
  const P = g.attributes.position;
  let minSdf = Infinity, maxR = 0;
  for (let i = 0; i < P.count; i++) {
    const p = [P.getX(i), P.getY(i), P.getZ(i)];
    minSdf = Math.min(minSdf, headSdf(p, head));
    maxR = Math.max(maxR, Math.hypot(p[0], p[2]));
  }
  assert.ok(minSdf > 0, '帽帶唔會陷入頭');
  assert.ok(maxR < Math.max(head.w, head.d) / 2 + 1, '帽帶貼頭（唔會凸出成舊）');
  assert.ok(outwardBad(g, true) < 0.02, '向外');
  assert.equal(headBandGeometry(head, y0, y0 + 1.2, 0.25, 0.35), g, 'cache');
});

test('流線軟帽：圓帽身由帽帶頂起、包過頭頂；向穿著者右邊（−x）拉低、左邊唔揭起', () => {
  for (const gender of ['boy', 'girl']) {
    const B = layout(gender, 'scout').B;
    const head = { w: B.head.w, h: B.head.h, d: B.head.d };
    const rimY = head.h / 2 - 5.5 + 1.2;
    const { geo, profile, normal } = beretShape(head, rimY);
    for (const th of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const p0 = profile(th, 0);
      assert.ok(Math.hypot(p0[0], p0[2]) > headRadiusAt(th, rimY, head), '帽口喺頭外面');
      assert.ok(Math.abs(p0[1] - rimY) < 1e-9);
      const n = normal(th, 0.3);
      const p = profile(th, 0.3);
      assert.ok(n.x * p[0] + n.z * p[2] > 0, '法線向外');
    }
    assert.ok(profile(0, 1)[1] > head.h / 2, '包過頭頂');
    const right = profile(-Math.PI / 2, 0.25), left = profile(Math.PI / 2, 0.25);
    assert.ok(right[1] < left[1] && -right[0] > left[0], '右邊低啲、脹啲');
    geo.computeBoundingBox();
    assert.ok(geo.boundingBox.max.y < head.h / 2 + 2, '帽頂唔會太高');
  }
});

test('接線：軟帽膠邊收窄（1.2 cm）、流線用貼頭帽帶；女領袖硬帽帽口 3.5 cm；各款帽傳 hatCut 俾頭髮', () => {
  const b = src('src/three/Blocky.jsx');
  assert.match(b, /const BAND_H = 1\.2/);
  assert.match(b, /function HatBand\(/);
  assert.match(b, /headBandGeometry\(/);
  assert.match(b, /beretShape\(/);
  for (const cap of ['SeaCap', 'SeaLeaderCap', 'MessCap']) {
    const body = b.slice(b.indexOf(`function ${cap}(`), b.indexOf('\nfunction ', b.indexOf(`function ${cap}(`) + 10));
    assert.match(body, /<HatBand/, `${cap} 用 HatBand`);
  }
  assert.match(b, /hatInfo\.kind === 'hardHat'\s*\n\s*\? 3\.5/);
  assert.match(b, /hat=\{hatCut\}/);
  const hard = b.slice(b.indexOf('function HardHat('), b.indexOf('function SeaCap('));
  assert.match(hard, /<Box part="hat"/, '硬帽流線都圓');
});

test('專章帶更斜（頂移近膊頭），帶最低點仍然喺右腰', () => {
  for (const gender of ['boy', 'girl']) {
    const L = layout(gender, 'scout');
    const S = sashLayout(L);
    assert.equal(SASH.topOut, 3);
    assert.ok(Math.abs(S.cTop - (S.hw - SASH.topHalfFromEdge + SASH.topOut)) < 1e-9);
    assert.ok((S.theta * 180) / Math.PI > 35, `斜度 ${((S.theta * 180) / Math.PI).toFixed(1)}°`);
    assert.ok(S.y2 < L.B.waist && S.y2 > L.B.torso.y - 3, '最低點喺腰');
    for (const sec of S.sections) assert.ok(sec.ua >= 0 && sec.ub <= 1 && sec.xa >= -S.side - 1e-9 && sec.xb <= S.hw + 1e-9);
    assert.ok(sashCovers(S, S.cTop, S.top - 5));
    assert.ok(!sashCovers(S, -S.hw + 1, S.top - 5), '右膊頂冇帶');
  }
});

test('專章帶喺香港章前面：香港章標 underSash（唔企出、俾帶遮住），冇專章帶就冇', () => {
  const scout = read('src/data/scout_rules_v1.0.json');
  const prof = scout.badges.filter((b) => b.group === 'proficiency').slice(0, 12);
  const st = Object.fromEntries([...prof.map((b) => [b.id, true]), ['hongKong', true], ['membership', true]]);
  for (const gender of ['boy', 'girl']) {
    const out = { gender, invested: true, sash: true };
    const withSash = visible(placeFor(scout, out), st, { invested: true, sash: true });
    const hk = withSash.find((p) => p.id === 'hongKong');
    assert.ok(hk?.underSash, `${gender}：香港章喺帶下面`);
    assert.ok(!withSash.find((p) => p.id === 'membership').underSash, '會員章唔喺帶下面');
    assert.ok(withSash.filter((p) => p.onSash).every((p) => !p.underSash), '帶上面嘅章唔標');
    const noSash = visible(placeFor(scout, out), st, { invested: true, sash: false });
    assert.ok(noSash.every((p) => !p.underSash));
  }
  const badges = src('src/three/Badges.jsx');
  assert.match(badges, /&& !p\.underSash/, 'underSash 唔畫厚度');
});

test('幼童軍銅／銀／金邊：3D 金屬邊框＋深色外線（跟圖案輪廓、流線跟表面屈）；面板揀級掣有色點、縮圖有色框', () => {
  const badges = src('src/three/Badges.jsx');
  assert.match(badges, /export const TIER_FRAME = \{/);
  assert.match(badges, /bronze: \{ rim: '#[0-9a-f]{6}', line: '#[0-9a-f]{6}' \}/);
  assert.match(badges, /silver: \{ rim: '#[0-9a-f]{6}', line: '#[0-9a-f]{6}' \}/);
  assert.match(badges, /gold: \{ rim: '#[0-9a-f]{6}', line: '#[0-9a-f]{6}' \}/);
  assert.match(badges, /p\.art\.startsWith\('\/badges\/cub\/'\)/, '只限幼童軍圖案（領袖英勇獎章、青年獎勵計劃唔加框）');
  assert.match(badges, /bendGeometry\(geo, bend\.matrix, bend\.surf\)/, '流線邊框跟表面屈');
  assert.match(badges, /depthWrite=\{false\}[^\n]*metalness=\{detailed && f\.i/, '邊框唔寫深度（章喺上面）');
  const cub = read('src/data/cub_rules_v1.0.json');
  const tiered = cub.badges.filter((b) => b.choices && ['bronze', 'silver', 'gold'].every((t) => b.choices.some((c) => c.id === t && c.art?.file.startsWith('/badges/cub/'))));
  assert.equal(tiered.length, 11, '4 個核心範疇章＋7 個三級制度章');
  const app = src('src/App.jsx');
  assert.match(app, /const TIERS = new Set\(\['bronze', 'silver', 'gold'\]\)/);
  assert.match(app, /className=\{`tier tier--\$\{c\.id\}`\}/);
  assert.match(app, /tier-ring--\$\{/);
  const css = src('src/styles.css');
  for (const t of ['bronze', 'silver', 'gold']) {
    assert.match(css, new RegExp(`\\.tier--${t} \\{`));
    assert.match(css, new RegExp(`\\.tier-ring--${t} \\{`));
  }
});

test('紀念章示例：2026 香港童軍大會操紀念章（綠邊，7 × 5.1 cm，大會操第 03/2026 號通告），舊色塊已拎走', async () => {
  const { existsSync, statSync } = await import('node:fs');
  const pub = (f) => new URL(`../public${f}`, import.meta.url);
  assert.ok(!existsSync(pub('/badges/handbook_example_commemorative.png')), '舊示例色塊已刪');
  assert.ok(existsSync(pub('/badges/rally2026_green.png')));
  assert.ok(statSync(pub('/badges/rally2026_green.png')).size < 30_000);
  const png = readFileSync(pub('/badges/rally2026_green.png'));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [280, 203]);
  for (const id of ['cub', 'grasshopper', 'leader', 'rover', 'venture', 'scout']) {
    const R = read(`src/data/${id}_rules_v1.0.json`);
    assert.match(R.sources.RALLY.url, /rcr0326c\.pdf$/);
    const b = R.badges.find((x) => x.id === 'commemorative');
    assert.equal(b.art.file, '/badges/rally2026_green.png', id);
    assert.deepEqual(b.art.px, [280, 203]);
    assert.equal(b.size.wCm, 7);
    assert.equal(b.size.hCm, 5.1);
    assert.ok(b.sources.some((s) => s.ref === 'RALLY'));
    assert.ok(Math.abs(b.size.wCm / b.size.hCm - 280 / 203) < 0.02, '比例同圖一樣');
  }
  for (const id of ['cub', 'grasshopper', 'leader', 'rover', 'venture', 'scout']) assert.ok(!src(`src/data/${id}_rules_v1.0.json`).includes('handbook_example_commemorative'));
  assert.match(src('scripts/guard.mjs'), /const DIST_MAX_MB = 10;/, '用戶 v29：dist 上限 10 MB');
});

// v29b
test('童軍支部都有紀念章：右胸袋袋蓋上方 3 cm 中央，喺金紫荊獎章標誌、先修章（緊貼袋蓋）上面，唔重疊', () => {
  const S = read('src/data/scout_rules_v1.0.json');
  const b = S.badges.find((x) => x.id === 'commemorative');
  assert.equal(b.anchor.slot, 'pocketR');
  assert.equal(b.anchor.layer, 'upper');
  assert.ok(S.slots.pocketR.layers.some((L) => L.id === 'upper' && L.gapCm === 3));
  for (const gender of ['boy', 'girl']) {
    const L = layout(gender, 'scout');
    const st = { commemorative: true, emblemBauhinia: true, scoutLink: true, ventureLink: true, membership: true, hongKong: true };
    const out = visible(placeFor(S, { gender, invested: true }), st, { invested: true });
    const c = out.find((p) => p.id === 'commemorative');
    assert.ok(c, gender);
    assert.equal(c.w, 7);
    const flapTop = L.top - L.B.pocket.top;
    assert.ok(Math.abs(c.y - c.h / 2 - (flapTop + 3)) < 0.01, `${gender} 袋蓋上方 3 cm`);
    assert.ok(Math.abs(c.x + L.B.pocket.x) < 0.01, '右胸袋中央');
    for (const id of ['emblemBauhinia', 'scoutLink', 'ventureLink']) {
      const q = out.find((p) => p.id === id);
      assert.ok(q, id);
      assert.ok(q.y + q.h / 2 < c.y - c.h / 2, `${id} 喺紀念章下面`);
    }
  }
});

test('領袖香港特區章（政策通告第 04/2024 號）：7.5 × 5 cm，左胸袋上方，章頂高過所有其他胸前徽章／勳章', async () => {
  const { existsSync } = await import('node:fs');
  const { liftTopmost, TOPMOST_CLEAR, NECKER_GAP, neckerEdgeAt } = await import('../src/three/badgeLayout.js');
  const R = read('src/data/leader_rules_v1.0.json');
  assert.match(R.sources.HKSAR.url, /policycircular_042024/);
  const b = R.badges.find((x) => x.id === 'hksarFlag');
  assert.deepEqual([b.size.wCm, b.size.hCm], [7.5, 5]);
  assert.equal(b.side, 'left');
  assert.equal(b.required, false);
  assert.ok(b.topmost);
  assert.deepEqual(b.uniforms, ['u3', 'u4', 'u5', 'u6'], '同其他成年成員非基本章一樣：恤衫制服');
  assert.ok(existsSync(new URL(`../public${b.art.file}`, import.meta.url)));
  assert.ok(Math.abs(b.art.px[0] / b.art.px[1] - 1.5) < 0.01, '區旗 3:2');
  for (const id of ['cub', 'grasshopper', 'rover', 'venture', 'scout']) assert.ok(!read(`src/data/${id}_rules_v1.0.json`).badges.some((x) => x.id === 'hksarFlag'), '今次淨係領袖');
  const chest = (q) => q.mount === 'torso' && !q.facing && !q.strapCm && q.kind !== 'lanyard' && q.z > 0;
  const cases = [
    { hksarFlag: true, membership: true, nameTag: true },
    { hksarFlag: true, worldScout: true, wings: 'flying', commemorative: true, membership: true },
    { hksarFlag: true, worldScout: true, wings: 'parachute', commemorative: true, nameTag: true },
    { hksarFlag: true, commemorative: true, peace: true, centenary: true, anniv110: true, diamondJubilee: true, millennium: true },
  ];
  for (const gender of ['boy', 'girl']) {
    const L = layout(gender, 'leader');
    for (const uniform of ['u3', 'u6']) {
      for (const st of cases) {
        const out = visible(placeFor(R, { gender, invested: true, uniform }), st, { invested: true });
        const f = out.find((p) => p.id === 'hksarFlag');
        assert.ok(f, `${gender} ${uniform}`);
        const P = L.B.pocket;
        assert.ok(f.x - f.w / 2 >= P.x - P.w / 2 && f.x + f.w / 2 <= P.x + P.w / 2 + 0.01, '喺左胸袋闊度之內');
        assert.ok(f.x + f.w / 2 <= L.B.torso.w / 2 - 2 + 0.01, '離上身邊 ≥ 2 cm');
        const atMax = Math.abs(f.x + f.w / 2 - (L.B.torso.w / 2 - 2)) < 0.01;
        if (!atMax) assert.ok(f.x - f.w / 2 >= neckerEdgeAt(f.clear, f.y + f.h / 2) + NECKER_GAP - 0.01, `${gender} ${uniform} 唔俾旅巾遮`);
        assert.deepEqual([f.w, f.h], [7.5, 5]);
        const top = f.y + f.h / 2;
        for (const q of out.filter((p) => p !== f && chest(p))) assert.ok(top >= q.y + q.h / 2 + TOPMOST_CLEAR - 0.01, `${gender} ${uniform} 高過 ${q.id}`);
        assert.ok(f.y - f.h / 2 >= L.top - L.B.pocket.top + 2, '喺袋蓋上面');
        assert.ok(top < L.top - 1.5, `${gender} ${uniform} 唔超出膊頭`);
        for (const q of out.filter((p) => p !== f && chest(p) && p.x > 0)) {
          const overlap = Math.abs(q.x - f.x) < (q.w + f.w) / 2 && Math.abs(q.y - f.y) < (q.h + f.h) / 2;
          assert.ok(!overlap, `唔同 ${q.id} 重疊`);
        }
      }
    }
  }
  // 冇其他章就唔使升；有就升到高過最高嗰個
  const a = { id: 'x', mount: 'torso', z: 1, x: -9, y: 130, w: 7, h: 5 };
  const f0 = { id: 'hksarFlag', topmost: true, mount: 'torso', z: 1, x: 9, y: 120, w: 7.5, h: 5 };
  assert.equal(liftTopmost([f0])[0].y, 120);
  assert.equal(liftTopmost([f0, a])[0].y, 130.5);
  // 飛行章唔會因為上面有特區章而改用 2 cm
  const out = visible(placeFor(R, { gender: 'boy', invested: true, uniform: 'u3' }), { hksarFlag: true, wings: 'flying' }, { invested: true });
  const w = out.find((p) => p.id === 'wings');
  const L = layout('boy', 'leader');
  assert.ok(Math.abs(w.y - w.h / 2 - (L.top - L.B.pocket.top + 3)) < 0.01);
});
