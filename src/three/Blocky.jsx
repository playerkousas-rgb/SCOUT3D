// 方塊人小童軍（真實比例）— v1.0 · © SCOUT SYSTEM
// 全部由程式畫，唔使下載模型。單位：厘米，整個人縮放 0.01 變米。
// 人物面向 +z；穿著者左 = +x。
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { layout, PX } from './body.js';
import {
  headFaces, pigtailFaces, neckFaces, torsoFaces, sleeveFaces, skinFaces, handFaces, legFaces, shoeFaces,
  rollFaces, tailCanvas, backTriangleCanvas, plain, material, wogglePaint,
} from './pixels.js';

export const BASE_H = 0.045; // 底座高度（米）
const PIGTAIL_TIE = '#5b3fa0';

function Box({ size, faces, painted, position, rotation }) {
  const mats = useMemo(() => faces.map((c) => material(c, { painted })), [faces, painted]);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return (
    <mesh position={position} rotation={rotation} material={mats} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Plane({ size, canvas, painted, position, rotation }) {
  const mat = useMemo(() => material(canvas, { painted, alpha: true, double: true }), [canvas, painted]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={position} rotation={rotation} material={mat} castShadow receiveShadow>
      <planeGeometry args={size} />
    </mesh>
  );
}

function Plinth() {
  const geo = useMemo(() => {
    const r = 0.27;
    const pts = [[0, 0], [r + 0.012, 0], [r + 0.012, 0.006], [r, BASE_H - 0.008], [r - 0.008, BASE_H], [0, BASE_H]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 96);
  }, []);
  return (
    <mesh geometry={geo} receiveShadow castShadow>
      <meshStandardMaterial color="#2a3038" roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

/** 一隻手：膊頭做支點（之後做姿勢用） */
function Arm({ L, side, painted, faces }) {
  const { B } = L;
  const s = side === 'l' ? 1 : -1;
  const sl = [B.upperArm.w + B.sleeve.pad * 2, B.sleeve.len, B.upperArm.d + B.sleeve.pad * 2];
  return (
    <group position={[s * L.armX, L.shoulderY, 0]} rotation={[0, 0, s * 0.045]}>
      <Box size={[B.upperArm.w, B.upperArm.h, B.upperArm.d]} faces={faces.upper} painted={painted} position={[0, -B.upperArm.h / 2, 0]} />
      <Box size={sl} faces={faces.sleeve} painted={painted} position={[0, L.top - L.shoulderY - B.sleeve.len / 2, 0]} />
      <group position={[0, -B.upperArm.h, 0]}>
        <Box size={[B.lowerArm.w, B.lowerArm.h, B.lowerArm.d]} faces={faces.lower} painted={painted} position={[0, -B.lowerArm.h / 2, 0]} />
        <Box size={[B.hand.w, B.hand.h, B.hand.d]} faces={faces.hand} painted={painted} position={[0, -B.lowerArm.h - B.hand.h / 2, 0]} />
      </group>
    </group>
  );
}

export default function Blocky({ outfit }) {
  const gender = outfit.gender === 'girl' ? 'girl' : 'boy';
  const painted = outfit.finish !== 'unpainted';
  const L = useMemo(() => layout(gender), [gender]);
  const { B } = L;

  // 身體貼圖（只跟性別變）
  const body = useMemo(() => {
    const sl = [B.upperArm.w + B.sleeve.pad * 2, B.sleeve.len, B.upperArm.d + B.sleeve.pad * 2];
    return {
      head: headFaces(B),
      pigtail: pigtailFaces([4.5, 12, 4.5], PIGTAIL_TIE),
      neck: neckFaces(B),
      torso: torsoFaces(B),
      arm: {
        upper: skinFaces([B.upperArm.w, B.upperArm.h, B.upperArm.d]),
        sleeve: sleeveFaces(sl, B.sleeve.band),
        lower: skinFaces([B.lowerArm.w, B.lowerArm.h, B.lowerArm.d]),
        hand: handFaces([B.hand.w, B.hand.h, B.hand.d]),
      },
      leg: legFaces([B.leg.w, B.leg.top - B.leg.y, B.leg.d]),
      shoe: shoeFaces([B.shoe.w, B.shoe.h, B.shoe.d]),
    };
  }, [B]);

  // 旅巾（跟顏色變）
  const N = useMemo(() => {
    const nw = B.neck.w, collarT = 1.75, rollT = 2.2, rollH = 2.4;
    const inner = nw + collarT * 2; // 衣領外圍 = 旅巾內圍
    const outer = inner + rollT * 2;
    const front = B.torso.d / 2; // 胸口表面 z
    const wogY = L.top - 7.5;
    // 上段：由頸側斜落巾圈
    const a = [outer / 2 - rollT / 2, L.top + 0.4], b = [1.3, wogY];
    const len = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const ang = Math.atan2(a[0] - b[0], a[1] - b[1]);
    const lowLen = 19, TW = 5.2;
    return {
      nw, collarT, rollT, rollH, inner, outer, front, wogY, len, ang, lowLen, a, b, TW,
      collar: { side: plain(1, 1, '#f6f6f2') },
      roll: {
        back: rollFaces([outer, rollH, rollT], outfit.neckerMain, outfit.neckerBorder),
        side: rollFaces([rollT, rollH, inner + rollT + 1.2], outfit.neckerMain, outfit.neckerBorder),
      },
      upper: tailCanvas(TW, len + 1, outfit.neckerMain, outfit.neckerBorder, 0),
      lower: tailCanvas(TW, lowLen, outfit.neckerMain, outfit.neckerBorder, 4),
      back: backTriangleCanvas(17, 13, outfit.neckerMain, outfit.neckerBorder),
    };
  }, [B, L, outfit.neckerMain, outfit.neckerBorder]);

  const white = useMemo(() => [1, 1, 1, 1, 1, 1].map(() => plain(2, 2, '#f6f6f2')), []);
  const wogFaces = useMemo(() => wogglePaint([8, 2.6, 1.2], outfit.woggle), [outfit.woggle]);

  const t = B.torso, h = B.head;
  const collarH = 3.6;
  return (
    <group>
      <Plinth />
      <group position={[0, BASE_H, 0]} scale={0.01}>
        {/* 頭、頸 */}
        <Box size={[h.w, h.h, h.d]} faces={body.head} painted={painted} position={[0, h.y + h.h / 2, h.z]} />
        {B.hair === 'pigtails' &&
          [1, -1].map((s) => (
            <Box key={s} size={[4.5, 12, 4.5]} faces={body.pigtail} painted={painted} position={[s * (h.w / 2 + 1.6), h.y + 5, -4.5]} rotation={[0.15, 0, s * 0.12]} />
          ))}
        <Box size={[B.neck.w, B.neck.h, B.neck.d]} faces={body.neck} painted={painted} position={[0, B.neck.y + B.neck.h / 2, 0]} />
        {/* 上身 */}
        <Box size={[t.w, t.h, t.d]} faces={body.torso} painted={painted} position={[0, t.y + t.h / 2, 0]} />
        {/* 白色衣領（企領，前面開口） */}
        <Box size={[N.inner, collarH, N.collarT]} faces={white} painted={painted} position={[0, L.top + collarH / 2, -(N.nw / 2 + N.collarT / 2)]} />
        {[1, -1].map((s) => (
          <Box key={s} size={[N.collarT, collarH, N.nw]} faces={white} painted={painted} position={[s * (N.nw / 2 + N.collarT / 2), L.top + collarH / 2, 0]} />
        ))}
        <Arm L={L} side="l" painted={painted} faces={body.arm} />
        <Arm L={L} side="r" painted={painted} faces={body.arm} />
        {/* 褲、鞋 */}
        {[1, -1].map((s) => (
          <group key={s}>
            <Box size={[B.leg.w, B.leg.top - B.leg.y, B.leg.d]} faces={body.leg} painted={painted} position={[s * L.legX, (B.leg.y + B.leg.top) / 2, 0]} />
            <Box size={[B.shoe.w, B.shoe.h, B.shoe.d]} faces={body.shoe} painted={painted} position={[s * L.legX, B.shoe.h / 2, B.shoe.z]} />
          </group>
        ))}
        {/* 旅巾 + 巾圈（宣誓後先戴） */}
        {outfit.invested && (
          <group>
            <Box size={[N.outer, N.rollH, N.rollT]} faces={N.roll.back} painted={painted} position={[0, L.top + N.rollH / 2, -(N.inner / 2 + N.rollT / 2)]} />
            {[1, -1].map((s) => (
              <Box key={s} size={[N.rollT, N.rollH, N.inner + N.rollT + 1.2]} faces={N.roll.side} painted={painted} position={[s * (N.inner / 2 + N.rollT / 2), L.top + N.rollH / 2, 0.6]} />
            ))}
            {[1, -1].map((s) => (
              <group key={s}>
                <Plane size={[N.TW, N.len + 1]} canvas={N.upper} painted={painted} position={[s * (N.a[0] + N.b[0]) / 2, (N.a[1] + N.b[1]) / 2, N.front + 0.35 + (s > 0 ? 0.08 : 0)]} rotation={[0, 0, -s * N.ang]} />
                <Plane size={[N.TW, N.lowLen]} canvas={N.lower} painted={painted} position={[s * 1.7, N.wogY + 1 - N.lowLen / 2, N.front + 0.3 + (s > 0 ? 0.1 : 0)]} rotation={[0, 0, -s * 0.04]} />
              </group>
            ))}
            <Box size={[8, 2.6, 1.2]} faces={wogFaces} painted={painted} position={[0, N.wogY, N.front + 1.1]} />
            <Plane size={[17, 13]} canvas={N.back} painted={painted} position={[0, L.top - 6.5, -(t.d / 2 + 0.2)]} rotation={[0, Math.PI, 0]} />
          </group>
        )}
      </group>
    </group>
  );
}

export { PX };
