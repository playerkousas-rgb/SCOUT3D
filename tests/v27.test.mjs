// v27：流線細節（立體頭髮、手指、耳仔、鼻）＋手機版面（ADR-0025）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { layout } from '../src/three/body.js';
import { headSdf, headRadius, hairDrop, hairGeometry, pigtailGeometry, handLayout, capsule } from '../src/three/anatomy.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SECTIONS = ['grasshopper', 'cub', 'scout', 'venture', 'leader'];

function outwardBad(g, centre = [0, 0, 0], axisOnly = false) {
  const P = g.attributes.position, idx = g.index;
  const v = [0, 1, 2].map(() => new THREE.Vector3());
  let bad = 0, n = 0;
  for (let i = 0; i < idx.count; i += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, idx.getX(i + k));
    const nrm = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
    if (nrm.lengthSq() < 1e-10) continue;
    const c = v[0].clone().add(v[1]).add(v[2]).divideScalar(3).sub(new THREE.Vector3(...centre));
    if (axisOnly) c.y = 0;
    n++;
    if (nrm.dot(c) < 0) bad++;
  }
  return bad / Math.max(1, n);
}

test('headSdf：中心喺入面、面同頂喺表面', () => {
  const head = { w: 20, h: 23, d: 21 };
  assert.ok(headSdf([0, 0, 0], head) < 0);
  assert.ok(Math.abs(headSdf([0, 0, 10.5], head)) < 1e-9);
  assert.ok(Math.abs(headSdf([0, 11.5, 0], head)) < 1e-9);
  assert.ok(Math.abs(headRadius([0, 0, 1], head) - 10.5) < 1e-6);
});

test('髮腳：男仔前短後長、女仔後面長啲；瀏海喺前面', () => {
  const h = 23;
  assert.ok(hairDrop(0, 'short', h) < hairDrop(Math.PI, 'short', h));
  assert.ok(hairDrop(Math.PI, 'pigtails', h) > hairDrop(Math.PI, 'short', h));
  assert.ok(hairDrop(0, 'short', h) < 7, '額頭見到');
  assert.ok(hairDrop(Math.PI / 2, 'short', h) <= 10, '男仔耳仔見到');
});

test('頭髮殼：包住個頭（唔會陷入面）、向外', () => {
  for (const s of SECTIONS) {
    for (const gender of ['boy', 'girl']) {
      const B = layout(gender, s).B;
      const head = { w: B.head.w, h: B.head.h, d: B.head.d };
      for (const hat of [false]) { // v29：戴帽時帽口以上嘅頭髮收埋入頭皮（tests/v29.test.mjs）
        const g = hairGeometry(head, B.hair, hat);
        const P = g.attributes.position;
        const row = 32; // NV + 2
        let inside = 0, total = 0;
        for (let i = 0; i < P.count; i++) {
          if (i % row === row - 1) continue; // 摺入頭皮嗰行
          total++;
          if (headSdf([P.getX(i), P.getY(i), P.getZ(i)], head) < 0.05) inside++;
        }
        assert.equal(inside, 0, `${s} ${gender} hat ${hat}: ${inside}/${total} 點陷入頭`);
        g.computeBoundingBox();
        assert.ok(g.boundingBox.max.y - head.h / 2 < (hat ? 1 : 1.6), '頂唔會太厚（帽戴得落）');
        assert.ok(outwardBad(g) < 0.02, `${s} ${gender} 向外`);
      }
    }
  }
});

test('孖辮：向外、上幼中脹尾尖', () => {
  const g = pigtailGeometry(12, 2.3);
  assert.ok(outwardBad(g, [0, 0, 0], true) < 0.01);
  g.computeBoundingBox();
  assert.ok(Math.abs(g.boundingBox.min.y + 12) < 1e-6 && g.boundingBox.max.y === 0);
});

test('手：四隻手指＋拇指；手指喺手掌闊度入面、左右對稱', () => {
  const B = layout('boy', 'scout').B;
  const L = handLayout(B.hand, 1), R = handLayout(B.hand, -1);
  assert.equal(L.fingers.length, 4);
  const breadth = L.palm[2];
  for (const f of L.fingers) assert.ok(Math.abs(f.z) + f.r <= breadth / 2 + 0.3);
  assert.ok(L.fingers[0].z > L.fingers[3].z, '食指喺前面');
  L.fingers.forEach((f, i) => assert.equal(f.segs[0].rot, -R.fingers[i].segs[0].rot));
  assert.equal(L.thumb.rotZ, -R.thumb.rotZ);
  assert.ok(L.thumb.z > 0, '拇指喺前面');
  const cap = capsule(0.7, 3);
  cap.computeBoundingBox();
  assert.ok(Math.abs(cap.boundingBox.max.y) < 1e-6 && Math.abs(cap.boundingBox.min.y + 3) < 1e-6);
});

test('接線：流線先用立體頭髮／手指；流線嘅頭冇畫頭髮', () => {
  const b = src('src/three/Blocky.jsx');
  // v30：只剩流線，一定用立體頭髮同手指
  assert.match(b, /<SmoothHand size=/);
  assert.match(b, /<SmoothHead head=\{h\} style=\{B\.hair\} hat=\{hatCut\}/);
  assert.doesNotMatch(b, /pigtailFaces|handFaces/);
  assert.match(b, /head: headFaces\(B\)/);
  // 冇章喺頭／手：badgeLayout 唔識 anatomy
  assert.doesNotMatch(src('src/three/badgeLayout.js'), /anatomy/);
});

test('手機：3D 區上下掃可以捲頁；打橫時面板喺右邊；觸控提示', () => {
  const css = src('src/styles.css');
  assert.match(css, /\.stage \.scene \{[^}]*touch-action: pan-y;/);
  assert.match(css, /\.stage \.scene canvas \{\s*touch-action: pan-y !important;/);
  assert.match(css, /@media \(min-width: 600px\) and \(max-width: 1023px\) and \(max-height: 560px\) and \(orientation: landscape\)/);
  assert.match(css, /@media \(pointer: coarse\)/);
  const app = src('src/App.jsx');
  assert.match(app, /className="hint hint--touch">\{t\('hint\.touch'\)\}/);
  const i18n = src('src/i18n.jsx');
  assert.equal((i18n.match(/'hint\.touch'/g) || []).length, 2);
});
