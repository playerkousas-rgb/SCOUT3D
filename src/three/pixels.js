// 方塊人像素貼圖（每格 0.5 cm）— v1.0 · © SCOUT SYSTEM
// 每個方塊 6 面：[+x, -x, +y, -y, +z, -z]（Three.js BoxGeometry 次序）。
// +z = 前面，+x = 穿著者左。畫圖座標以厘米計，左上角為原點。
import * as THREE from 'three';
import { PX, COLOURS as C } from './body.js';

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
export function headFaces(B) {
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
export function pigtailFaces(size, tie) {
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
  if (top === 'cub') return { main: C.cubShirt, dark: C.cubShirtShade, trim: C.cubShirtShade, collar: shade(C.cubShirt, 1.04) };
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
  return boxFaces([w, h, d], { px: f(d), nx: f(d), pz: f(w), nz: f(w), py: () => {}, ny: (g) => g.fill(long ? P.main : P.trim) }, P.main);
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

/** 帽邊／帽舌：上面主色，底面深色 */
export function brimFaces(size, colour) {
  const dark = shade(colour, colour === '#ffffff' ? 0.86 : 0.75);
  return boxFaces(size, { ny: (g) => g.fill(dark), py: (g) => { const [w, , d] = size; g.rect(0, 0, w, 0.5, dark); g.rect(0, d - 0.5, w, 0.5, dark); } }, colour);
}

export const skinFaces = (size) => boxFaces(size, {}, C.skin);

export function handFaces(size) {
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

export function shoeFaces(size, { colour = C.shoe, sole: soleC = C.sole, lace = C.lace } = {}) {
  const [w, h, d] = size;
  const sole = (ww) => (g) => g.rect(0, h - 1.5, ww, 1.5, soleC);
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
export function cubTorsoFaces(B, { legColour = C.cubGreen } = {}) {
  const { w, h, d } = B.torso;
  const P = shirtPalette('cub', C.cubShirt);
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
      g.rect(cx - 0.25, beltMid + beltH / 2, 0.5, h, shade(legColour, 0.85)); // 褲頭中線
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
        g.rect(0, 9, w, 0.5, P.dark); // 背後膊頭擔干
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
          g.rect(x0 + 0.3, d / 2 - 1.6, len - 0.6, 3.2, shade(P.main, 1.02));
          g.rect(sx < 0 ? x0 + len - 2 : x0 + 1, d / 2 - 0.6, 1.2, 1.2, '#d9d2bf');
        }
      },
      ny: (g) => g.fill(legColour),
    },
    P.main,
  );
}

/** 幼童軍長襪：深草青色、直坑紋、襪頭摺下（sockH = 襪由腳底量起幾高） */
export function cubShinFaces(size, sockH) {
  const [w, h, d] = size;
  const turn = 3;
  const f = (ww) => (g) => {
    g.rect(0, h - sockH, ww, sockH, C.cubSock);
    for (let x = 0.75; x < ww; x += 1.5) g.rect(x, h - sockH + turn, 0.5, sockH - turn - 1, shade(C.cubSock, 0.85)); // 直坑紋
    g.rect(0, h - sockH, ww, turn, shade(C.cubSock, 1.12)); // 摺落嚟嘅襪頭
    g.rect(0, h - sockH + turn - 0.5, ww, 0.5, shade(C.cubSock, 0.7));
  };
  return boxFaces(size, { px: f(d), nx: f(d), pz: f(w), nz: f(w), ny: (g) => g.fill(C.cubSock) }, C.skin);
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

/** 背後三角（旅巾尖），兩條斜邊花邊。 */
export function backTriangleCanvas(wcm, hcm, main, border) {
  return canvas(wcm, hcm, (g) => {
    const half = (y) => (wcm / 2) * (1 - y / hcm);
    g.shape((x, y) => Math.abs(x - wcm / 2) < half(y), main);
    g.shape((x, y) => { const e = half(y) - Math.abs(x - wcm / 2); return e > 0.5 && e < 1.1; }, border);
    g.clear((x, y) => Math.abs(x - wcm / 2) >= half(y));
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

export function material(c, { painted = true, alpha = false, double = false } = {}) {
  // alpha：透明位（例如背心領口）要 alphaTest，唔係會見到黑色
  return new THREE.MeshStandardMaterial({
    map: texOf(painted ? c : greyOf(c)),
    roughness: painted ? 0.85 : 0.6,
    metalness: 0,
    alphaTest: alpha ? 0.5 : 0,
    side: double ? THREE.DoubleSide : THREE.FrontSide,
  });
}
