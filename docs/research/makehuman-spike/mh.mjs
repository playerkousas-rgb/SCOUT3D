// usage: node mh.mjs <recipeName> <out.png> [view: front|side|back]
import puppeteer from 'puppeteer-core';
import zlib from 'node:zlib';
const [name, out, view = 'front'] = process.argv.slice(2);
const base = { version: 1, editor: 'AvatarEditor', name: '', skin: { tone: 0.22, color: null }, eyes: 'brown', face: {}, eyebrows: 'eyebrow001', eyebrowHeight: 0.8, moustache: null, beard: null, glasses: null, hat: null, outfit: null, top: null, bottom: null, shoes: 'shoes01', makeup: { eyeshadow: { amount: 0, color: '#7a5a8c' }, lips: { amount: 0, color: '#a8323e' }, nails: { amount: 0, color: '#b0283a' } } };
const age12 = 0.1875 + (1 / 14) * 0.3125;
const body = (g) => ({ gender: g, age: age12, muscle: 0.5, weight: 0.45, race: { african: 0, asian: 0.85, caucasian: 0.15 } });
const R = {
  boyo: { ...base, body: body(0.85), hair: { style: process.env.HAIR || 'short04', color: '#1a1512' }, outfit: process.env.OUTFIT || 'male_casualsuit01' },
  boy: { ...base, body: body(0.85), hair: { style: process.env.HAIR || 'short04', color: '#1a1512' }, top: process.env.TOP || 'namuhekam_male_polo_shirt', bottom: process.env.BOTTOM || 'cortu_jeans_shorts' },
  girl: { ...base, body: body(0.2), hair: { style: process.env.HAIR || 'toigo_blunt_bob', color: '#1a1512' }, outfit: process.env.OUTFIT || 'female_elegantsuit01' },
  girlp: { ...base, body: body(0.2), hair: { style: process.env.HAIR || 'toigo_blunt_bob', color: '#1a1512' }, top: process.env.TOP || 'namuhekam_male_polo_shirt', bottom: process.env.BOTTOM || 'toigo_tiered_mini_skirt' },
};
const r = R[name];
const url = 'http://localhost:5288/editor/?nohide#r=' + zlib.deflateRawSync(Buffer.from(JSON.stringify(r))).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b = await puppeteer.launch({ executablePath: '/tmp/chromium', headless: 'shell', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] });
const p = await b.newPage();
await p.setViewport({ width: 1040, height: 1000, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('MH')) console.log(m.text()); });
await p.goto(url, { waitUntil: 'load' });
await new Promise((res) => setTimeout(res, 35000));
await p.evaluate(() => document.querySelector('#preview').click());
await new Promise((res) => setTimeout(res, 3000));
await p.evaluate(() => document.querySelector('#poses button[data-pose=standing]').click());
await new Promise((res) => setTimeout(res, 40000));
await p.evaluate(async () => { window.__THREE = await import('three'); });
await p.addScriptTag({ content: (await import('node:fs')).readFileSync('/tmp/sc/mhops.js', 'utf8') });
const info = await p.evaluate((mode, view) => window.__mh(mode, view), process.env.MODE || 'scout', view);
console.log('MESHES', info);
await new Promise((res) => setTimeout(res, 3000));
await p.screenshot({ path: out, clip: { x: 340, y: 0, width: 700, height: 1000 } });
await b.close();
