// v25：「精緻」外觀（圓角方塊、布紋、刺繡章、影樓燈）只改點樣畫，唔改任何徽章位置（ADR-0023）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { placeAll } from '../src/three/badgeLayout.js';
import { layout } from '../src/three/body.js';
import { planarUV, radiusFor, MAX_RADIUS, SLEEVE_RADIUS, BADGE_LIFT, BADGE_THICK, isMetalBadge, LOOKS, DEFAULT_LOOK } from '../src/three/look.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SECTIONS = ['grasshopper', 'cub', 'scout', 'venture', 'rover', 'leader'];
const R = Object.fromEntries(SECTIONS.map((s) => [s, JSON.parse(src(`src/data/${s}_rules_v1.0.json`))]));
const SIZES = [[24, 30, 12], [10, 22, 14], [7.7, 15.5, 10.5], [2, 1, 2], [0.4, 3, 0.4]];

test('外觀：v30 起只留「流線」（精緻、簡約已刪，減輕負擔）', () => {
  assert.deepEqual(LOOKS, ['smooth']);
  assert.equal(DEFAULT_LOOK, 'smooth');
});

test('planarUV 同 three.js BoxGeometry 嘅 UV 一模一樣（六面）', () => {
  for (const [w, h, d] of SIZES) {
    const g = new THREE.BoxGeometry(w, h, d);
    const pos = g.attributes.position, uv = g.attributes.uv;
    const per = pos.count / 6;
    for (let i = 0; i < pos.count; i++) {
      const [u, v] = planarUV(Math.floor(i / per), pos.getX(i), pos.getY(i), pos.getZ(i), w, h, d);
      assert.ok(Math.abs(u - uv.getX(i)) < 1e-6 && Math.abs(v - uv.getY(i)) < 1e-6, `${w}×${h}×${d} 第 ${i} 點`);
    }
  }
});

test('圓角半徑最多 0.6 cm，細方塊按比例', () => {
  assert.equal(MAX_RADIUS, 0.6);
  for (const [w, h, d] of SIZES) assert.ok(radiusFor(w, h, d) <= Math.min(MAX_RADIUS, w / 2, h / 2, d / 2) + 1e-9);
});

/** 章角離面邊 m cm：如果喺圓角範圍入面，布面會低咗幾多（cm） */
const sag = (m, r) => (m >= r ? 0 : r - Math.sqrt(r * r - (r - Math.max(0, m)) ** 2));

test('所有支部、男女：上身章離衫邊 ≥ 圓角半徑（章下面嘅布面係平）', () => {
  for (const s of SECTIONS) {
    for (const g of ['boy', 'girl']) {
      const T = layout(g, s).B.torso;
      const r = radiusFor(T.w, T.h, T.d);
      for (const p of placeAll(R[s], g)) {
        if (p.mount !== 'torso' || p.facing || p.x == null) continue;
        const m = T.w / 2 - (Math.abs(p.x) + p.w / 2);
        assert.ok(m >= r, `${s}/${g} ${p.key} 離衫邊 ${m.toFixed(2)} cm`);
      }
    }
  }
});

test('所有支部、男女：袖章最多只係喺圓角邊浮起 0.03 cm（袖用 0.2 cm 細圓角）（袖外側面保持平）', () => {
  for (const s of SECTIONS) {
    for (const g of ['boy', 'girl']) {
      const B = layout(g, s).B;
      const r = radiusFor(B.sleeve.w, B.sleeve.len, B.sleeve.d, SLEEVE_RADIUS);
      for (const p of placeAll(R[s], g)) {
        if (p.mount !== 'l' && p.mount !== 'r') continue;
        if (p.kind === 'band') continue; // 喪禮黑布係一圈套住袖
        const side = B.sleeve.d / 2 - (Math.abs(p.u) + p.w / 2);
        const topM = p.v - p.h / 2;
        const worst = Math.max(sag(side, r), sag(topM, r));
        assert.ok(worst <= 0.03, `${s}/${g} ${p.key}：離袖邊 ${side.toFixed(2)}、離縫線 ${topM.toFixed(2)} → 浮起 ${worst.toFixed(3)} cm`);
      }
    }
  }
});

test('收窄／放闊只用喺冇章嘅褲腳、短褲、半截裙', () => {
  const b = src('src/three/Blocky.jsx');
  const lines = b.split('\n').filter((l) => /taper=\{/.test(l));
  // v30：只剩流線；手臂、袖口、小腿、褲、短褲、半截裙收窄／放闊（試做 A 用 profile），全部冇章
  assert.equal(lines.length, 7);
  for (const l of lines) assert.match(l, /B\.(upperArm|lowerArm)|cuff\[0\]|legs\.(shinSize|trousers|shorts|skirtF)/);
});

test('章嘅位置由 badgeLayout 計，同外觀無關；精緻模式只係章面企出（z），x／y 唔變', () => {
  const layoutSrc = src('src/three/badgeLayout.js');
  assert.doesNotMatch(layoutSrc, /look\.js|detailed|figure/);
  const badges = src('src/three/Badges.jsx');
  assert.match(badges, /position=\{lift \? \[0, 0, lift\] : undefined\}/);
  assert.ok(BADGE_LIFT > 0 && BADGE_LIFT < BADGE_THICK && BADGE_THICK - BADGE_LIFT < 0.06, '厚度背面仍然喺布面上面（EPS 0.06 cm）');
});

test('金屬章：勳章、別針、金屬肩章；布章唔係', () => {
  assert.ok(isMetalBadge({ id: 'neckMedal' }));
  assert.ok(isMetalBadge({ id: 'retiredPin' }));
  assert.ok(isMetalBadge({ id: 'metalEpaulette' }));
  assert.ok(isMetalBadge({ id: 'x', crop: 0.6 }));
  assert.ok(!isMetalBadge({ id: 'membership' }));
  assert.ok(!isMetalBadge({ id: 'hongKong' }));
});

test('v30：外觀掣已刪；改做人形試做掣（中英文字都有；記喺瀏覽器；?figure= 可直接開）', () => {
  const i18n = src('src/i18n.jsx');
  for (const k of ['view.lookDetailed', 'view.lookSimple', 'view.lookHint']) assert.equal(i18n.split(`'${k}'`).length - 1, 0, k);
  for (const k of ['view.figureCurrent', 'view.figureA', 'view.figureB', 'view.figureHint']) assert.equal(i18n.split(`'${k}'`).length - 1, 2, k);
  const app = src('src/App.jsx');
  assert.doesNotMatch(app, /scout3d\.look/);
  assert.match(app, /scout3d\.figure/);
  assert.match(app, /get\('figure'\)/);
  assert.match(app, /figure=\{figure\}/);
});
