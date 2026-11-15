// 方塊人像素貼圖（每格 0.5 cm）— v1.0 · © SCOUT SYSTEM
// 每個方塊 6 面：[+x, -x, +y, -y, +z, -z]（Three.js BoxGeometry 次序）。
// +z = 前面，+x = 穿著者左。畫圖座標以厘米計，左上角為原點。
import * as THREE from 'three';
import { stripeIndex } from '../lib/necker.js';
import { PX, COLOURS as C, SHIRT_YOKE } from './body.js';
import { fineCanvas, fabricNormal, tagKind, KIND_PROPS, canvasCm } from './look.js';

/** 一塊畫布：w × h 厘米。draw(g) 用 g.rect / g.shape / g.px。 */
export function canvas(wcm, hcm, draw) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(wcm * PX));
  c.height = Math.max(1, Math.round(hcm * PX));
  const ctx = c.getContext('2d');
  const g = {
    W: c.width,
    H: c.height,
    wcm,
    hcm,
    /** 填滿 */
    fill(color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, c.width, c.height);
    },
    /** 長方形（厘米） */
    rect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * PX), Math.round(y * PX), Math.round(w * PX), Math.round(h * PX));
    },
    /** 單格（格數） */
    px(x, y, color, w = 1, h = 1) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    },
    /** 逐格判斷形狀：inside(xcm, ycm) 用格中心點 */
    shape(inside, color) {
      ctx.fillStyle = color;
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++) if (inside((x + 0.5) / PX, (y + 0.5) / PX)) ctx.fillRect(x, y, 1, 1);
    },
    /** 清走（透明）：inside(xcm, ycm) */
    clear(inside) {
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++) if (inside((x + 0.5) / PX, (y + 0.5) / PX)) ctx.clearRect(x, y, 1, 1);
    },
  };
  draw(g);
  return c;
}

const solid = (w, h, color) => canvas(w, h, (g) => g.fill(color));

/** 六面畫布：faces = { px, nx, py, ny, pz, nz } 每項係 (g) => void；size = [w, h, d] 厘米 */
export function boxFaces([w, h, d], faces, base) {
  const dims = { px: [d, h], nx: [d, h], py: [w, d], ny: [w, d], pz: [w, h], nz: [w, h] };
  return ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((k) =>
    canvas(dims[k][0], dims[k][1], (g) => {
      if (base) g.fill(base);
      faces[k]?.(g);
    }),
  );
}

/* ---------------- 頭 ---------------- */
function headFacesRaw(B) {
  const { w, h, d } = B.head;
  const long = B.hair === 'pigtails';
  const front = (g) => {
    g.fill(C.skin);
    // 頭髮 + 陰
    g.rect(0, 0, w, long ? 5 : 4.5, C.hair);
    if (long) {
      // 女仔：齊陰 + 兩邊長髮
      g.shape((x, y) => y < 6 && (x < 3 || x > w - 3 || (y < 5.5 && Math.floor(x * PX) % 5 !== 0)), C.hair);
      g.rect(0, 0, 2, h, C.hair);
      g.rect(w - 2, 0, 2, h, C.hair);
    } else {
      // 男仔：短陰，參差
      g.shape((x, y) => y < 5.5 && [1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16].includes(Math.floor(x)), C.hair);
      g.rect(0, 0, 1.5, 8, C.hair);
      g.rect(w - 1.5, 0, 1.5, 8, C.hair);
    }
    g.px(6, 2, C.hairHi, 3, 1);
    g.px(22, 3, C.hairHi, 4, 1);
    // 眉
    g.rect(4, 7.5, 3, 0.5, C.brow);
    g.rect(w - 7, 7.5, 3, 0.5, C.brow);
    // 眼
    for (const x0 of [4.5, w - 7]) {
      g.rect(x0, 9, 2.5, 2, C.eyeWhite);
      g.rect(x0 + 0.5, 9, 1.5, 2, C.eye);
      g.rect(x0, 8.5, 2.5, 0.5, C.eye);
      g.px(Math.round((x0 + 0.5) * PX), 18, '#ffffff');
    }
    // 鼻、面珠、口
    g.rect(w / 2 - 0.5, 12.5, 1, 1, C.skinShade);
    g.rect(2.5, 13.5, 2, 1, C.blush);
    g.rect(w - 4.5, 13.5, 2, 1, C.blush);
    g.rect(w / 2 - 1.5, 15.5, 3, 0.5, C.mouth);
    g.rect(w / 2 - 1, 16, 2, 0.5, C.mouth);
  };
  // 側面：canvas 左 = 前（+x 面）或 後（-x 面）
  const side = (frontOnLeft) => (g) => {
    g.fill(C.skin);
    const toX = (fromFront) => (frontOnLeft ? fromFront : d - fromFront); // 厘米，由前面量起
    g.rect(0, 0, d, long ? 7 : 6, C.hair);
    const backH = long ? h : 14;
    g.shape((x, y) => { const f = frontOnLeft ? x : d - x; return f > d * 0.45 && y < backH; }, C.hair);
    g.shape((x, y) => { const f = frontOnLeft ? x : d - x; return f < 3 && y < (long ? h : 8); }, C.hair);
    // 耳仔
    const ex = toX(d * 0.47);
    g.rect(Math.min(ex, ex - 2), 9, 2, 4, C.skinShade);
    g.rect(Math.min(ex, ex - 2) + 0.5, 9.5, 1, 3, C.skin);
  };
  const back = (g) => {
    g.fill(C.skin);
    g.rect(0, 0, w, long ? h : 15, C.hair);
    g.px(10, 6, C.hairHi, 6, 1);
    g.px(18, 14, C.hairHi, 5, 1);
  };
  return boxFaces([w, h, d], {
    px: side(true),
    nx: side(false),
    py: (g) => { g.fill(C.hair); g.px(8, 10, C.hairHi, 5, 1); g.px(20, 22, C.hairHi, 6, 1); },
    ny: (g) => { g.fill(C.skin); g.rect(0, 0, w, long ? d : 4, C.hair); },
    pz: front,
    nz: back,
  });
}

/** 女仔孖辮 */
function pigtailFacesRaw(size, tie) {
  const [w, h, d] = size;
  const f = (ww) => (g) => {
    g.fill(C.hair);
    g.rect(0, 2, ww, 1, tie);
    g.shape((x, y) => y > 4 && Math.floor(y * PX) % 6 === 0 && x > 1 && x < ww - 1, C.hairHi);
  };
  return boxFaces([w, h, d], { px: f(d), nx: f(d), pz: f(w), nz: f(w), py: (g) => g.fill(C.hair), ny: (g) => g.fill(C.hair) });
}

