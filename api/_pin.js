// 3D 匯出密碼檢查（伺服器邊）— SCOUT3D v1.0 · © SCOUT SYSTEM
// 密碼喺環境變數 EXPORT_PIN（冇 VITE_ 前綴，唔會打包入前端 JS）。Vercel function 同 vite dev／preview 共用。
// 檔名 _ 開頭：Vercel 唔會當佢係獨立 function。
import { timingSafeEqual } from 'node:crypto';

export const MAX_TRIES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

/** 4 位數字先算有設定 */
export function configuredPin(env = process.env) {
  const v = String(env?.EXPORT_PIN ?? '').trim();
  return /^\d{4}$/.test(v) ? v : null;
}

/** 定時比較，唔會因為頭幾個字啱咗而快啲答 */
export function pinMatches(expected, given) {
  if (!expected || typeof given !== 'string' || !/^\d{4}$/.test(given)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * 每個 IP 15 分鐘內最多錯 5 次（記憶體，只限同一個 function instance；擋一般亂試）。
 * 返回 { tried(ip, ok) → { ok, locked, left } }。
 */
export function createLimiter({ max = MAX_TRIES, windowMs = WINDOW_MS, now = () => Date.now() } = {}) {
  const fails = new Map();
  const current = (ip) => {
    const f = fails.get(ip);
    if (f && now() - f.first > windowMs) {
      fails.delete(ip);
      return null;
    }
    return f ?? null;
  };
  return {
    locked: (ip) => (current(ip)?.n ?? 0) >= max,
    record(ip, ok) {
      if (ok) {
        fails.delete(ip);
        return { left: max };
      }
      const f = current(ip) ?? { n: 0, first: now() };
      f.n += 1;
      fails.set(ip, f);
      return { left: Math.max(0, max - f.n) };
    },
  };
}

const limiter = createLimiter();

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(safeJson(req.body));
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1024) req.destroy();
    });
    req.on('end', () => resolve(safeJson(raw)));
    req.on('error', () => resolve({}));
  });
}

function safeJson(s) {
  try {
    return JSON.parse(s || '{}') ?? {};
  } catch {
    return {};
  }
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * GET  → { enabled }（有冇設定密碼；唔會講密碼係乜）
 * POST { pin } → { ok } ／ 403 { ok:false, left } ／ 429 { ok:false, locked:true }
 */
export async function handlePin(req, res, env = process.env, { delayMs = 600 } = {}) {
  const expected = configuredPin(env);
  if (req.method === 'GET') return send(res, 200, { enabled: !!expected });
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!expected) return send(res, 404, { enabled: false });
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? '?').split(',')[0].trim();
  if (limiter.locked(ip)) return send(res, 429, { ok: false, locked: true });
  const { pin } = await readBody(req);
  const ok = pinMatches(expected, typeof pin === 'string' ? pin : String(pin ?? ''));
  const { left } = limiter.record(ip, ok);
  if (ok) return send(res, 200, { ok: true });
  await new Promise((r) => setTimeout(r, delayMs)); // 錯咗慢少少答
  return send(res, left ? 403 : 429, { ok: false, left, locked: !left });
}
