// v20：嘉許笛繩後面一段（用戶：「你畫左前面無畫後面」）— 笛繩係一個圈套住左膊 — SCOUT3D v1.0 · © SCOUT SYSTEM
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { layout, strapLayout, lanyardPoints, lanyardBackPoints, RANK_SLIDE_H } from '../src/three/body.js';

const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

for (const [gender, sweater] of [['male', false], ['girl', false], ['male', true]]) {
  test(`嘉許笛繩後面一段（${gender}${sweater ? '＋毛衣' : ''}）：由職級肩章下面向後，沿袖窿後面落到腋下，同前面一段接埋`, () => {
    const L = layout(gender, 'leader');
    const S = strapLayout(L, { sweater });
    const thick = 0.55;
    const z = L.B.torso.d / 2 + 0.3;
    const front = lanyardPoints({ L, strap: S, z, thick });
    const back = lanyardBackPoints({ L, strap: S, z, thick });
    const slideC = S.outer - 0.3 - RANK_SLIDE_H / 2;
    const slideY = S.base + S.t + 0.04;
    // 同前面一段喺肩章下面同一點起
    assert.deepEqual(back[0], front[0]);
    // 喺肩章下面向後，由肩帶後邊穿出
    for (const p of back.slice(0, 2)) {
      assert.ok(Math.abs(p[0] - slideC) < RANK_SLIDE_H / 2);
      assert.ok(p[1] + thick / 2 <= slideY + 1e-9, '繩面唔高過肩章');
    }
    assert.ok(back[1][2] <= -S.w / 2, '肩帶後邊');
    // 袖頂後邊：唔插入袖頂
    assert.ok(back[2][1] >= L.top);
    assert.ok(back[2][2] <= -L.B.sleeve.d / 2 + 1e-9);
    // 沿袖窿後面：喺背面（z < 0，貼住背）
    const seam = back[4];
    assert.ok(seam[2] <= -L.B.torso.d / 2, '貼住背面');
    assert.ok(seam[0] > L.B.torso.w / 2 - 2 && seam[0] < L.B.torso.w / 2, '袖窿後面（身邊）');
    // 腋下：手臂下面、身側
    const pit = back[5];
    assert.equal(pit[2], 0);
    assert.ok(pit[1] < L.top - 9 && pit[1] > L.top - L.B.sleeve.len, '腋下（短袖入面）');
    assert.ok(pit[0] > L.B.torso.w / 2 && pit[0] < L.armX, '身同手臂之間');
    // 最尾同前面一段袖窿前面嗰點接埋（成個圈）
    assert.ok(front.some((p) => p.every((v, i) => Math.abs(v - back.at(-1)[i]) < 1e-9)), '同前面一段接埋');
    assert.ok(back.every((p) => p[0] > 0), '全部喺左邊');
  });
}

test('晚禮服小型笛繩：後面一段接埋之後去左襟領（同前面一段第三點）', () => {
  const L = layout('male', 'leader');
  const S = strapLayout(L);
  const D = { fleur: { x: 8, y: 128, size: 2 } };
  const args = { L, strap: S, D, z: 9.5, thick: 0.3 };
  const front = lanyardPoints(args);
  const back = lanyardBackPoints(args);
  assert.deepEqual(back[0], front[0]);
  assert.deepEqual(back.at(-1), front[2]);
});

test('Blocky：笛繩畫兩段（前面＋後面），Lanyard 收 paths', () => {
  const src = text('src/three/Blocky.jsx');
  assert.match(src, /const paths = \[lanyardPoints\(args\), lanyardBackPoints\(args\)\]/);
  assert.match(src, /paths\.flatMap\(\(pts\) => lanyardSegments\(pts, thick, colours\.length\)\)/);
  assert.match(src, /<Lanyard key=\{q\.p\.key\} p=\{q\.p\} paths=\{q\.paths\}/);
});