export const neckFaces = (B) => {
  const { w, h, d } = B.neck;
  const shade = (ww) => (g) => { g.fill(C.skin); g.rect(0, 0, ww, 1, C.skinShade); };
  return boxFaces([w, h, d], { px: shade(d), nx: shade(d), pz: shade(w), nz: shade(w), py: (g) => g.fill(C.skin), ny: (g) => g.fill(C.skin) });
};

/* ---------------- 顏色工具 ---------------- */
/** 將 #rrggbb 調暗（f < 1）或者調光（f > 1） */
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1))));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** 上衣配色：orange = 橙色活動服（白領、白袖邊）；cub = 幼童軍杏色恤衫；polo / tee = 單色 */
export function shirtPalette(top, colour) {
  if (top === 'orange') return { main: C.shirt, dark: C.shirtShade, trim: C.trim, collar: C.trim };
  if (top === 'cub') {
    // 杏色（幼童軍、童軍）／白色（海童軍）／淺藍色（空童軍）：同一款恤衫，只係顏色唔同
    const main = colour && colour !== C.shirt ? colour : C.cubShirt;
    const dark = main === C.cubShirt ? C.cubShirtShade : shade(main, 0.84);
    return { main, dark, trim: dark, collar: shade(main, 1.04) };
  }
  const dark = shade(colour, colour === '#ffffff' ? 0.86 : 0.8);
  return { main: colour, dark, trim: dark, collar: shade(colour, colour === '#ffffff' ? 0.95 : 0.92) };
}

/* ---------------- 上身 ---------------- */
/** top：'orange' 橙色活動服（翻領）／'polo' 單色有領／'tee' 單色圓領 */
export function torsoFaces(B, top = 'orange', colour = C.shirt) {
  const { w, h, d } = B.torso;
  const P = shirtPalette(top, colour);
  const nw = B.neck.w, cx = w / 2;
  const hem = (ww) => (g) => g.rect(0, h - 1, ww, 1, P.dark);
  const collarFlaps = (g, fill) => {
    // 兩片尖領
    const inside = (x, y, grow = 0) => {
      const dx = Math.abs(x - cx);
      return y < 6 + grow && dx > 0.4 - grow && dx < nw / 2 + 3.5 + grow - y * 0.3 && dx > (y - 0.5) * 0.5 - grow;
    };
    if (top !== 'orange') g.shape((x, y) => inside(x, y, 0.5), P.dark);
    g.shape((x, y) => inside(x, y), fill);
  };
  const front = (g) => {
    hem(w)(g);
    if (top === 'tee') {
      // 圓領：坑紋領邊，中間見到頸
      g.shape((x, y) => Math.hypot((x - cx) / (nw / 2 + 1.2), y / 2.6) < 1, P.dark);
      g.shape((x, y) => Math.hypot((x - cx) / (nw / 2 + 0.3), y / 1.7) < 1, C.skin);
      return;
    }
    g.rect(cx - 0.25, 4, 0.5, top === 'polo' ? 9 : 7, P.dark); // 門襟
    if (top === 'polo') {
      g.rect(cx - 1, 4, 2, 9, P.collar);
      g.rect(cx - 1, 4, 0.5, 9, P.dark);
      g.rect(cx + 0.5, 4, 0.5, 9, P.dark);
      g.rect(cx - 0.25, 7, 0.5, 0.5, '#d8d8d8');
      g.rect(cx - 0.25, 10.5, 0.5, 0.5, '#d8d8d8');
    }
    collarFlaps(g, P.collar);
  };
  return boxFaces(
    [w, h, d],
    {
      pz: front,
      nz: (g) => {
        hem(w)(g);
        if (top === 'tee') g.rect(cx - nw / 2 - 1, 0, nw + 2, 1, P.dark);
        else g.rect(cx - nw / 2 - 2, 0, nw + 4, 1.5, P.collar);
      },
      px: (g) => { hem(d)(g); g.rect(0, 0, d, 0.5, P.dark); },
      nx: (g) => { hem(d)(g); g.rect(0, 0, d, 0.5, P.dark); },
      py: (g) => {
        // 膊頭：領圈
        g.shape((x, y) => Math.abs(x - cx) < nw / 2 + (top === 'tee' ? 1 : 2) && Math.abs(y - d / 2) < B.neck.d / 2 + (top === 'tee' ? 1 : 2), top === 'tee' ? P.dark : P.collar);
      },
      ny: (g) => g.fill(P.dark),
    },
    P.main,
  );
}

/** 上袖：短袖 = 袖口邊；長袖 = 冇邊（下面接下袖） */
export function sleeveFaces(size, band, top = 'orange', colour = C.shirt, long = false) {
  const [w, h, d] = size;
  const P = shirtPalette(top, colour);
  const cuff = top === 'orange' ? band : 0.75;
  const f = (ww) => (g) => {
    if (long) return;
    if (top === 'cub') {
      // 摺邊：袖口縫線（離袖口 band cm）+ 袖口邊
      g.rect(0, h - band, ww, 0.5, P.dark);
      g.rect(0, h - 0.5, ww, 0.5, P.dark);
      return;
    }
    g.rect(0, h - cuff, ww, cuff, P.trim);
  };
  // 恤衫肩帶（幼童軍、童軍、深資、樂行）由衣領一直去到膊頭：袖頂都要畫埋（用戶指正）
  const strap = top === 'cub'
    ? (g) => {
        g.rect(0, d / 2 - 2, w, 4, P.dark);
        g.rect(0, d / 2 - 1.6, w, 3.2, shade(P.main, 1.02));
      }
    : () => {};
  return boxFaces([w, h, d], { px: f(d), nx: f(d), pz: f(w), nz: f(w), py: strap, ny: (g) => g.fill(long ? P.main : P.trim) }, P.main);
}

/** 長袖下截（前臂），手腕有袖口 */
export function cuffFaces(size, top = 'orange', colour = C.shirt) {
  const [w, h, d] = size;
  const P = shirtPalette(top, colour);
  const cuff = top === 'orange' ? 1.5 : 1;
  const f = (ww) => (g) => g.rect(0, h - cuff, ww, cuff, P.trim);
  return boxFaces(size, { px: f(d), nx: f(d), pz: f(w), nz: f(w), ny: (g) => g.fill(P.trim) }, P.main);
}

