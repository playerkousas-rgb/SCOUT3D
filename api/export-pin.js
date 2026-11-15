// Vercel function：/api/export-pin — 3D 匯出密碼（EXPORT_PIN）— SCOUT3D v1.0 · © SCOUT SYSTEM
import { handlePin } from './_pin.js';

export default function handler(req, res) {
  return handlePin(req, res);
}
