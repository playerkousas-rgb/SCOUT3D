// 徽章貼片（圖案取自官方文件）— v1.0 · © SCOUT SYSTEM
// 每個章係一塊薄片，貼喺上身或者袖外側；撳落去會揀中嗰個章。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { meritCanvas } from '../lib/meritCanvas.js';
import { nameTagCanvas } from '../lib/nameTagCanvas.js';
import { troopTapeCanvas } from '../lib/troopTapeCanvas.js';
import { sleevePose } from './badgeLayout.js';
import { useDetailed, useSmooth, isMetalBadge, badgeEdge, stitchNormal, bendGeometry, BEND_MIN, BADGE_THICK, BADGE_LIFT } from './look.js';

const EPS = 0.06; // 離布面 0.06 cm，避免閃
const ACCENT = '#f2791c';
const STITCH_SCALE = new THREE.Vector2(0.45, 0.45);

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
          if (a.kind === 'nameTag') {
            const t = prep(new THREE.CanvasTexture(nameTagCanvas(a)));
            made.push(t);
            return [k, t];
          }
          if (a.kind === 'troopTape') {
            const t = prep(new THREE.CanvasTexture(troopTapeCanvas(a)));
            made.push(t);
            return [k, t];
          }
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

function Patch({ p, tex, painted, selected, onSelect, registry, bend = null }) {
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
  // 掛頸勳章（v17）：相片頂 U 形綬帶唔畫（crop = 由底計起畫幾多），綬帶改由衣領拉落嚟（strapCm）：用相片 crop 嗰一行拉長
  const crop = p.crop && p.crop < 1 ? p.crop : null;
  const [photo, strap] = useMemo(() => {
    if (!crop || !tex) return [tex, null];
    const a = tex.clone();
    a.repeat.set(1, crop);
    a.offset.set(0, 0);
    a.needsUpdate = true;
    const b = tex.clone();
    b.repeat.set(1, 0.002);
    b.offset.set(0, crop - 0.004);
    b.needsUpdate = true;
    return [a, b];
  }, [tex, crop]);
  useEffect(() => () => {
    if (photo && photo !== tex) photo.dispose();
    strap?.dispose();
  }, [photo, strap, tex]);
  const map = painted && photo ? photo : null;
  // v25 精緻：布章 = 刺繡針步＋厚度（章面企出 BADGE_LIFT，只改 z）；金屬章 = 金屬反光
  const detailed = useDetailed();
  const metal = detailed && isMetalBadge(p);
  const edge = useMemo(() => (detailed && !metal && !crop && tex ? badgeEdge(tex.image, round) : null), [detailed, metal, crop, tex, round]);
  // v26 流線：章屈返貼住圓滑表面（bend = { matrix: 局部 → 部件座標, surf }）；屈咗就唔畫厚度
  const bentInfo = useMemo(() => {
    if (!bend) return null;
    const g = round ? new THREE.RingGeometry(0.0001, w / 2, 48, 8) : new THREE.PlaneGeometry(w, h, Math.max(4, Math.ceil(w / 0.6)), Math.max(4, Math.ceil(h / 0.6)));
    bendGeometry(g, bend.matrix, bend.surf);
    if (g.userData.moved < BEND_MIN) {
      // 冇屈到（平面位）：唔使換 geometry，只係成塊跟表面平移（例如腰身收窄），保留厚度
      const shift = g.userData.shift;
      g.dispose();
      return { geo: null, shift: shift.some((c) => Math.abs(c) > 1e-4) ? shift : null };
    }
    return { geo: g, shift: null };
  }, [bend, round, w, h]);
  const bent = bentInfo?.geo ?? null;
  const shift = bentInfo?.shift ?? undefined;
  useEffect(() => () => bent?.dispose(), [bent]);
  useEffect(() => {
    if (registry && ref.current) registry.set(p.key, ref.current); // 屈／唔屈會換 mesh
  }, [registry, p.key, bent]);
  const thick = !bent && !!edge && (round || edge.opaque);
  const lift = thick ? BADGE_LIFT : 0;
  const stitch = detailed && !metal && map ? stitchNormal(w, h) : null;
  return (
    <group position={shift}>
      {crop && p.strapCm > 0 && (
        <mesh position={[0, h / 2 + p.strapCm / 2, 0]} renderOrder={2} onClick={(e) => { e.stopPropagation(); onSelect?.(p.id); }}>
          <planeGeometry args={[w, p.strapCm]} />
          <meshStandardMaterial
            key={strap ? strap.uuid : 'none'}
            map={painted && strap ? strap : null}
            alphaTest={painted && strap ? 0.5 : 0}
            transparent={!(painted && strap)}
            opacity={painted && strap ? 1 : 0}
            color={painted ? '#f2f2f2' : '#b4b6b9'}
            roughness={0.8}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      )}
      <mesh
        key={bent ? 'bent' : 'flat'}
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
        position={lift ? [0, 0, lift] : undefined}
        receiveShadow
        castShadow={thick}
        geometry={bent ?? undefined}
      >
        {bent ? null : round ? <circleGeometry args={[w / 2, 48]} /> : <planeGeometry args={[w, h]} />}
        <meshStandardMaterial
          key={`${photo ? photo.uuid : 'none'}-${detailed ? (metal ? 'm' : 'd') : 's'}`}
          map={map}
          alphaTest={map ? 0.5 : 0} // 勳章、感謝章等透明底 PNG：透明位唔畫
          color={painted ? (photo ? (detailed ? '#ffffff' : '#f2f2f2') : '#9aa0a6') : '#b4b6b9'}
          roughness={metal ? 0.32 : detailed ? 0.72 : 0.8}
          metalness={metal ? 0.65 : 0}
          normalMap={stitch}
          normalScale={stitch ? STITCH_SCALE : undefined}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      {thick && (
        // 布章厚度：側面用章邊顏色（鎖邊）；背面貼住布（離布面 0.01 cm）
        <mesh position={[0, 0, (lift - 0.005 - (BADGE_THICK - lift)) / 2]} rotation={round ? [Math.PI / 2, 0, 0] : undefined} castShadow>
          {round ? <cylinderGeometry args={[w / 2, w / 2, BADGE_THICK - 0.005, 48, 1, true]} /> : <boxGeometry args={[w, h, BADGE_THICK - 0.005]} />}
          <meshStandardMaterial color={painted ? edge.edge : '#a9abae'} roughness={0.85} />
        </mesh>
      )}
      {ring && (
        <mesh position={[0, 0, -EPS / 2]} renderOrder={1}>
          {round ? <ringGeometry args={[w / 2 - 0.05, w / 2 + (selected ? 0.55 : 0.35), 48]} /> : <planeGeometry args={[w + (selected ? 1.1 : 0.7), h + (selected ? 1.1 : 0.7)]} />}
          <meshBasicMaterial color={selected ? ACCENT : '#ffffff'} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      )}
    </group>
  );
}