/** 背心（風褸式，拉鏈 + V 領）：前面同頂面嘅領口係透明，要用 alpha 材質 */
export function vestFaces(size, colour, neck) {
  const [w, h, d] = size;
  const dark = shade(colour, colour === '#ffffff' ? 0.86 : 0.78);
  const cx = w / 2;
  const vDepth = 15;
  const hem = (ww) => (g) => g.rect(0, h - 1.5, ww, 1.5, dark);
  return boxFaces(size, {
    pz: (g) => {
      hem(w)(g);
      g.rect(cx - 0.25, vDepth, 0.5, h - vDepth, '#c9ccd1'); // 拉鏈
      g.rect(cx - 0.6, vDepth, 1.2, 0.8, '#c9ccd1');
      g.rect(2, h - 11, 6, 0.5, dark); // 袋口
      g.rect(w - 8, h - 11, 6, 0.5, dark);
      g.shape((x, y) => { const e = (neck / 2 + 3) * (1 - y / vDepth) - Math.abs(x - cx); return y < vDepth && e > -1 && e <= 0; }, dark);
      g.clear((x, y) => y < vDepth && Math.abs(x - cx) < (neck / 2 + 3) * (1 - y / vDepth));
    },
    nz: (g) => { hem(w)(g); g.rect(cx - neck / 2 - 2.5, 0, neck + 5, 1.5, dark); },
    px: (g) => hem(d)(g),
    nx: (g) => hem(d)(g),
    py: (g) => g.clear((x, y) => Math.abs(x - cx) < neck / 2 + 2.5 && (Math.abs(y - d / 2) < neck / 2 + 2.5 || y > d / 2)),
    ny: (g) => g.fill(dark),
  }, colour);
}

/* ---------------- 帽 ---------------- */
export function hatFaces(size, colour, { band = 0 } = {}) {
  const [w, h, d] = size;
  const dark = shade(colour, colour === '#ffffff' ? 0.86 : 0.78);
  const side = (ww) => (g) => {
    if (band) g.rect(0, h - band, ww, band, dark);
    g.rect(ww / 2 - 0.25, 0, 0.5, h - band, dark); // 車線
  };
  return boxFaces(size, {
    px: side(d), nx: side(d), pz: side(w), nz: side(w),
    py: (g) => { g.rect(w / 2 - 0.25, 0, 0.5, d, dark); g.rect(0, d / 2 - 0.25, w, 0.5, dark); },
    ny: (g) => g.fill(dark),
  }, colour);
}

/** 海童軍白頂帽：白色、冇車線；頂面有一圈淺灰邊，底面淺灰（白頂伸出嚟嘅陰影） */
export function seaCapFaces(size, colour) {
  const [w, , d] = size;
  const edge = shade(colour, 0.88);
  return boxFaces(size, {
    py: (g) => { g.fill(edge); g.rect(0.5, 0.5, w - 1, d - 1, colour); },
    ny: (g) => g.fill(shade(colour, 0.8)),
  }, colour);
}

/** 帽邊／帽舌：上面主色，底面深色 */
export function brimFaces(size, colour) {
  const dark = shade(colour, colour === '#ffffff' ? 0.86 : 0.75);
  return boxFaces(size, { ny: (g) => g.fill(dark), py: (g) => { const [w, , d] = size; g.rect(0, 0, w, 0.5, dark); g.rect(0, d - 0.5, w, 0.5, dark); } }, colour);
}

export const skinFaces = (size) => tagKind(boxFaces(size, {}, C.skin), 'skin');

function handFacesRaw(size) {
  const [w, h, d] = size;
  // 手掌向內（±x 面），手指線喺下半
  const fingers = (g) => { for (let i = 1; i < 4; i++) g.rect((d / 4) * i - 0.25, h - 4, 0.5, 4, C.skinShade); };
  return boxFaces(size, { px: fingers, nx: fingers, pz: (g) => g.rect(0, 2, 1, 4, C.skinShade) }, C.skin);
}

/* ---------------- 褲、襪、鞋 ---------------- */
/** 長褲：成條腳 */
export function legFaces(size, colour = C.trousers) {
  const [w, h, d] = size;
  const dark = shade(colour, colour === '#ffffff' ? 0.86 : 0.86);
  const f = (ww) => (g) => g.rect(0, h - 2, ww, 2, dark); // 褲腳收口
  return boxFaces(size, { px: f(d), nx: f(d), pz: (g) => { f(w)(g); g.rect(w / 2 - 0.25, 0, 0.5, h - 2, dark); }, nz: f(w) }, colour);
}

/** 短褲：褲腳摺邊 */
export function shortsFaces(size, colour) {
  const [w, h, d] = size;
  const dark = shade(colour, colour === '#ffffff' ? 0.86 : 0.82);
  const f = (ww) => (g) => g.rect(0, h - 1.5, ww, 1.5, dark);
  return boxFaces(size, { px: f(d), nx: f(d), pz: (g) => { f(w)(g); g.rect(w / 2 - 0.25, 0, 0.5, h - 1.5, dark); }, nz: f(w), ny: (g) => g.fill(dark) }, colour);
}

/** 半截裙（深資／樂行女團員）：一件過、冇中線（有中線會似短褲，用戶指正）；只畫裙腳摺邊 */
export function skirtFaces(size, colour) {
  const [w, h, d] = size;
  const dark = shade(colour, 0.82);
  const hem = (ww) => (g) => g.rect(0, h - 1.5, ww, 1.5, dark);
  return boxFaces(size, { px: hem(d), nx: hem(d), pz: hem(w), nz: hem(w), ny: (g) => g.fill(dark) }, colour);
}

/** 小腿：皮膚 + 襪（sockH = 襪由腳底量起幾高，cm） */
export function shinFaces(size, sockH, sockColour) {
  const [w, h, d] = size;
  const rib = shade(sockColour, 0.88);
  const f = (ww) => (g) => {
    g.rect(0, h - sockH, ww, sockH, sockColour);
    g.rect(0, h - sockH, ww, 1.5, rib); // 襪口坑紋
    g.shape((x, y) => y > h - sockH && y < h - sockH + 1.5 && Math.floor(x * PX) % 2 === 0, sockColour);
  };
  return boxFaces(size, { px: f(d), nx: f(d), pz: f(w), nz: f(w), ny: (g) => g.fill(sockColour) }, C.skin);
}

