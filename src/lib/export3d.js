// 3D 匯出：GLB（連顏色、徽章貼圖）、STL（3D 打印，淨形狀）— v1.0 · © SCOUT SYSTEM
// 要密碼先用得（環境變數 VITE_EXPORT_PIN，4 位數字）。注意：純前端網站，密碼會喺打包後嘅 JS 入面，只係擋一般用戶。

/** 4 位數字先算有設定；冇設定就唔顯示 3D 匯出 */
export function exportPin(env = import.meta.env) {
  const v = String(env?.VITE_EXPORT_PIN ?? '').trim();
  return /^\d{4}$/.test(v) ? v : null;
}

/** GLB：Blender、Windows 3D 檢視器、手機 AR 都開得；單位 = 米 */
export async function exportGlb(object) {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const buf = await new GLTFExporter().parseAsync(object, { binary: true, onlyVisible: true, maxTextureSize: 2048 });
  return new Blob([buf], { type: 'model/gltf-binary' });
}

/**
 * STL（binary）：場景單位係米，乘 scale 變毫米。預設 100 = 1:10（172 cm 領袖 → 172 mm 公仔）。
 * STL 冇顏色；徽章、巾尾係薄片（冇厚度），打印前喺切片軟件調整。
 */
export async function exportStl(object, scale = 100) {
  const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js');
  object.updateWorldMatrix(true, true);
  const view = new STLExporter().parse(object, { binary: true });
  scaleStl(view, scale);
  return new Blob([view.buffer], { type: 'model/stl' });
}

/** binary STL：頭 80 byte、三角形數 uint32；每個三角形 50 byte（法線 3f、3 個頂點 9f、uint16） */
export function scaleStl(view, k) {
  const n = view.getUint32(80, true);
  for (let i = 0; i < n; i++) {
    const base = 84 + i * 50 + 12;
    for (let j = 0; j < 9; j++) view.setFloat32(base + j * 4, view.getFloat32(base + j * 4, true) * k, true);
  }
  return view;
}
