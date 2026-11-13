// 3D 位置測試（純 three.js，唔使瀏覽器）· SCOUT3D · © SCOUT SYSTEM
// 穿著者左 = +x（人物面向 +z）。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { torsoGeometry, sleeveGeometry, neckerBackGeometry, neckerTailGeometry } from '../src/three/geometry.js';
import { placeOnSurface } from '../src/three/placement.js';
import { D, SLEEVE } from '../src/three/dims.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

test('團員章打中上衣左胸（+x）、紀念章打中右胸（-x）', () => {
  const g = torsoGeometry();
  const left = placeOnSurface(g, V(0.065, D.shoulderY - 0.07, 0.6), V(0, 0, -1));
  const right = placeOnSurface(g, V(-0.065, D.shoulderY - 0.055, 0.6), V(0, 0, -1));
  assert.ok(left && left.position.x > 0 && left.position.z > 0);
  assert.ok(right && right.position.x < 0 && right.position.z > 0);
  assert.ok(left.normal.z > 0.5, '法線向前');
});

test('袖章打中袖外側；長短袖都喺同一高度', () => {
  for (const long of [false, true]) {
    const g = sleeveGeometry(long);
    const hit = placeOnSurface(g, V(0.5, SLEEVE.shortHemY + 0.015, 0), V(-1, 0, 0));
    assert.ok(hit, `long=${long} 打唔中`);
    assert.ok(hit.normal.x > 0.8, '法線向外');
  }
});

test('旅章頂距肩膊縫線 2 釐米，區章再下 2 釐米，唔重疊優異旅團章', () => {
  const troopH = 0.025;
  const distH = 0.025;
  const meritH = 0.025;
  const troopTop = SLEEVE.seamY - 0.02;
  const distTop = troopTop - troopH - 0.02;
  const meritTop = SLEEVE.shortHemY + 0.005 + meritH;
  assert.ok(Math.abs(SLEEVE.seamY - troopTop - 0.02) < 1e-9);
  assert.ok(distTop - distH > meritTop, '區章底要高過優異旅團章頂');
});

test('旅巾背後三角向後、巾尾向前', () => {
  const back = placeOnSurface(neckerBackGeometry(), V(0, 0.75, -0.6), V(0, 0, 1));
  assert.ok(back && back.position.z < 0 && back.normal.z < -0.5);
  for (const side of ['left', 'right']) {
    const s = side === 'left' ? 1 : -1;
    const tail = placeOnSurface(neckerTailGeometry(side), V(s * 0.0175, 0.718, 0.6), V(0, 0, -1));
    assert.ok(tail && tail.position.z > 0, `${side} 巾尾打唔中`);
    assert.equal(Math.sign(tail.position.x), s);
  }
});