function shoeFacesRaw(size, { colour = C.shoe, sole: soleC = C.sole, lace = C.lace } = {}) {
  const [w, h, d] = size;
  const sole = (ww) => (g) => g.rect(0, h - 1.5, ww, 1.5, soleC);
  // 非綁帶中跟皮鞋（深資／樂行女團員配半截裙）唔用呢個：Blocky 用 body.js pumpParts() 砌
  return boxFaces(
    size,
    {
      px: sole(d),
      nx: sole(d),
      pz: sole(w),
      nz: sole(w),
      py: (g) => { for (let i = 0; i < 4; i++) g.rect(w / 2 - 2, d * 0.45 + i * 1.5, 4, 0.5, lace); },
      ny: (g) => g.fill(soleC),
    },
    colour,
  );
}

/* ---------------- 幼童軍 ---------------- */
/** 尖領兩片（cx = 中線，nw = 頸闊） */
function drawCollar(g, cx, nw, fill, outline) {
  const inside = (x, y, grow = 0) => {
    const dx = Math.abs(x - cx);
    return y < 6.5 + grow && dx > 0.4 - grow && dx < nw / 2 + 4 + grow - y * 0.3 && dx > (y - 0.5) * 0.5 - grow;
  };
  g.shape((x, y) => inside(x, y, 0.5), outline);
  g.shape((x, y) => inside(x, y), fill);
}

/**
 * 幼童軍恤衫（塞入褲）：杏色、兩胸袋、肩帶、門襟鈕；
 * 上身方塊最底嗰截畫做短褲 + 棕色皮帶（belt = 皮帶中心離衫腳幾高，cm）。
 */
export function cubTorsoFaces(B, { legColour = C.cubGreen, shirt = C.cubShirt, skirt = false } = {}) {
  const { w, h, d } = B.torso;
  const P = shirtPalette('cub', shirt);
  const nw = B.neck.w, cx = w / 2;
  const beltMid = h - (B.waist - B.torso.y); // 由頂量
  const beltH = 3;
  const lower = (ww, front = false) => (g) => {
    g.rect(0, beltMid + beltH / 2, ww, h - beltMid - beltH / 2, legColour);
    g.rect(0, beltMid - beltH / 2, ww, beltH, C.belt);
    g.rect(0, beltMid - beltH / 2, ww, 0.5, shade(C.belt, 0.75));
    g.rect(0, beltMid - beltH / 2 - 0.5, ww, 0.5, P.dark); // 塞入褲嘅摺位
    if (front) {
      g.rect(cx - 2.5, beltMid - 2, 5, 4, C.buckle); // 皮帶扣（示意）
      g.rect(cx - 1.8, beltMid - 1.3, 3.6, 2.6, shade(C.buckle, 0.82));
      if (!skirt) g.rect(cx - 0.25, beltMid + beltH / 2, 0.5, h, shade(legColour, 0.85)); // 褲頭中線（半截裙冇）
    } else {
      for (const x of [ww * 0.2, ww * 0.8]) g.rect(x - 0.5, beltMid - beltH / 2, 1, beltH, shade(C.belt, 0.8)); // 褲耳
    }
  };
  const pocket = (g, px) => {
    const Q = B.pocket;
    const x0 = px - Q.w / 2;
    g.rect(x0, Q.top, Q.w, Q.h, P.dark);
    g.rect(x0 + 0.5, Q.top + 0.5, Q.w - 1, Q.h - 1, P.main);
    g.shape((x, y) => y > Q.top && y < Q.top + Q.flap + 1.2 && x > x0 && x < x0 + Q.w && y - Q.top < Q.flap + 1.2 - (Math.abs(x - px) / (Q.w / 2)) * 1.2, P.dark); // 袋蓋（中間尖）
    g.shape((x, y) => y > Q.top + 0.5 && x > x0 + 0.5 && x < x0 + Q.w - 0.5 && y - Q.top < Q.flap + 0.7 - (Math.abs(x - px) / (Q.w / 2)) * 1.2, shade(P.main, 1.03));
    g.rect(px - 0.75, Q.top + Q.flap - 0.5, 1.5, 1.5, '#d9d2bf'); // 鈕
  };
  const front = (g) => {
    g.rect(cx - 1.25, 4, 2.5, beltMid - 4, P.main); // 門襟
    g.rect(cx - 1.25, 4, 0.5, beltMid - 4, P.dark);
    for (let y = 9; y < beltMid - 3; y += 6.5) g.rect(cx - 0.5, y, 1, 1, '#d9d2bf');
    pocket(g, cx + B.pocket.x); // 穿著者左（望落去右手邊）
    pocket(g, cx - B.pocket.x);
    drawCollar(g, cx, nw, P.collar, P.dark);
    lower(w, true)(g);
  };
  return boxFaces(
    [w, h, d],
    {
      pz: front,
      nz: (g) => {
        g.rect(0, SHIRT_YOKE, w, 0.5, P.dark); // 背後膊頭擔干
        g.rect(cx - nw / 2 - 2.5, 0, nw + 5, 2, P.collar);
        g.rect(cx - nw / 2 - 2.5, 2, nw + 5, 0.5, P.dark);
        lower(w)(g);
      },
      px: (g) => { g.rect(0, 0, d, 0.5, P.dark); lower(d)(g); },
      nx: (g) => { g.rect(0, 0, d, 0.5, P.dark); lower(d)(g); },
      py: (g) => {
        // 領圈 + 肩帶（由領去到膊頭邊，近領嗰頭有粒鈕）
        g.shape((x, y) => Math.abs(x - cx) < nw / 2 + 2 && Math.abs(y - d / 2) < B.neck.d / 2 + 2, P.collar);
        for (const sx of [-1, 1]) {
          const x0 = sx < 0 ? 0 : cx + nw / 2 + 2.5;
          const len = cx - nw / 2 - 2.5;
          g.rect(x0, d / 2 - 2, len, 4, P.dark);
          // 膊頭嗰頭唔畫邊：肩帶繼續去到袖頂（膊頭）
          g.rect(sx < 0 ? x0 : x0 + 0.3, d / 2 - 1.6, len - 0.3, 3.2, shade(P.main, 1.02));
          g.rect(sx < 0 ? x0 + len - 2 : x0 + 1, d / 2 - 0.6, 1.2, 1.2, '#d9d2bf');
        }
      },
      ny: (g) => g.fill(legColour),
    },
    P.main,
  );
}

