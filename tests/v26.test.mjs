// v26：「流線」外觀（Hero Forge 咁圓滑嘅公仔，程序生成）— 只改形狀，徽章位置照 badgeLayout 計（ADR-0024）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { layout, sashLayout, sashMesh } from '../src/three/body.js';
import { smoothBox, partShape, surfaceOf, snapToSurface, bendGeometry, BEND_MIN, profileAt, TORSO_PROFILE, LOOKS, DEFAULT_LOOK } from '../src/three/look.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const PARTS = ['torso', 'sleeve', 'head', 'limb', 'hand', 'shoe', 'hat', null];
const SIZES = [[31, 50, 17], [10, 22, 14], [20, 23, 21], [7, 21, 7], [6.5, 13, 5], [24, 30, 12]];

test('流線係預設外觀', () => {
  assert.equal(DEFAULT_LOOK, 'smooth');
  assert.deepEqual(LOOKS, ['smooth'], 'v30：精緻、簡約已刪');
});

test('smoothBox：所有三角形向外（唔會反轉變「入面睇出嚟」）', () => {
  for (const part of PARTS) {
    for (const [w, h, d] of SIZES) {
      for (const taper of [1, 0.82]) {
        const g = smoothBox(w, h, d, { ...partShape(part, w, h, d), taper });
        const P = g.attributes.position;
        const idx = g.index;
        const n = idx ? idx.count : P.count;
        const v = [0, 1, 2].map(() => new THREE.Vector3());
        let bad = 0;
        for (let i = 0; i < n; i += 3) {
          for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, idx ? idx.getX(i + k) : i + k);
          const c = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
          const nrm = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
          if (nrm.lengthSq() < 1e-12) continue;
          if (nrm.dot(c) < 0) bad++;
        }
        assert.equal(bad, 0, `${part} ${w}×${h}×${d} taper ${taper}`);
      }
    }
  }
});

test('smoothBox：唔會大過原本方塊；高度一樣；有六組材質', () => {
  for (const part of PARTS) {
    for (const [w, h, d] of SIZES) {
      const g = smoothBox(w, h, d, partShape(part, w, h, d));
      g.computeBoundingBox();
      const bb = g.boundingBox;
      assert.ok(bb.max.x <= w / 2 + 1e-6 && bb.min.x >= -w / 2 - 1e-6, `${part} x`);
      assert.ok(bb.max.z <= d / 2 + 1e-6 && bb.min.z >= -d / 2 - 1e-6, `${part} z`);
      assert.ok(Math.abs(bb.max.y - h / 2) < 1e-6 && Math.abs(bb.min.y + h / 2) < 1e-6, `${part} y`);
      assert.equal(g.groups.length, 6);
    }
  }
});

test('上身 profile：胸口最闊、腰收窄、下擺少少放返', () => {
  assert.equal(profileAt(TORSO_PROFILE, 0), 1);
  assert.equal(profileAt(TORSO_PROFILE, 0.3), 1);
  assert.ok(profileAt(TORSO_PROFILE, 0.72) < profileAt(TORSO_PROFILE, 1));
  assert.ok(profileAt(TORSO_PROFILE, 0.72) >= 0.9);
  assert.equal(profileAt(null, 0.5), 1);
});

const t = layout('boy', 'scout').B.torso;
const S = surfaceOf('torso', [t.w, t.h, t.d], [0, t.y + t.h / 2, 0]);

test('snapToSurface：胸口平面嘅點唔郁（章嘅 x／y 唔變）', () => {
  for (const [x, y] of [[0, 115], [-6, 112], [6, 108], [0, 100]]) {
    const k = profileAt(TORSO_PROFILE, (t.y + t.h - y) / t.h);
    const q = snapToSurface([x, y, t.d / 2 + 0.15], S);
    assert.equal(q[0], x);
    assert.equal(q[1], y);
    assert.ok(Math.abs(q[2] - (t.d / 2) * k - 0.15) < 1e-9, `z 跟腰身 ${y}`);
  }
});

