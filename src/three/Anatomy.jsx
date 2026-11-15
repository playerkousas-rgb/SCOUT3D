// SCOUT3D v1.0 · © SCOUT SYSTEM
// v27「流線」細節：立體頭髮、手指、耳仔、鼻（ADR-0025）
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COLOURS as C } from './body.js';
import { smoothBox, partShape } from './look.js';
import { hairGeometry, pigtailGeometry, capsule, handLayout } from './anatomy.js';

function useSkin(painted) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: painted ? C.skin : '#b4b6b9', roughness: 0.62 }), [painted]);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

/** 手：手掌＋四隻手指（兩節）＋拇指；原點 = 手腕中心（前臂底） */
export function SmoothHand({ size, side, painted, position, overlap = 1 }) {
  const s = side === 'l' ? 1 : -1;
  const skin = useSkin(painted);
  const L = useMemo(() => handLayout({ w: size[0], h: size[1], d: size[2] }, s), [size[0], size[1], size[2], s]); // eslint-disable-line react-hooks/exhaustive-deps
  const [pw, ph, pd] = L.palm;
  const palmGeo = useMemo(() => smoothBox(pw, ph + overlap, pd, { ...partShape('hand', pw, ph + overlap, pd), taper: 0.92 }), [pw, ph, pd, overlap]);
  return (
    <group position={position}>
      <mesh geometry={palmGeo} material={skin} position={[0, -(ph - overlap) / 2, 0]} castShadow receiveShadow />
      {L.fingers.map((f, i) => (
        <group key={i} position={[f.x, f.y, f.z]} rotation={[f.spread, 0, f.segs[0].rot]}>
          <mesh geometry={capsule(f.r, f.segs[0].len)} material={skin} castShadow />
          <group position={[0, -f.segs[0].len + f.r, 0]} rotation={[0, 0, f.segs[1].rot]}>
            <mesh geometry={capsule(f.r * 0.92, f.segs[1].len)} material={skin} castShadow />
          </group>
        </group>
      ))}
      <group position={[L.thumb.x, L.thumb.y, L.thumb.z]} rotation={[L.thumb.rotX, 0, L.thumb.rotZ]}>
        <mesh geometry={capsule(L.thumb.r, L.thumb.len)} material={skin} castShadow />
      </group>
    </group>
  );
}

/** 立體頭髮、耳仔、鼻；head = B.head（中心 = [0, y + h/2, z]） */
export function SmoothHead({ head, style, hat, painted, tie = '#5b3fa0' }) {
  const centre = [0, head.y + head.h / 2, head.z];
  const geo = useMemo(() => hairGeometry({ w: head.w, h: head.h, d: head.d }, style, hat), [head.w, head.h, head.d, style, hat]);
  const hairMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: painted ? C.hair : '#8d9095', roughness: 0.48, metalness: 0.05, side: THREE.DoubleSide }),
    [painted],
  );
  useEffect(() => () => hairMat.dispose(), [hairMat]);
  const skin = useSkin(painted);
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  useEffect(() => () => sphere.dispose(), [sphere]);
  const long = style === 'pigtails';
  // 耳仔：側面中間、由頂量落 9–13 cm（同畫上去嘅耳仔一樣位）；女仔長髮遮住，唔畫
  const earY = head.h / 2 - 11;
  return (
    <group position={centre}>
      <mesh geometry={geo} material={hairMat} castShadow receiveShadow />
      {!long &&
        [1, -1].map((s) => (
          <mesh key={s} geometry={sphere} material={skin} position={[s * (head.w / 2 - 0.1), earY, head.d * 0.03]} scale={[0.75, 2.1, 1.35]} castShadow />
        ))}
      {long &&
        [1, -1].map((s) => (
          // 孖辮：同方塊版同一位置（頂 = 頭頂落 h − 11 cm、側面外 1.6 cm、後 4.5 cm）
          <group key={`pig${s}`} position={[s * (head.w / 2 + 1.6), 11 - head.h / 2 + 0.3, -4.5 - head.z]} rotation={[0.15, 0, s * 0.12]}>
            <mesh geometry={pigtailGeometry(12, 2.3)} material={hairMat} castShadow />
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} castShadow>
              <torusGeometry args={[1.5, 0.42, 8, 20]} />
              <meshStandardMaterial color={painted ? tie : '#9a9da2'} roughness={0.5} />
            </mesh>
          </group>
        ))}
      {/* 鼻：畫上去個鼻嘅位置（由頂 12.5 cm） */}
      <mesh geometry={sphere} material={skin} position={[0, head.h / 2 - 12.6, head.d / 2 - 0.15]} scale={[0.75, 1.05, 0.7]} castShadow />
    </group>
  );
}
