// 截圖：可見版權角標 + 隱形水印（docs/12 W1/W2）— v1.0 · © SCOUT SYSTEM
import { embedCanvas, makePayloadV2 } from './scout_watermark_codec_v1.0.mjs';
import { APP_VERSION } from '../version.js';

const pad = (n) => String(n).padStart(2, '0');

export function stamp(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** 由 3D canvas 整一張成品 PNG（回傳 Blob） */
export async function captureScreenshot(source, caption) {
  const w = source.width;
  const h = source.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(source, 0, 0, w, h);

  const fs = Math.max(12, Math.round(Math.min(w, h) * 0.022));
  const padPx = Math.round(fs * 0.8);
  g.font = `600 ${fs}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif`;
  g.textBaseline = 'bottom';

  // 左下：說明（待核對）
  if (caption) {
    g.textAlign = 'left';
    const tw = g.measureText(caption).width;
    g.fillStyle = 'rgba(255,255,255,.82)';
    g.fillRect(padPx - fs * 0.4, h - padPx - fs * 1.35, tw + fs * 0.8, fs * 1.55);
    g.fillStyle = '#1d2733';
    g.fillText(caption, padPx, h - padPx);
  }

  // 右下：可見版權（W1）
  const mark = `© SCOUT SYSTEM · ${APP_VERSION}`;
  g.textAlign = 'right';
  g.fillStyle = 'rgba(29,39,51,.72)';
  g.fillText(mark, w - padPx, h - padPx);

  // 隱形水印（W2）：SCOUTSYSTEM|v2|<unit>|<日期>|<hash>
  try {
    embedCanvas(c, makePayloadV2({ unit: 'S3D1', date: stamp(), hash: 'GRHP' }));
  } catch {
    /* 影像太細嵌唔到都照出圖；可見角標已經喺度 */
  }

  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