/** 幼童軍長襪：深草青色、直坑紋、襪頭摺下（sockH = 襪由腳底量起幾高） */
export function cubShinFaces(size, sockH, sock = C.cubSock) {
  const [w, h, d] = size;
  const turn = 3;
  const f = (ww) => (g) => {
    g.rect(0, h - sockH, ww, sockH, sock);
    for (let x = 0.75; x < ww; x += 1.5) g.rect(x, h - sockH + turn, 0.5, sockH - turn - 1, shade(sock, 0.85)); // 直坑紋
    g.rect(0, h - sockH, ww, turn, shade(sock, 1.12)); // 摺落嚟嘅襪頭
    g.rect(0, h - sockH + turn - 0.5, ww, 0.5, shade(sock, 0.7));
  };
  return boxFaces(size, { px: f(d), nx: f(d), pz: f(w), nz: f(w), ny: (g) => g.fill(sock) }, C.skin);
}

/** 幼童軍帽身：kind = 'cap'（男，黃間條鴨舌帽）／'round'（女，圓形有邊帽） */
export function cubCapFaces(size, kind) {
  const [w, h, d] = size;
  const G = C.capGreen, Y = C.capPiping;
  if (kind === 'round') {
    const side = (ww) => (g) => { g.rect(0, h - 1.5, ww, 1.5, shade(G, 0.75)); };
    return boxFaces(size, { px: side(d), nx: side(d), pz: side(w), nz: side(w), ny: (g) => g.fill(shade(G, 0.7)) }, G);
  }
  const side = (ww) => (g) => {
    for (const x of [ww * 0.25, ww * 0.5, ww * 0.75]) g.rect(x - 0.3, 0, 0.6, h, Y); // 間條
    g.rect(0, h - 0.6, ww, 0.6, Y);
  };
  return boxFaces(size, {
    px: side(d), nx: side(d), pz: side(w), nz: side(w),
    py: (g) => {
      g.rect(w / 2 - 0.3, 0, 0.6, d, Y);
      g.rect(0, d / 2 - 0.3, w, 0.6, Y);
      g.rect(w / 2 - 1, d / 2 - 1, 2, 2, Y); // 帽頂鈕
    },
    ny: (g) => g.fill(shade(G, 0.7)),
  }, G);
}

/* ---------------- 旅巾、巾圈 ---------------- */
/** 一條卷起嘅旅巾（沿長度方向有兩條花邊）。length 喺 u 方向。 */
export function rollFaces(size, main, border) {
  const [w, h, d] = size;
  const stripes = (ww, hh) => (g) => { g.fill(main); g.rect(0, hh * 0.2, ww, 0.5, border); g.rect(0, hh * 0.8 - 0.5, ww, 0.5, border); };
  return boxFaces(size, { px: stripes(d, h), nx: stripes(d, h), pz: stripes(w, h), nz: stripes(w, h), py: (g) => g.fill(main), ny: (g) => g.fill(main) });
}

/** 巾尾：扁長條，尖頭（透明），兩邊花邊。v 方向 = 長度（向下）。 */
export function tailCanvas(wcm, lcm, main, border, tip = 3.5) {
  return canvas(wcm, lcm, (g) => {
    g.fill(main);
    g.rect(0.5, 0, 0.5, lcm, border);
    g.rect(wcm - 1, 0, 0.5, lcm, border);
    g.clear((x, y) => y > lcm - tip && Math.abs(x - wcm / 2) > (wcm / 2) * ((lcm - y) / tip));
  });
}

/* 旅巾花款（src/lib/necker.js）：P = { pattern, colours }；dir = 斜紋方向（左右鏡像） */
const paintStripes = (g, P, dir) => {
  const n = P.colours.length;
  g.fill(P.colours[0]);
  for (let i = 1; i < n; i++) g.shape((x, y) => stripeIndex(x, y, n, dir) === i, P.colours[i]);
};

/** 巾尾（跟花款）：素色＝兩邊花邊；斜紋＝成條斜紋 */
export function neckerTailCanvas(wcm, lcm, P, tip = 3.5, dir = 1) {
  if (P.pattern !== 'stripe') return tailCanvas(wcm, lcm, P.colours[0], P.colours[1], tip);
  return canvas(wcm, lcm, (g) => {
    paintStripes(g, P, dir);
    g.clear((x, y) => y > lcm - tip && Math.abs(x - wcm / 2) > (wcm / 2) * ((lcm - y) / tip));
  });
}

/** 卷起嘅旅巾（跟花款） */
export function neckerRollFaces(size, P, dir = 1) {
  if (P.pattern !== 'stripe') return rollFaces(size, P.colours[0], P.colours[1]);
  const st = (g) => paintStripes(g, P, dir);
  return boxFaces(size, { px: st, nx: st, pz: st, nz: st, py: (g) => g.fill(P.colours[0]), ny: (g) => g.fill(P.colours[0]) });
}

/**
 * 背後三角（跟花款，左右可以唔同色）：畫布左半 = 穿著者左（平面轉咗 180°）。
 * 素色：斜邊一條花邊；斜紋：斜邊由外到內色 2、色 3 平行色邊（用戶附圖）。
 */
export function neckerBackCanvas(wcm, hcm, PL, PR = PL) {
  return canvas(wcm, hcm, (g) => {
    const half = (y) => (wcm / 2) * (1 - y / hcm);
    for (const [P, onSide] of [[PL, (x) => x < wcm / 2], [PR, (x) => x >= wcm / 2]]) {
      const inside = (x, y) => onSide(x) && Math.abs(x - wcm / 2) < half(y);
      const edge = (x, y) => half(y) - Math.abs(x - wcm / 2);
      g.shape(inside, P.colours[0]);
      if (P.pattern !== 'stripe') {
        g.shape((x, y) => { const e = edge(x, y); return inside(x, y) && e > 0.5 && e < 1.1; }, P.colours[1]);
      } else {
        P.colours.slice(1).forEach((c, i) => g.shape((x, y) => { const e = edge(x, y); return inside(x, y) && e > 0.5 + i * 1.2 && e < 1.7 + i * 1.2; }, c));
      }
    }
    g.clear((x, y) => Math.abs(x - wcm / 2) >= half(y));
  });
}

/** 背後三角（旅巾尖），兩條斜邊花邊。 */
export function backTriangleCanvas(wcm, hcm, main, border) {
  return canvas(wcm, hcm, (g) => {
    const half = (y) => (wcm / 2) * (1 - y / hcm);
    g.shape((x, y) => Math.abs(x - wcm / 2) < half(y), main);
    g.shape((x, y) => { const e = half(y) - Math.abs(x - wcm / 2); return e > 0.5 && e < 1.1; }, border);
    g.clear((x, y) => Math.abs(x - wcm / 2) >= half(y));
  });
}

