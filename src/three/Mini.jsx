// 3D 公仔（MakeHuman CC0 底模 + 小童軍基本服裝）— v1.0 · © SCOUT SYSTEM
// 模型由 tools/figure/bake_figure_v1.0.mjs 離線生成；呢度只負責換旅巾／巾圈顏色、上色／未上色、底座。
import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export const BASE_H = 0.045; // 底座高度（米）
export const MODEL_URL = {
  boy: '/models/grasshopper_boy_v1.0.glb',
  girl: '/models/grasshopper_girl_v1.0.glb',
};
const NECKER_PARTS = new Set(['neckerchief', 'neckerchief_back', 'woggle']);
const UNPAINTED = '#b9bdc1'; // Hero Forge 式「未上色」灰

/** 旅巾布紋：主色 + 兩條花邊（沿長度方向） */
function neckerTexture(main, border) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 4;
  const g = c.getContext('2d');
  g.fillStyle = main;
  g.fillRect(0, 0, 128, 4);
  g.fillStyle = border;
  for (const [a, b] of [
    [0.14, 0.26],
    [0.74, 0.86],
  ]) {
    g.fillRect(Math.round(a * 128), 0, Math.round((b - a) * 128), 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** 未上色：保留貼圖嘅透明度（頭髮、眼睫毛），顏色一律灰 */
function greyOf(src) {
  const m = new THREE.MeshStandardMaterial({
    color: UNPAINTED,
    roughness: 0.62,
    metalness: 0,
    map: src.map ?? null,
    alphaTest: src.alphaTest,
    transparent: false,
    side: src.side,
    shadowSide: THREE.BackSide,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#ifdef USE_MAP\n  diffuseColor.a *= texture2D( map, vMapUv ).a;\n#endif',
    );
  };
  m.customProgramCacheKey = () => 'scout3d-unpainted';
  return m;
}

function Plinth() {
  const geo = useMemo(() => {
    // 圓形底座，邊有斜角（似桌遊公仔）
    const r = 0.27;
    const pts = [
      [0, 0],
      [r + 0.012, 0],
      [r + 0.012, 0.006],
      [r, BASE_H - 0.008],
      [r - 0.008, BASE_H],
      [0, BASE_H],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 96);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow castShadow>
      <meshStandardMaterial color="#2a3038" roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

export default function Mini({ outfit }) {
  const gltf = useGLTF(MODEL_URL[outfit.gender] ?? MODEL_URL.boy, false, true);
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    s.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.material = o.material.clone();
      o.material.shadowSide = THREE.BackSide; // no shadow acne on the double-sided garments
      o.userData.painted = o.material;
      o.userData.grey = greyOf(o.material);
    });
    return s;
  }, [gltf]);

  const necker = useMemo(() => neckerTexture(outfit.neckerMain, outfit.neckerBorder), [outfit.neckerMain, outfit.neckerBorder]);
  useEffect(() => () => necker.dispose(), [necker]);

  useEffect(() => {
    const painted = outfit.finish !== 'unpainted';
    scene.traverse((o) => {
      if (!o.isMesh) return;
      if (NECKER_PARTS.has(o.name)) o.visible = !!outfit.invested;
      const p = o.userData.painted;
      if (o.name === 'neckerchief' || o.name === 'neckerchief_back') {
        p.map = necker;
        p.color.set('#ffffff');
        p.needsUpdate = true;
      }
      if (o.name === 'woggle') p.color.set(outfit.woggle);
      o.material = painted ? p : o.userData.grey;
    });
  }, [scene, necker, outfit.invested, outfit.woggle, outfit.finish]);

  return (
    <group>
      <Plinth />
      <primitive object={scene} position={[0, BASE_H, 0]} />
    </group>
  );
}

useGLTF.preload(MODEL_URL.boy, false, true);
