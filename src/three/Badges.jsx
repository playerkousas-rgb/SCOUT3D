// 徽章貼片（圖案取自官方文件）— v1.0 · © SCOUT SYSTEM
// 每個章係一塊薄片，貼喺上身或者袖外側；撳落去會揀中嗰個章。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { meritCanvas } from '../lib/meritCanvas.js';

const EPS = 0.06; // 離布面 0.06 cm，避免閃
const ACCENT = '#f2791c';

/** 一次過載入所有用到嘅圖（drei 會 cache） */
export function useBadgeTextures(urls) {
  const list = useMemo(() => [...new Set(urls)].sort(), [urls]);
  const loaded = useTexture(list);
  return useMemo(() => {
    const arr = Array.isArray(loaded) ? loaded : [loaded];
    const out = {};
    list.forEach((u, i) => {
      const x = arr[i];
      if (x.colorSpace !== THREE.SRGBColorSpace) {
        x.colorSpace = THREE.SRGBColorSpace; // PNG 係 sRGB，唔設會變灰白
        x.anisotropy = 8;
        x.needsUpdate = true;
      }
      out[u] = x;
    });
    return out;
  }, [list, loaded]);
}

const prep = (x) => {
  x.colorSpace = THREE.SRGBColorSpace;
  x.anisotropy = 8;
  x.needsUpdate = true;
  return x;
};

/**
 * 動態圖案（區章、地域章用圖檔；優異旅團章用 canvas 畫年份），唔用 Suspense：
 * 轉區／改年份時唔會成個公仔閃一閃，未載入完就先顯示素色。
 * arts = { key: resolveArt 結果 }，回傳 { key: texture | null }
 */
export function useDynamicTextures(arts) {
  const [out, setOut] = useState({});
  const sig = JSON.stringify(arts);
  useEffect(() => {
    let alive = true;
    const made = [];
    const entries = Object.entries(JSON.parse(sig));
    Promise.all(
      entries.map(async ([k, a]) => {
        if (!a) return [k, null];
        try {
          if (a.kind === 'merit') {
            const t = prep(new THREE.CanvasTexture(await meritCanvas(a)));
            made.push(t);
            return [k, t];
          }
          const t = prep(await new THREE.TextureLoader().loadAsync(a.file));
          made.push(t);
          return [k, t];
        } catch {
          return [k, null];
        }
      }),
    ).then((list) => {
      if (alive) setOut(Object.fromEntries(list));
      else made.forEach((t) => t.dispose());
    });
    return () => {
      alive = false;
    };
  }, [sig]);
  // 舊 texture 喺換咗之後先釋放
  const prev = useRef({});
  useEffect(() => {
    const old = prev.current;
    prev.current = out;
    for (const [k, t] of Object.entries(old)) if (t && out[k] !== t) t.dispose();
  }, [out]);
  return out;
}

/** fit：圖案喺 w × h 入面置中縮放（各區區章比例唔同） */
function fitSize(p, tex) {
  const img = tex?.image;
  if (!p.fit || !img?.width || !img?.height) return { w: p.w, h: p.h };
  const k = Math.min(p.w / img.width, p.h / img.height);
  return { w: img.width * k, h: img.height * k };
}

function Patch({ p, tex, painted, selected, onSelect, registry }) {
  const ref = useRef();
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!registry || !ref.current) return undefined;
    registry.set(p.key, ref.current);
    return () => registry.delete(p.key);
  }, [registry, p.key]);
  useEffect(() => {
    if (!hover) return undefined;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hover]);

  const round = p.shape === 'circle';
  const ring = selected || hover;
  const { w, h } = fitSize(p, tex);
  return (
    <group>
      <mesh
        ref={ref}
        renderOrder={2}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(p.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        receiveShadow
      >
        {round ? <circleGeometry args={[w / 2, 48]} /> : <planeGeometry args={[w, h]} />}
        <meshStandardMaterial
          key={tex ? tex.uuid : 'none'}
          map={painted && tex ? tex : null}
          color={painted ? (tex ? '#f2f2f2' : '#9aa0a6') : '#b4b6b9'}
          roughness={0.8}
          metalness={0}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      {ring && (
        <mesh position={[0, 0, -EPS / 2]} renderOrder={1}>
          {round ? <ringGeometry args={[w / 2 - 0.05, w / 2 + (selected ? 0.55 : 0.35), 48]} /> : <planeGeometry args={[w + (selected ? 1.1 : 0.7), h + (selected ? 1.1 : 0.7)]} />}
          <meshBasicMaterial color={selected ? ACCENT : '#ffffff'} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      )}
    </group>
  );
}

/** 上身嘅章（喺人物 group 入面，單位 cm）；facing = 'back' 嘅（領巾尖）向後 */
export function TorsoBadges({ items, textures, ...rest }) {
  return items.map((p) => (
    <group
      key={p.key}
      position={[p.x, p.y, p.facing === 'back' ? p.z - EPS * 2 : p.z + EPS]}
      rotation={p.facing === 'back' ? [0, Math.PI, 0] : undefined}
    >
      <Patch p={p} tex={textures[p.art]} {...rest} />
    </group>
  ));
}

/**
 * 袖嘅章（喺手臂 group 入面；原點 = 膊頭支點，肩膊縫線喺 y = seamY）。
 * 左袖外側 = +x 面：望住佢時右手邊 = -z。右袖外側 = -x 面：右手邊 = +z。
 */
export function SleeveBadges({ items, textures, side, sleeveW, seamY, ...rest }) {
  const s = side === 'l' ? 1 : -1;
  return items.map((p) => (
    <group key={p.key} position={[s * (sleeveW / 2 + EPS), seamY - p.v, -s * p.u]} rotation={[0, (s * Math.PI) / 2, 0]}>
      <Patch p={p} tex={textures[p.art]} {...rest} />
    </group>
  ));
}