/* ---------------- 制服毛衣、領帶（手冊 P.113、P.121–122） ---------------- */
/** 調光（唔混白色，保持色相）：膊布用 */
export const brighten = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.min(255, Math.round(v * k));
  return `#${((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, '0')}`;
};

/** 毛衣坑紋：每 1 cm 一條深色直線 */
const ribs = (g, ww, hh, dark, y0 = 0) => { for (let x = 0.5; x < ww; x += 1) g.rect(x, y0, 0.3, hh - y0, dark); };

/**
 * 制服毛衣上身（同背心一樣嘅殼）：深草青色／深藍色、坑紋、圓領（頂面透明見到恤衫領）、
 * 膊頭淺色膊布（附圖）、坑紋衫腳。前面同頂面有透明位，要用 alpha 材質。
 */
export function sweaterFaces(size, colour, neck) {
  const [w, h, d] = size;
  const dark = shade(colour, 0.8);
  const patch = brighten(colour, 1.75); // 膊布（附圖較淺色）
  const cx = w / 2;
  const hole = neck / 2 + 1.2;
  const band = 3.5; // 衫腳坑紋
  const body = (ww) => (g) => {
    ribs(g, ww, h, dark);
    g.rect(0, h - band, ww, band, shade(colour, 0.9));
    ribs(g, ww, h, shade(colour, 0.7), h - band);
    g.rect(0, 0, ww, 3.5, patch);
    g.rect(0, 3.5, ww, 0.4, dark);
  };
  return boxFaces(size, {
    pz: (g) => {
      body(w)(g);
      g.rect(cx - hole - 1, 0, (hole + 1) * 2, 1, dark); // 領口坑紋
    },
    nz: body(w),
    px: body(d),
    nx: body(d),
    py: (g) => {
      g.fill(patch);
      g.shape((x, y) => Math.abs(x - cx) < hole + 1 && Math.abs(y - d / 2) < hole + 1, dark); // 領口坑紋
      g.clear((x, y) => Math.abs(x - cx) < hole && Math.abs(y - d / 2) < hole);
    },
    ny: (g) => g.fill(dark),
  }, colour);
}

/** 毛衣長袖（上袖）：坑紋；頂 3 cm 膊布 */
export function sweaterSleeveFaces(size, colour) {
  const [w, h, d] = size;
  const dark = shade(colour, 0.8);
  const patch = brighten(colour, 1.75);
  const f = (ww) => (g) => {
    ribs(g, ww, h, dark);
    g.rect(0, 0, ww, 3, patch);
  };
  return boxFaces(size, { px: f(d), nx: f(d), pz: f(w), nz: f(w), py: (g) => g.fill(patch) }, colour);
}

/** 毛衣前臂袖：坑紋 + 袖口坑紋 */
export function sweaterCuffFaces(size, colour) {
  const [w, h, d] = size;
  const dark = shade(colour, 0.8);
  const f = (ww) => (g) => {
    ribs(g, ww, h, dark);
    g.rect(0, h - 3, ww, 3, shade(colour, 0.9));
    ribs(g, ww, h, shade(colour, 0.7), h - 3);
  };
  return boxFaces(size, { px: f(d), nx: f(d), pz: f(w), nz: f(w), ny: (g) => g.fill(dark) }, colour);
}

/** 領帶（手冊 P.113）：上窄下闊，尖頭；中間一條淺少少嘅摺線 */
export function tieCanvas(wTop, wBottom, len, colour) {
  return canvas(wBottom, len, (g) => {
    const half = (y) => (wTop + (wBottom - wTop) * Math.min(1, y / (len - wBottom / 2))) / 2;
    const tip = wBottom / 2;
    g.shape((x, y) => {
      const dx = Math.abs(x - wBottom / 2);
      if (y > len - tip) return dx < (len - y);
      return dx < half(y);
    }, colour);
    g.shape((x, y) => y < len - tip && Math.abs(x - wBottom / 2) < 0.25, shade(colour, 1.18));
  });
}

export const plain = (w, h, color) => solid(w, h, color);

/** 巾圈：一個環（前面畫出中間窿位，見到後面嘅旅巾） */
export function wogglePaint(size, colour) {
  const [w, h] = size;
  const dark = '#00000055';
  return boxFaces(size, {
    pz: (g) => { g.rect(1.2, 0.7, w - 2.4, h - 1.4, dark); g.rect(0, 0, w, 0.5, '#ffffff40'); },
  }, colour);
}

/** 童軍巾圈（手冊 P.110 相片）：啡色皮巾圈，前面有壓紋；徽號唔畫 */
export function scoutWogglePaint(size) {
  const [w, h] = size;
  return boxFaces(size, {
    pz: (g) => {
      g.rect(0, 0, w, 0.5, C.leatherHi);
      g.rect(0, h - 0.5, w, 0.5, shade(C.leather, 0.7));
      g.rect(w / 2 - 1, 0.75, 2, h - 1.5, shade(C.leather, 0.8)); // 壓紋位
    },
  }, C.leather);
}

/** 基維爾巾圈（手冊 P.111、P.115 相片）：啡色皮繩土耳其結；用交叉斜紋示意。trainer = 加「斧頭木」金屬訓練隊標誌（P.116） */
export function gilwellWogglePaint(size, { trainer = false } = {}) {
  const [w, h, d] = size;
  const knot = (ww, hh) => (g) => {
    const dark = shade(C.gilwellWoggle, 0.62);
    const hi = shade(C.gilwellWoggle, 1.22);
    g.shape((x, y) => Math.abs(((x + y) % 2) - 1) < 0.3, dark); // 斜紋（一個方向）
    g.shape((x, y) => Math.abs(((x - y + 40) % 2) - 1) < 0.22, hi); // 斜紋（另一個方向）
    g.rect(0, 0, ww, 0.5, hi);
    g.rect(0, hh - 0.5, ww, 0.5, dark);
  };
  return boxFaces(size, {
    pz: (g) => {
      knot(w, h)(g);
      if (trainer) {
        g.rect(w / 2 - 1.75, h / 2 - 0.5, 3.5, 1, '#c9ccd1'); // 斧頭木（示意）
        g.rect(w / 2 - 1.75, h / 2 - 0.5, 3.5, 0.5, '#eef0f2');
      }
    },
    px: knot(d, h), nx: knot(d, h), nz: knot(w, h), py: knot(w, d), ny: knot(w, d),
  }, C.gilwellWoggle);
}