/** 上身嘅章（喺人物 group 入面，單位 cm）；facing = 'back' 嘅（領巾尖）向後；facing = 'up'（肩章）平放喺肩帶上，rot 由 badgeLayout 計 */
export function TorsoBadges({ items, textures, surf = null, ...rest }) {
  return items.filter((p) => p.kind !== 'lanyard').map((p) => <TorsoBadge key={p.key} p={p} tex={textures[p.art]} surf={surf} {...rest} />);
}

function TorsoBadge({ p, tex, surf, ...rest }) {
  const smooth = useSmooth();
  const position = p.facing === 'up' ? [p.x, p.y + EPS, p.z] : [p.x, p.y, p.facing === 'back' ? p.z - EPS * 2 : p.z + EPS];
  const rotation = p.rot ?? (p.facing === 'back' ? [0, Math.PI, 0] : undefined);
  // 肩章（平放喺肩帶）、領巾尖背面嘅章唔屈
  const bend = useMemo(() => {
    if (!smooth || !surf || p.facing) return null;
    const e = rotation ? new THREE.Euler(rotation[0], rotation[1], rotation[2], rotation[3] ?? 'XYZ') : new THREE.Euler();
    return { matrix: new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1)), surf };
  }, [smooth, surf, p.facing, ...position, ...(rotation ?? [])]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={position} rotation={rotation}>
      <Patch p={p} tex={tex} bend={bend} {...rest} />
    </group>
  );
}

/**
 * 袖嘅章（喺手臂 group 入面；原點 = 膊頭支點，肩膊縫線喺 y = seamY）。
 * 左袖外側 = +x 面：望住佢時右手邊 = -z。右袖外側 = -x 面：右手邊 = +z。
 */
export function SleeveBadges({ items, textures, side, sleeveW, sleeveD, seamY, surf = null, ...rest }) {
  return items.map((p) => {
    if (p.kind === 'band') return <SleeveBand key={p.key} p={p} sleeveW={sleeveW} sleeveD={sleeveD} seamY={seamY} {...rest} />;
    return <SleeveBadge key={p.key} p={p} tex={textures[p.art]} side={side} sleeveW={sleeveW} seamY={seamY} surf={surf} {...rest} />;
  });
}

function SleeveBadge({ p, tex, side, sleeveW, seamY, surf, ...rest }) {
  const smooth = useSmooth();
  const pose = sleevePose(side, sleeveW, seamY, p, EPS);
  const bend = useMemo(() => {
    if (!smooth || !surf) return null;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pose.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pose.rotY, 0)), new THREE.Vector3(1, 1, 1));
    return { matrix: m, surf };
  }, [smooth, surf, ...pose.position, pose.rotY]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={pose.position} rotation={[0, pose.rotY, 0]}>
      <Patch p={p} tex={tex} bend={bend} {...rest} />
    </group>
  );
}

/** 喪禮黑布（手冊 P.162）：一圈套住衫袖（闊 = p.h），可以撳嚟揀 */
function SleeveBand({ p, sleeveW, sleeveD, seamY, painted, selected, onSelect, registry }) {
  const ref = useRef();
  useEffect(() => {
    if (!registry || !ref.current) return undefined;
    registry.set(p.key, ref.current);
    return () => registry.delete(p.key);
  }, [registry, p.key]);
  return (
    <mesh
      ref={ref}
      position={[0, seamY - p.v, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(p.id);
      }}
      castShadow
    >
      <boxGeometry args={[sleeveW + 0.3, p.h, sleeveD + 0.3]} />
      <meshStandardMaterial color={selected ? '#3a2a1c' : painted ? '#141416' : '#8d9094'} roughness={0.9} />
    </mesh>
  );
}
