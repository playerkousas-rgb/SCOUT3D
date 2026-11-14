// SCOUT3D v1.0 · © SCOUT SYSTEM — Loads MakeHuman CC0 assets (as packed by vrm-avatar-maker) from a local folder for the offline bake.
// Adds MakeHuman's "baby" macro targets (not shipped by vrm-avatar-maker) so ages 1-11 interpolate correctly.
import fs from 'node:fs';
import path from 'node:path';
import { loadBase } from './vendor/avatar-core.js';

/** fetch() for file:// URLs, so the browser loader runs unchanged in Node. */
export function installFileFetch() {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (!u.startsWith('file://')) return real(url, opts);
    const p = decodeURIComponent(new URL(u).pathname);
    if (!fs.existsSync(p)) return new Response(null, { status: 404 });
    return new Response(fs.readFileSync(p));
  };
}

/** MakeHuman .target text: "index dx dy dz" per line (decimeters). */
export function readTarget(file) {
  const idx = [], d = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line || line[0] === '#') continue;
    const [i, x, y, z] = line.trim().split(/\s+/).map(Number);
    if (!Number.isFinite(i)) continue;
    idx.push(i); d.push(x, y, z);
  }
  return { idx: Uint32Array.from(idx), d: Float32Array.from(d) };
}

export async function loadAll({ vamAssets, mhTargets }) {
  installFileFetch();
  const base = await loadBase('file://' + path.resolve(vamAssets) + '/');
  await base.loadMore();
  // Baby targets: stored pre-divided by base.quant so morphBody's (d * w * quant) gives decimeters.
  let added = 0;
  for (const f of fs.readdirSync(mhTargets)) {
    if (!/baby/.test(f) || !f.endsWith('.target')) continue;
    const name = f.replace(/\.target$/, '');
    if (base.targets[name]) continue;
    const t = readTarget(path.join(mhTargets, f));
    for (let i = 0; i < t.d.length; i++) t.d[i] /= base.quant;
    base.targets[name] = t;
    added++;
  }
  base.babyTargets = added;
  return base;
}