/** 深綠色金邊硬帽（手冊 P.100、P.105 附圖）：深綠色帽身，頂邊同帽邊有金邊 */
export function hardHatFaces(size) {
  const [w, h, d] = size;
  const G = C.hardHat, Y = C.gold;
  const side = (ww) => (g) => {
    g.rect(0, 0, ww, 0.5, Y); // 頂邊金邊
    g.rect(0, h - 0.6, ww, 0.6, Y); // 帽邊金邊
    g.rect(0, 0.5, ww, 0.5, shade(G, 0.8));
  };
  return boxFaces(size, {
    px: side(d), nx: side(d), pz: side(w), nz: side(w),
    py: (g) => { g.fill(shade(G, 1.08)); g.rect(0, 0, w, 0.5, Y); g.rect(0, d - 0.5, w, 0.5, Y); g.rect(0, 0, 0.5, d, Y); g.rect(w - 0.5, 0, 0.5, d, Y); },
    ny: (g) => g.fill(shade(G, 0.6)),
  }, G);
}

/* ---------------- v25 材質種類標記（皮膚、頭髮、鞋唔要布紋） ---------------- */
export function headFaces(B) {
  return tagKind(headFacesRaw(B), 'skin');
}
export function pigtailFaces(size, tie) {
  return tagKind(pigtailFacesRaw(size, tie), 'hair');
}
export function handFaces(size) {
  return tagKind(handFacesRaw(size), 'skin');
}
export function shoeFaces(size, opts) {
  return tagKind(shoeFacesRaw(size, opts), 'shoe');
}

