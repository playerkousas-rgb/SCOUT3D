// SCOUT3D v1.0 · © SCOUT SYSTEM — Tiny RGBA image helpers for the offline bake, using ImageMagick (`convert`) for decode/encode.
import { execFileSync } from 'node:child_process';

export function readRGBA(file, size) {
  const args = [file];
  if (size) args.push('-resize', `${size}x${size}!`);
  const dims = execFileSync('convert', [...args, '-format', '%w %h', 'info:']).toString().trim().split(' ').map(Number);
  const data = execFileSync('convert', [...args, '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 28 });
  return { width: dims[0], height: dims[1], data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
}

export function blank(width, height, rgba = [255, 255, 255, 255]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i);
  return { width, height, data };
}

/** Encode to bytes. type: 'jpeg' | 'png' | 'webp'. */
export function encode(img, type, quality = 82) {
  const fmt = type === 'jpeg' ? 'jpg' : type;
  const args = ['-size', `${img.width}x${img.height}`, '-depth', '8', 'rgba:-'];
  if (type === 'jpeg') args.push('-background', 'white', '-alpha', 'remove', '-quality', String(quality), '-sampling-factor', '4:2:0');
  if (type === 'webp') args.push('-quality', String(quality), '-define', 'webp:alpha-quality=90');
  if (type === 'png') args.push('-define', 'png:compression-level=9');
  args.push('-strip', `${fmt}:-`);
  return new Uint8Array(execFileSync('convert', args, { input: Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), maxBuffer: 1 << 28 }));
}

const lin = (c) => Math.pow(c / 255, 2.2);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Keep the texture's light and shade, replace its colour (like vrm-avatar-maker's hair recolour). */
export function tint(img, color, { gain = 1, contrast = 0.85, mask = null } = {}) {
  const [tr, tg, tb] = hex(color);
  const d = img.data;
  let sum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { sum += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; n++; }
  const mean = sum / Math.max(n, 1) || 1;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    if (mask && !mask[p]) continue;
    const l = gain * Math.pow((0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / mean, contrast);
    d[i] = tr * l; d[i + 1] = tg * l; d[i + 2] = tb * l;
  }
  return img;
}

/** Rasterise UV triangles into a 0/1 mask (with `grow` pixels of padding against seams). */
export function uvMask(width, height, uv, indices, keepTri, grow = 2) {
  const m = new Uint8Array(width * height);
  for (let t = 0; t < indices.length; t += 3) {
    if (!keepTri(t / 3)) continue;
    const P = [0, 1, 2].map((k) => [uv[indices[t + k] * 2] * width, (1 - uv[indices[t + k] * 2 + 1]) * height]);
    const minX = Math.max(0, Math.floor(Math.min(...P.map((p) => p[0])) - grow)), maxX = Math.min(width - 1, Math.ceil(Math.max(...P.map((p) => p[0])) + grow));
    const minY = Math.max(0, Math.floor(Math.min(...P.map((p) => p[1])) - grow)), maxY = Math.min(height - 1, Math.ceil(Math.max(...P.map((p) => p[1])) + grow));
    const [a, b, c] = P;
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    if (Math.abs(area) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((b[0] - px) * (c[1] - py) - (c[0] - px) * (b[1] - py)) / area;
      const w1 = ((c[0] - px) * (a[1] - py) - (a[0] - px) * (c[1] - py)) / area;
      const w2 = 1 - w0 - w1;
      const e = grow / Math.sqrt(Math.abs(area));
      if (w0 >= -e && w1 >= -e && w2 >= -e) m[y * width + x] = 1;
    }
  }
  return m;
}

export { lin, hex };
