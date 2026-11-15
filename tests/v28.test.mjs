// v28：香港童軍百周年紀念章重新退底（手冊 P.180 原圖）＋透明底章嘅揀中外框跟輪廓
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const leader = JSON.parse(src('src/data/leader_rules_v1.0.json'));

/** 8-bit RGBA、非交錯 PNG 解碼（只用 node:zlib） */
function decodeRGBA(path) {
  const buf = readFileSync(new URL(`../${path}`, import.meta.url));
  const W = buf.readUInt32BE(16);
  const H = buf.readUInt32BE(20);
  assert.equal(buf[24], 8, `${path} bit depth`);
  assert.equal(buf[25], 6, `${path} 要係 RGBA`);
  assert.equal(buf[28], 0, `${path} 唔好交錯`);
  const idat = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    if (buf.toString('ascii', o + 4, o + 8) === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = W * 4;
  const px = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? px[y * stride + x - 4] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
      let p = 0;
      if (f === 1) p = a;
      else if (f === 2) p = b;
      else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = (v + p) & 255;
    }
  }
  const at = (x, y) => [...px.subarray(y * stride + x * 4, y * stride + x * 4 + 4)];
  return { W, H, at };
}

const cent = leader.badges ? leader.badges.find((b) => b.id === 'centenary') : null;
const centenary = cent ?? JSON.parse(src('src/data/leader_rules_v1.0.json'), (k, v) => v).badges?.find?.((b) => b.id === 'centenary');
const choices = (centenary ?? findDeep(leader)).choices.filter((c) => c.art);
function findDeep(o) {
  if (o && typeof o === 'object') {
    if (o.id === 'centenary' && o.choices) return o;
    for (const v of Object.values(o)) {
      const r = findDeep(v);
      if (r) return r;
    }
  }
  return null;
}

test('v28 百周年紀念章：銅／銀兩張圖都係 RGBA，JSON px 同實際尺寸一致', () => {
  assert.equal(choices.length, 2);
  for (const c of choices) {
    const { W, H } = decodeRGBA(`public${c.art.file}`);
    assert.deepEqual(c.art.px, [W, H], c.id);
    assert.ok(H / W > 2.5 && H / W < 2.9, `${c.id} 比例`);
  }
});

test('v28 百周年紀念章：四邊完全透明（冇殘留背景）', () => {
  for (const c of choices) {
    const { W, H, at } = decodeRGBA(`public${c.art.file}`);
    let worst = 0;
    // 四角 3×3 範圍
    for (const [x0, y0] of [[0, 0], [W - 3, 0], [0, H - 3], [W - 3, H - 3]])
      for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + 3; x++) worst = Math.max(worst, at(x, y)[3]);
    assert.equal(worst, 0, `${c.id} 四角要透明`);
    // 圓牌左右兩側（底部 1/3）邊外嘅位都透明：左上、右上角三角位（綬帶斜尖兩邊）
    const yMid = Math.round(H * 0.47);
    assert.equal(at(1, yMid)[3], 0, `${c.id} 綬帶尖左邊`);
    assert.equal(at(W - 2, yMid)[3], 0, `${c.id} 綬帶尖右邊`);
  }
});

test('v28 百周年紀念章：圓牌冇崩口（中間一圈全實）＋銀章冇紅邊', () => {
  for (const c of choices) {
    const { W, H, at } = decodeRGBA(`public${c.art.file}`);
    const r = W / 2;
    const cx = W / 2;
    const cy = H - r;
    let holes = 0;
    for (let t = 0; t < 360; t += 5) {
      const a = (t * Math.PI) / 180;
      const x = Math.round(cx + Math.cos(a) * r * 0.8);
      const y = Math.round(cy + Math.sin(a) * r * 0.8);
      if (at(x, y)[3] < 250) holes++;
    }
    assert.equal(holes, 0, `${c.id} 圓牌 80% 半徑一圈要全實`);
  }
  const s = choices.find((c) => c.id === 'silver');
  const { W, H, at } = decodeRGBA(`public${s.art.file}`);
  let red = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const [R, G, B, A] = at(x, y);
      if (A > 128 && R - G > 35 && R - B > 25) red++;
    }
  assert.equal(red, 0, '銀章唔應該有紅色（背景）殘留');
});

test('v28 百周年紀念章：掛環中間透明（唔係填滿）', () => {
  const s = choices.find((c) => c.id === 'silver');
  const { W, H, at } = decodeRGBA(`public${s.art.file}`);
  // 環喺圓牌頂上面、綬帶尖下面：中線向上搵到一粒透明位
  const cx = Math.round(W / 2);
  let open = false;
  for (let y = Math.round(H - W - 0.35 * W); y < H - W; y++) if (at(cx, y)[3] === 0 || at(cx - 1, y)[3] === 0 || at(cx + 1, y)[3] === 0) open = true;
  assert.ok(open, '銀章掛環中間應該透明');
});

test('v28 揀中／hover 外框：透明底圖案跟輪廓，跟表面屈，唔遮勳章', () => {
  const b = src('src/three/Badges.jsx');
  assert.match(b, /export function silhouetteCanvas\(/);
  assert.match(b, /if \(clear < total \* 0\.25\) return null;/); // 普通布章照舊長方形
  assert.match(b, /alphaMap=\{sil\}/);
  assert.match(b, /bendGeometry\(g, bend\.matrix, bend\.surf\);\n    return g;/); // 外框都屈
  assert.equal((b.match(/depthWrite=\{false\} polygonOffset polygonOffsetFactor=\{-1\}/g) || []).length, 2);
});
