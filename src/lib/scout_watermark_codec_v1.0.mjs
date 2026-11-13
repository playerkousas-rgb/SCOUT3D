/**
 * SCOUT SYSTEM 隱形水印 codec — v1.0
 * 與 drawscout_decoder_v1.0.html（用戶提供嘅解碼器）完全兼容。
 *
 * 演算法：8×8 區塊 DCT 中頻 (u=2,v=3) 係數，以 STEP=32 做 QIM 量化，
 *         每個區塊寫 1 bit，payload 循環重複；解碼用多數決投票。
 * 向後兼容 v1 MARK = 'DRAWSCOUT|v1'；v2 = COPYRIGHT SCOUT SYSTEM payload。
 *
 * ⚠️ 純 JS，無 DOM 依賴（影像資料用 {data:Uint8ClampedArray,width,height}）。
 * ⚠️ 只對「未經大幅處理」嘅 PNG／高品質 JPEG 可靠；裁切／縮放／旋轉／平台壓縮會降低成功率。
 */

export const VERSION = 'v1.0';
export const MARK_V1 = 'DRAWSCOUT|v1';
export const PREFIX_V2 = 'SCOUTSYSTEM|v2|';
export const COPYRIGHT = '© SCOUT SYSTEM';
export const STEP = 32;
export const N = 8;

const COS = Array.from({ length: N }, (_, u) =>
  Array.from({ length: N }, (_, x) => Math.cos((2 * x + 1) * u * Math.PI / 16)));
const A = Array.from({ length: N }, (_, u) => u === 0 ? Math.sqrt(1 / 8) : Math.sqrt(2 / 8));
export const B = Array.from({ length: N }, (_, y) =>
  Array.from({ length: N }, (_, x) => A[2] * A[3] * COS[2][y] * COS[3][x]));

// Σ B² = 1（正交基底），所以 delta 直接等於目標係數差。
export const BASIS_NORM = B.flat().reduce((s, v) => s + v * v, 0);

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const luma = (d, i) => .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];

export function toBits(str) {
  return Array.from(str, (ch) => ch.charCodeAt(0).toString(2).padStart(8, '0')).join('');
}
export function fromBits(bits) {
  let out = '';
  for (let i = 0; i + 8 <= bits.length; i += 8) out += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
  return out;
}

/** 計一個 8×8 區塊喺 (2,3) 基底上嘅係數 */
export function coef(data, w, x0, y0) {
  let s = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) s += luma(data, ((y0 + y) * w + x0 + x) * 4) * B[y][x];
  }
  return s;
}

function blockCount(w, h) {
  let n = 0;
  for (let y = 0; y + N <= h; y += N) for (let x = 0; x + N <= w; x += N) n++;
  return n;
}

/**
 * 嵌入水印（原地改 data）。
 * @param {{data:Uint8ClampedArray,width:number,height:number}} image
 * @param {string} payload  限 ASCII；v2 由 makePayloadV2() 產生
 */
export function embed(image, payload = MARK_V1) {
  const { data, width: w, height: h } = image;
  if (!/^[\x20-\x7E]+$/.test(payload)) throw new Error('PAYLOAD_MUST_BE_ASCII');   // A11
  const bits = toBits(payload);
  let bi = 0;
  for (let y = 0; y + N <= h; y += N) {
    for (let x = 0; x + N <= w; x += N, bi++) {
      const want = bits[bi % bits.length] === '1' ? 1 : 0;
      const c = coef(data, w, x, y);
      let q = Math.round(c / STEP);
      if ((q & 1) !== want) q += 1;
      const delta = (q * STEP - c) / BASIS_NORM;
      for (let yy = 0; yy < N; yy++) {
        for (let xx = 0; xx < N; xx++) {
          const i = ((y + yy) * w + (x + xx)) * 4;
          const dv = delta * B[yy][xx];
          data[i] = clamp(data[i] + dv);
          data[i + 1] = clamp(data[i + 1] + dv);
          data[i + 2] = clamp(data[i + 2] + dv);
        }
      }
    }
  }
  return { blocks: bi, bits: bits.length, payload, version: VERSION };
}

function decodeWithLength(image, bitLength) {
  const { data, width: w, height: h } = image;
  const votes = Array.from({ length: bitLength }, () => [0, 0]);
  let bi = 0;
  for (let y = 0; y + N <= h; y += N) {
    for (let x = 0; x + N <= w; x += N, bi++) {
      const bit = Math.round(coef(data, w, x, y) / STEP) & 1;
      votes[bi % bitLength][bit]++;
    }
  }
  const got = votes.map((v) => (v[1] > v[0] ? '1' : '0')).join('');
  const confidence = votes.reduce((s, v) => s + Math.max(v[0], v[1]) / (v[0] + v[1] || 1), 0) / votes.length;
  return { payload: fromBits(got), confidence, blocks: bi };
}

/**
 * 解碼：自動試 v1（104 bit）同 v2（264 bit）兩種長度。
 * 回傳 { found, version, payload, copyright, unit, date, hash, confidence }
 */
export function decode(image) {
  const candidates = [toBits(MARK_V1).length, 33 * 8];
  let best = null;
  for (const len of candidates) {
    const r = decodeWithLength(image, len);
    const isV1 = r.payload === MARK_V1;
    const isV2 = r.payload.startsWith(PREFIX_V2);
    const ok = (isV1 || isV2) && r.confidence > 0.58;
    const cand = { ...r, found: ok, version: isV2 ? 'v2' : 'v1', bitLength: len };
    if (!best || (cand.found && !best.found) || (cand.found === best.found && cand.confidence > best.confidence)) best = cand;
  }
  const p = best.payload || '';
  const parts = p.startsWith(PREFIX_V2) ? p.split('|') : [];
  return {
    found: best.found,
    version: best.found ? best.version : null,
    payload: p,
    copyright: best.found ? COPYRIGHT : null,
    unit: parts[2] || null,
    date: parts[3] || null,
    hash: parts[4] || null,
    confidence: best.confidence,
    blocks: best.blocks,
    bitLength: best.bitLength,
  };
}

/** v2 payload：SCOUTSYSTEM|v2|<unit4>|<yyyymmdd>|<hash4> = 33 chars = 264 bit */
export function makePayloadV2({ unit = '0000', date = '20260101', hash = '0000' } = {}) {
  const clean = (s, n) => String(s).replace(/[^0-9A-Za-z]/g, '').slice(0, n).padEnd(n, '0');
  const p = `${PREFIX_V2}${clean(unit, 4)}|${clean(date, 8)}|${clean(hash, 4)}`;
  if (p.length !== 33) throw new Error('PAYLOAD_V2_MUST_BE_33_CHARS');
  return p;
}

/** DOM 版 helper：由 canvas 拎 ImageData，嵌入後寫返去 */
export function embedCanvas(canvas, payload = makePayloadV2()) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const r = embed(img, payload);
  ctx.putImageData(img, 0, 0);
  return r;
}
