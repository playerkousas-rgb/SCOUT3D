// 徽章貼圖（全部用 canvas 即場畫，屬示意圖，唔係官方圖案）— v1.0 · © SCOUT SYSTEM
import * as THREE from 'three';

const cache = new Map();

function make(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif';

function fitText(g, text, maxW, size, weight = 700) {
  let s = size;
  do {
    g.font = `${weight} ${s}px ${FONT}`;
    s -= 2;
  } while (g.measureText(text).width > maxW && s > 8);
}

function stitch(g, path, color) {
  g.save();
  g.setLineDash([6, 5]);
  g.lineWidth = 2;
  g.strokeStyle = color;
  path();
  g.stroke();
  g.restore();
}

function footprint(g, cx, cy, s, mirror) {
  g.save();
  g.translate(cx, cy);
  if (mirror) g.scale(-1, 1);
  g.fillStyle = '#ffffff';
  // 腳掌
  g.beginPath();
  g.ellipse(0, s * 0.18, s * 0.2, s * 0.34, -0.12, 0, Math.PI * 2);
  g.fill();
  // 腳趾（大趾喺內側）
  const toes = [
    [-0.13, -0.27, 0.085],
    [-0.01, -0.31, 0.07],
    [0.09, -0.28, 0.06],
    [0.17, -0.22, 0.05],
    [0.22, -0.14, 0.045],
  ];
  for (const [x, y, r] of toes) {
    g.beginPath();
    g.arc(x * s, y * s, r * s, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

const PROGRESS = [
  { step: 1, color: '#c8312b', foot: 'left' },
  { step: 2, color: '#7a4a26', foot: 'right' },
  { step: 3, color: '#2459a8', foot: 'left' },
  { step: 4, color: '#2f8a3c', foot: 'right' },
];
export const PROGRESS_STEPS = PROGRESS;

export function progressTexture(step) {
  const p = PROGRESS[step - 1];
  return make(`progress-${step}`, 128, 128, (g, w, h) => {
    g.fillStyle = p.color;
    g.fillRect(0, 0, w, h);
    stitch(g, () => g.strokeRect(6, 6, w - 12, h - 12), 'rgba(255,255,255,.55)');
    // 左足印 = 左腳（大趾喺右邊）；右足印鏡像
    footprint(g, w / 2, h / 2 + 4, 92, p.foot === 'left');
  });
}

export function membershipTexture() {
  return make('membership', 256, 256, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#e8792b';
    g.beginPath();
    g.arc(c, c, c, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(c, c, c - 20, 0, Math.PI * 2);
    g.fill();
    // 示意：一條領巾（橙／藍），唔係官方徽號
    g.fillStyle = '#e8792b';
    g.beginPath();
    g.moveTo(c - 62, c - 30);
    g.lineTo(c + 62, c - 30);
    g.lineTo(c, c + 38);
    g.closePath();
    g.fill();
    g.fillStyle = '#1f4e9c';
    g.beginPath();
    g.arc(c, c - 6, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1f4e9c';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    fitText(g, '小童軍', 120, 40);
    g.fillText('小童軍', c, c - 66);
    fitText(g, 'GRASSHOPPER', 150, 22);
    g.fillText('GRASSHOPPER', c, c + 70);
    stitch(g, () => { g.beginPath(); g.arc(c, c, c - 9, 0, Math.PI * 2); }, 'rgba(255,255,255,.7)');
  });
}

export function grasshopperTexture() {
  return make('grasshopper', 256, 256, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#3d8b37';
    g.beginPath();
    g.arc(c, c, c, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f4f0d8';
    g.beginPath();
    g.arc(c, c, c - 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3d8b37';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    fitText(g, '小草蜢', 150, 48);
    g.fillText('小草蜢', c, c - 14);
    fitText(g, '待確認', 110, 28, 600);
    g.fillStyle = '#9a6b00';
    g.fillText('待確認', c, c + 38);
  });
}

function rectBadge(key, bg, fg, line1, line2) {
  return make(key, 512, 184, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    stitch(g, () => g.strokeRect(10, 10, w - 20, h - 20), fg);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    fitText(g, line1, w - 60, 78);
    g.fillText(line1, w / 2, line2 ? h / 2 - 22 : h / 2);
    if (line2) {
      fitText(g, line2, w - 80, 40, 600);
      g.fillText(line2, w / 2, h / 2 + 46);
    }
  });
}

export const troopTexture = () => rectBadge('troop', '#7b1e2b', '#f6d36b', '○○旅', 'GROUP');
export const districtTexture = () => rectBadge('district', '#1d3f6e', '#ffffff', '○○區', 'DISTRICT');
export const meritTexture = () => rectBadge('merit', '#f2c230', '#5a2a00', '優異旅團', 'MERITORIOUS');

export function commemorativeTexture() {
  return make('commem', 256, 256, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#5b3fa0';
    g.beginPath();
    g.arc(c, c, c, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffd34d';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 34 : 78;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      g.lineTo(c + r * Math.cos(a), c - 8 + r * Math.sin(a));
    }
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    fitText(g, '紀念章', 120, 34);
    g.fillText('紀念章', c, c + 92);
  });
}

export function ringTexture(shape) {
  return make(`ring-${shape}`, 128, 128, (g, w, h) => {
    g.strokeStyle = '#ffcc00';
    g.lineWidth = 10;
    if (shape === 'circle') {
      g.beginPath();
      g.arc(w / 2, h / 2, w / 2 - 8, 0, Math.PI * 2);
      g.stroke();
    } else {
      g.strokeRect(7, 7, w - 14, h - 14);
    }
  });
}

// 旅巾背後三角：主色 + 花邊（每次顏色變就重畫）
export function neckerTexture(main, border) {
  return make(`necker-${main}-${border}`, 256, 256, (g, w, h) => {
    // UV：u = 橫向絕對位置；v = 1 喺頂邊（頸位），0 喺三角尖 → canvas 上闊下尖
    g.fillStyle = main;
    g.fillRect(0, 0, w, h);
    g.fillStyle = border;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, 0);
    g.lineTo(w / 2, h);
    g.closePath();
    g.fill();
    g.fillStyle = main;
    g.beginPath();
    const m = 16;
    g.moveTo(m * 1.9, 0);
    g.lineTo(w - m * 1.9, 0);
    g.lineTo(w / 2, h - m * 2.6);
    g.closePath();
    g.fill();
  });
}

export const BADGE_TEXTURES = {
  membership: membershipTexture,
  grasshopperAward: grasshopperTexture,
  troop: troopTexture,
  district: districtTexture,
  meritorious: meritTexture,
  commemorative: commemorativeTexture,
};
