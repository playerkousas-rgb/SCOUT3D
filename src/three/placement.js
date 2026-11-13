// 用 raycast 將徽章貼喺衣服表面（避免浮空／穿入）— v1.0 · © SCOUT SYSTEM
import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

/**
 * 喺 geometry 本地座標由 origin 沿 dir 打一條線，攞第一個交點同法線，
 * 再砌一個「z = 法線、y ≈ up」嘅旋轉，畀 DecalGeometry 用。
 * 回傳 null = 打唔中（資料或模型有問題，唔好畫）。
 */
export function placeOnSurface(geometry, origin, dir, up = new THREE.Vector3(0, 1, 0)) {
  const mesh = new THREE.Mesh(geometry, tmpMat);
  mesh.updateMatrixWorld(true);
  raycaster.set(origin, dir.clone().normalize());
  raycaster.near = 0;
  raycaster.far = 10;
  const hits = raycaster.intersectObject(mesh, false);
  if (!hits.length) return null;
  const hit = hits[0];
  const n = hit.face.normal.clone().normalize();
  // 法線要指返出嚟（向射線來源）
  if (n.dot(dir) > 0) n.negate();
  const x = new THREE.Vector3().crossVectors(up, n);
  if (x.lengthSq() < 1e-8) x.set(1, 0, 0);
  x.normalize();
  const y = new THREE.Vector3().crossVectors(n, x).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, n);
  const rotation = new THREE.Euler().setFromRotationMatrix(m);
  return { position: hit.point.clone(), normal: n, rotation };
}