test('snapToSurface：圓角位向入推返落圓滑表面，離得太遠（maxT）就唔郁', () => {
  const corner = snapToSurface([t.w / 2, 110, t.d / 2 + 0.15], S);
  assert.ok(corner[0] < t.w / 2 && corner[2] < t.d / 2, '向入');
  // 離圓角圓心嘅距離 = rc + 0.15（嗰個高度嘅橫切面按腰身比例 k 縮細）
  const k = profileAt(TORSO_PROFILE, (t.y + t.h - 110) / t.h);
  const r = S.rc * k;
  const dist = Math.hypot(corner[0] - (t.w / 2) * k + r, corner[2] - (t.d / 2) * k + r);
  assert.ok(Math.abs(dist - (r + 0.15)) < 0.02, `dist ${dist}`);
  const far = [t.w / 2 + 5, 110, t.d / 2 + 5];
  assert.deepEqual(snapToSurface(far, S), far);
});

test('bendGeometry：胸口中間嘅章保持平，膊頭圓角嘅章會屈', () => {
  const flat = bendGeometry(new THREE.PlaneGeometry(4, 4, 4, 4), new THREE.Matrix4().makeTranslation(0, 117, t.d / 2 + 0.1), S);
  assert.ok(flat.userData.moved < 0.01, '平面：冇屈');
  assert.ok(BEND_MIN > 0 && BEND_MIN <= 0.1, 'BEND_MIN ≤ 1 mm');
  const waist = bendGeometry(new THREE.PlaneGeometry(4, 4, 4, 4), new THREE.Matrix4().makeTranslation(0, 95, t.d / 2 + 0.1), S);
  assert.ok(waist.userData.moved < BEND_MIN && waist.userData.shift[2] < -0.2, '腰位：成塊向入平移，唔當屈');
  const edge = bendGeometry(new THREE.PlaneGeometry(6, 6, 6, 6), new THREE.Matrix4().makeTranslation(t.w / 2 - 2, 112, t.d / 2 + 0.1), S);
  assert.ok(edge.userData.moved > 0.5);
});

test('專章帶貼返落圓滑上身：圓角位最多推入 0.6 × rc，平面位唔郁', () => {
  const m = sashMesh(sashLayout(layout('boy', 'scout')));
  for (let i = 0; i < m.positions.length; i += 3) {
    const p = m.positions.slice(i, i + 3);
    const q = snapToSurface(p, S, 3);
    assert.ok(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < 0.6 * S.rc);
  }
  // 前幅中間（胸口高度）嘅點：x、y 唔變
  const q = snapToSurface([0, 115, t.d / 2 + 0.15], S, 3);
  assert.deepEqual(q.slice(0, 2), [0, 115]);
});

test('接線：Box 用 part；章、專章帶、笛繩喺流線模式先貼；badgeLayout 唔理外觀', () => {
  const b = src('src/three/Blocky.jsx');
  assert.match(b, /return smoothBox\(w, h, d, \{ \.\.\.partShape\(/);
  assert.doesNotMatch(b, /roundedBox|plainBox|useSmooth|useDetailed/);
  assert.match(b, /<Box part=\{torsoPart\}/);
  assert.match(b, /<Box part="head"/);
  assert.match(b, /surf=\{torsoSurf\}/);
  assert.match(b, /surf=\{sleeveSurf\}/);
  assert.match(b, /lanyardsShown = useMemo\(/);
  const badges = src('src/three/Badges.jsx');
  assert.match(badges, /bendGeometry/);
  assert.doesNotMatch(src('src/three/badgeLayout.js'), /look\.js|smooth|detailed/);
  const i18n = src('src/i18n.jsx');
  assert.equal((i18n.match(/'view\.lookSmooth'/g) || []).length, 0, 'v30：冇外觀掣');
  assert.equal((i18n.match(/'view\.figureB'/g) || []).length, 2);
});