/* ---------------- 材質 ---------------- */
const texCache = new WeakMap();
function texOf(c) {
  if (texCache.has(c)) return texCache.get(c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  texCache.set(c, t);
  return t;
}

/** 灰模：保留圖案光暗同透明度，顏色變灰（Hero Forge「未上色」） */
const greyCache = new WeakMap();
export function greyOf(c) {
  if (greyCache.has(c)) return greyCache.get(c);
  const g = document.createElement('canvas');
  g.width = c.width;
  g.height = c.height;
  const ctx = g.getContext('2d');
  ctx.drawImage(c, 0, 0);
  const img = ctx.getImageData(0, 0, g.width, g.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const l = 0.3 * img.data[i] + 0.59 * img.data[i + 1] + 0.11 * img.data[i + 2];
    const v = 150 + (l / 255) * 70;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  greyCache.set(c, g);
  return g;
}

export function material(c, { painted = true, alpha = false, double = false, detailed = false } = {}) {
  // alpha：透明位（例如背心領口）要 alphaTest，唔係會見到黑色
  if (!detailed) {
    return new THREE.MeshStandardMaterial({
      map: texOf(painted ? c : greyOf(c)),
      roughness: painted ? 0.85 : 0.6,
      metalness: 0,
      alphaTest: alpha ? 0.5 : 0,
      side: double ? THREE.DoubleSide : THREE.FrontSide,
    });
  }
  // v25 精緻：放大貼圖（斜邊順滑）＋布紋法線；皮膚、鞋、頭髮、皮革唔要布紋
  const K = KIND_PROPS[c.kind] ?? KIND_PROPS.cloth;
  const [wcm, hcm] = canvasCm(c);
  const m = new THREE.MeshStandardMaterial({
    map: fineTexOf(fineCanvas(painted ? c : greyOf(c), K.cloth)),
    roughness: painted ? K.roughness : 0.6,
    metalness: 0,
    alphaTest: alpha ? 0.5 : 0,
    side: double ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (K.normal > 0) {
    m.normalMap = fabricNormal(wcm, hcm);
    m.normalScale = new THREE.Vector2(K.normal, K.normal);
  }
  return m;
}

const fineTexCache = new WeakMap();
function fineTexOf(c) {
  if (fineTexCache.has(c)) return fineTexCache.get(c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 8;
  fineTexCache.set(c, t);
  return t;
}

/* ---------------- 禮服、晚禮服（手冊 P.57–62、P.203–205） ---------------- */
/**
 * 禮服上衣（編號 1，手冊 P.59 附圖）：草青色、四粒會徽銅鈕、四個有蓋袋（兩胸袋、兩下袋）、翻領；
 * V 位見到杏色恤衫領同深綠色領帶。D = body.js dressLayout；殼頂（y = 0）高過膊頭 SWEATER_TOP。
 * 頂面中間透明（衣領同頸穿過），要用 alpha 材質。
 */
export function dressJacketFaces(D, B, { colour, shirt, tie, waist }) {
  const { w, h, d } = D;
  const cx = w / 2;
  const dark = shade(colour, 0.78);
  const lap = shade(colour, 1.06);
  const { half, depth } = D.opening;
  const vHalf = (y) => half * (1 - y / depth);
  const P = B.pocket;
  const pTop = P.top + (D.top - (B.torso.y + B.torso.h)); // 胸袋頂（同恤衫胸袋一樣高）
  const pocket = (g, px, top, pw, ph, flap) => {
    const x0 = px - pw / 2;
    g.rect(x0, top, pw, ph, dark);
    g.rect(x0 + 0.4, top + 0.4, pw - 0.8, ph - 0.8, colour);
    g.rect(x0 - 0.3, top - 0.2, pw + 0.6, flap + 0.4, dark); // 袋蓋
    g.rect(x0 + 0.1, top + 0.2, pw - 0.2, flap - 0.4, lap);
    g.rect(px - 0.25, top + flap + 0.2, 0.5, ph - flap - 0.6, shade(colour, 0.88)); // 中間褶
    g.rect(px - 0.6, top + flap - 1.6, 1.2, 1.2, C.brass); // 銅鈕
  };
  const front = (g) => {
    // 翻領（V 位外面一條斜帶）
    g.shape((x, y) => {
      const e = Math.abs(x - cx) - Math.max(0, vHalf(y));
      return y < depth + 1 && e >= 0 && e < 4.6 - y * 0.14;
    }, lap);
    g.shape((x, y) => {
      const e = Math.abs(x - cx) - Math.max(0, vHalf(y));
      const o = 4.6 - y * 0.14;
      return y < depth + 1 && e >= o - 0.4 && e < o;
    }, dark);
    // V 位：恤衫 + 領帶
    g.shape((x, y) => y < depth && Math.abs(x - cx) < vHalf(y), shirt);
    g.shape((x, y) => y < depth && Math.abs(x - cx) < vHalf(y) && Math.abs(x - cx) > vHalf(y) - 0.4, dark);
    g.shape((x, y) => y < 4 && Math.abs(x - cx) > 1.7 && Math.abs(x - cx) < vHalf(y) - 0.4 && y > (Math.abs(x - cx) - 1.7) * 0.9, shade(shirt, 0.86)); // 恤衫領尖
    g.shape((x, y) => y > 0.2 && y < depth && Math.abs(x - cx) < Math.min(vHalf(y) - 0.3, 1.5 + y * 0.03), tie);
    g.rect(cx - 0.15, depth, 0.3, h - depth - 0.6, dark); // 門襟
    const first = depth + 1.4;
    const last = D.top - waist + 2;
    for (let i = 0; i < 4; i++) g.rect(cx - 0.7, first + ((last - first) * i) / 3, 1.4, 1.4, C.brass);
    pocket(g, cx + P.x, pTop, P.w, P.h, P.flap); // 穿著者左（望落去右手邊）
    pocket(g, cx - P.x, pTop, P.w, P.h, P.flap);
    const lowTop = D.top - waist - 5;
    const lw = Math.min(14, w / 2 - 3);
    const lh = Math.min(14, h - 2 - lowTop);
    for (const s of [1, -1]) pocket(g, cx + s * (w / 2 - 1.5 - lw / 2), lowTop, lw, lh, 4.6);
    g.rect(0, h - 0.6, w, 0.6, dark);
  };
  const side = (ww) => (g) => {
    g.rect(ww / 2 - 0.15, 0, 0.3, h, shade(colour, 0.9));
    g.rect(0, h - 0.6, ww, 0.6, dark);
  };
  return boxFaces([w, h, d], {
    pz: front,
    nz: (g) => {
      g.rect(cx - B.neck.w / 2 - 2, 0, B.neck.w + 4, 3, lap); // 衣領
      g.rect(cx - 0.15, h - 16, 0.3, 16, dark); // 背衩
      g.rect(0, h - 0.6, w, 0.6, dark);
    },
    px: side(d),
    nx: side(d),
    py: (g) => {
      const hole = B.neck.w / 2 + 1.75;
      g.shape((x, y) => Math.abs(x - cx) < hole + 1.2 && Math.abs(y - d / 2) < hole + 1.2, lap);
      g.clear((x, y) => Math.abs(x - cx) < hole && Math.abs(y - d / 2) < hole);
    },
    ny: (g) => g.fill(dark),
  }, colour);
}

/**
 * 晚禮服上衣（編號 2，手冊 P.62 附圖）：短身、前面敞開見到白恤衫（胸前冇花褶）同紫色絲質腰封；兩邊青果領（翻領）。
 * 夏季白、冬季黑。翻領銀色童軍徽由 Blocky 用手冊圖案貼上去（唔喺呢度畫）。
 */
export function messJacketFaces(D, B, { colour, shirt, purple, leg }) {
  const { w, h, d } = D;
  const cx = w / 2;
  const white = colour !== C.messBlack;
  const line = white ? '#b9b9b2' : '#000000';
  const lapel = white ? '#fdfdfb' : '#2a2a31';
  const yh = D.top - D.hem; // 上衣前幅底
  const yc0 = D.top - D.cummerbund.top;
  const yc1 = D.top - D.cummerbund.bottom;
  const open = (y) => D.opening.half + y * 0.05;
  const lapEnd = D.top - (D.fleur.y - 9);
  const front = (g) => {
    // 翻領
    g.shape((x, y) => y < lapEnd && Math.abs(x - cx) >= open(y) && Math.abs(x - cx) < open(y) + D.lapelW, lapel);
    g.shape((x, y) => y < lapEnd && Math.abs(Math.abs(x - cx) - open(y) - D.lapelW) < 0.2, line);
    g.shape((x, y) => Math.abs(y - lapEnd) < 0.2 && Math.abs(x - cx) >= open(y) && Math.abs(x - cx) < open(y) + D.lapelW, line);
    // 敞開位：白恤衫 + 鈕
    g.shape((x, y) => y < yh && Math.abs(x - cx) < open(y), shirt);
    g.shape((x, y) => y < yh && Math.abs(Math.abs(x - cx) - open(y)) < 0.2, line);
    g.rect(cx - 0.15, 3, 0.3, yc0 - 3, shade(shirt, 0.9));
    for (let y = 6; y < yc0 - 2; y += 5) g.rect(cx - 0.4, y, 0.8, 0.8, '#26262c');
    // 腰封：敞開位入面、上衣前幅下面一圈
    g.shape((x, y) => y >= yc0 && y < yc1 && (Math.abs(x - cx) < open(y) || y >= yh), purple);
    for (let y = yc0 + 1.5; y < yc1; y += 1.8) g.shape((x, yy) => Math.abs(yy - y) < 0.15 && (Math.abs(x - cx) < open(yy) || yy >= yh), shade(purple, 0.78));
    g.rect(0, yc1, w, h - yc1, leg);
    g.shape((x, y) => Math.abs(y - yh) < 0.2 && Math.abs(x - cx) >= open(y), line); // 上衣前幅底
  };
  const around = (ww) => (g) => {
    g.rect(0, yh, ww, yc1 - yh, purple);
    g.rect(0, yc1, ww, h - yc1, leg);
    g.rect(0, yh - 0.3, ww, 0.3, line);
  };
  return boxFaces([w, h, d], {
    pz: front,
    nz: (g) => {
      g.rect(0, yh, w, h - yh, leg);
      g.rect(cx - B.neck.w / 2 - 2, 0, B.neck.w + 4, 3, lapel);
    },
    px: around(d),
    nx: around(d),
    py: (g) => {
      const hole = B.neck.w / 2 + 1.75;
      g.clear((x, y) => Math.abs(x - cx) < hole && Math.abs(y - d / 2) < hole);
    },
    ny: (g) => g.fill(leg),
  }, colour);
}

/** 晚禮服長褲（手冊 P.61）：黑色、兩邊褲側紫色絲質間條 */
export function messTrouserFaces(size, colour, stripe) {
  const [w, h, d] = size;
  const side = (g) => g.rect(d / 2 - 0.5, 0, 1, h - 1, stripe);
  const hem = (ww) => (g) => g.rect(0, h - 1, ww, 1, shade(colour, 0.7));
  return boxFaces(size, {
    px: (g) => { side(g); hem(d)(g); },
    nx: (g) => { side(g); hem(d)(g); },
    pz: (g) => { hem(w)(g); g.rect(w / 2 - 0.2, 0, 0.4, h - 1, '#2a2a30'); },
    nz: hem(w),
  }, colour);
}
