// 方塊人（真實比例；小童軍 / 幼童軍 / 童軍）— v1.0 · © SCOUT SYSTEM
// 全部由程式畫，唔使下載模型。單位：厘米，整個人縮放 0.01 變米。
// 人物面向 +z；穿著者左 = +x。
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { layout, neckerLayout, strapLayout, dressLayout, lanyardPoints, lanyardBackPoints, tasselPoints, LANYARD_COLOURS, ALT_CM, strandOffsets, VEST_T, SWEATER_TOP, PX, sashLayout, sashMesh, SASH, scoutVariant, SCOUT_VARIANTS, ventureVariant, roverVariant, leaderVariant, isSenior, ventureLegwear, leaderLegwear, pumpParts } from './body.js';
import { useTexture } from '@react-three/drei';
import { SECTIONS, DISTRICTS, PATROLS } from '../data/rules.js';
import { resolveArt, rankCap, leaderNeckwear, messCapOf } from '../lib/picks.js';
import { neckerPalettes } from '../lib/necker.js';
import { placeAll, placeFor, visible, dynKey, ribbonUrls, sashActive } from './badgeLayout.js';
import { useBadgeTextures, useDynamicTextures, TorsoBadges, SleeveBadges } from './Badges.jsx';
import {
  headFaces, pigtailFaces, neckFaces, torsoFaces, sleeveFaces, cuffFaces, skinFaces, handFaces, legFaces, shortsFaces, shinFaces,
  shoeFaces, skirtFaces, vestFaces, hatFaces, brimFaces, shirtPalette, neckerRollFaces, neckerTailCanvas, neckerBackCanvas, plain, material, wogglePaint,
  cubTorsoFaces, cubShinFaces, cubCapFaces, scoutWogglePaint, seaCapFaces, shade, brighten, sweaterFaces, sweaterSleeveFaces, sweaterCuffFaces, tieCanvas,
  gilwellWogglePaint, hardHatFaces, dressJacketFaces, messJacketFaces, messTrouserFaces,
} from './pixels.js';
import { COLOURS as C } from './body.js';
import { SmoothHand, SmoothHead } from './Anatomy.jsx';
import { useDetailed, useSmooth, roundedBox, plainBox, smoothBox, partShape, surfaceOf, snapToSurface, MAX_RADIUS, SLEEVE_RADIUS } from './look.js';

const CAP_BADGE = '/badges/cub_cap_badge.png';
const SCOUT_CAP_BADGE = '/badges/scout_cap_badge.png';
const SEA_TALLY = '/badges/sea_scout_cap_tally.png';
const VENTURE_SEA_CAP_BADGE = '/badges/venture_sea_cap_badge.png';
const SEA_LEADER_CAP_BADGE = '/badges/leader/sea_leader_cap_badge.png'; // 海童軍領袖帽章（手冊 P.105）
const HK_BADGE = '/badges/hong_kong_badge.png'; // 會巾領巾尖嘅香港章（手冊 P.108）
const GILWELL_TARTAN = '/badges/leader/gilwell_tartan.png'; // 基維爾領巾尖格仔布（手冊 P.109）
const MESS_CAP_BADGE = '/badges/leader/mess_cap_badge.png'; // 晚禮服黑色硬帽銀色帽章（手冊 P.208）
const LAPEL_FLEUR = '/badges/leader/lapel_fleur.png'; // 晚禮服翻領銀色童軍徽（手冊 P.208–211 金屬肩章入面嘅銀色童軍徽）
const LONG_SKIRT_BOTTOM = 13; // 晚禮服黑色長裙腳離地（手冊 P.62 附圖：去到腳眼上面）

export const BASE_H = 0.045; // 底座高度（米）
const PIGTAIL_TIE = '#5b3fa0';

/**
 * 一個方塊。v25 精緻模式：圓角（平面部分 UV 同普通方塊一樣，貼喺面上嘅章位置唔變）＋布紋材質；
 * taper = 底面闊度比例（只用喺冇章嘅褲腳、裙腳）；radius = 最大圓角（衫袖用 SLEEVE_RADIUS）。
 */
function Box({ size, faces, painted, position, rotation, alpha = false, taper = 1, radius = MAX_RADIUS, part = null }) {
  const detailed = useDetailed();
  const smooth = useSmooth();
  const mats = useMemo(() => faces.map((c) => material(c, { painted, alpha, detailed })), [faces, painted, alpha, detailed]);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  const geo = useMemo(() => {
    const [w, h, d] = size;
    if (smooth) return smoothBox(w, h, d, { ...partShape(part ?? (radius < MAX_RADIUS ? 'sleeve' : null), w, h, d), taper });
    return detailed ? roundedBox(w, h, d, taper, radius) : plainBox(w, h, d);
  }, [smooth, detailed, size[0], size[1], size[2], taper, radius, part]);
  return <mesh position={position} rotation={rotation} material={mats} geometry={geo} castShadow receiveShadow />;
}

function Plane({ size, canvas, painted, position, rotation }) {
  const detailed = useDetailed();
  const mat = useMemo(() => material(canvas, { painted, alpha: true, double: true, detailed }), [canvas, painted, detailed]);
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

/** 一隻手：膊頭做支點。長袖 = 上袖一直落到手踭，再加前臂袖 */
function Arm({ L, side, painted, faces, long, children }) {
  const { B } = L;
  const s = side === 'l' ? 1 : -1;
  const seam = L.top - L.shoulderY; // 肩膊縫線（相對支點）
  const len = long ? seam + B.upperArm.h : B.sleeve.len;
  const sl = [B.sleeve.w, len, B.sleeve.d];
  const cuff = [B.lowerArm.w + 1, B.lowerArm.h, B.lowerArm.d + 1.4];
  // v26 流線：前臂、手向上伸入上一截（ov cm），關節冇坑；手臂向下收窄
  const smooth = useSmooth();
  const ov = smooth ? 2 : 0;
  const ovH = smooth ? 1 : 0;
  return (
    <group position={[s * L.armX, L.shoulderY, 0]} rotation={[0, 0, s * 0.045]}>
      <Box part="limb" size={[B.upperArm.w, B.upperArm.h, B.upperArm.d]} faces={faces.upper} painted={painted} position={[0, -B.upperArm.h / 2, 0]} taper={smooth ? 0.9 : 1} />
      <Box part="sleeve" size={sl} faces={long ? faces.sleeveLong : faces.sleeve} painted={painted} position={[0, seam - len / 2, 0]} radius={SLEEVE_RADIUS} />
      <group position={[0, -B.upperArm.h, 0]}>
        {long ? (
          <Box part="limb" size={[cuff[0], cuff[1] + ov, cuff[2]]} faces={faces.cuff} painted={painted} position={[0, -(B.lowerArm.h - ov) / 2, 0]} taper={smooth ? 0.9 : 1} />
        ) : (
          <Box part="limb" size={[B.lowerArm.w, B.lowerArm.h + ov, B.lowerArm.d]} faces={faces.lower} painted={painted} position={[0, -(B.lowerArm.h - ov) / 2, 0]} taper={smooth ? 0.82 : 1} />
        )}
        {smooth ? (
          // v27 流線：有手指嘅手
          <SmoothHand size={[B.hand.w, B.hand.h, B.hand.d]} side={side} painted={painted} position={[0, -B.lowerArm.h, 0]} overlap={ovH} />
        ) : (
          <Box part="hand" size={[B.hand.w, B.hand.h + ovH, B.hand.d]} faces={faces.hand} painted={painted} position={[0, -B.lowerArm.h - (B.hand.h - ovH) / 2, 0]} />
        )}
      </group>
      {children}
    </group>
  );
}

/** 帽：漁夫帽（闊邊）／鴨咀帽（前面帽舌） */
function Hat({ B, kind, colour, painted }) {
  const h = B.head;
  const headTop = h.y + h.h;
  const base = headTop - 4; // 帽口喺額頭上面
  const faces = useMemo(() => {
    const crown = kind === 'bucket' ? [h.w + 1.6, 6.5, h.d + 1.6] : [h.w + 1.2, 6, h.d + 1.2];
    const brim = kind === 'bucket' ? [h.w + 9, 0.8, h.d + 9] : [h.w - 2, 0.8, 9];
    return { crown, brim, crownF: hatFaces(crown, colour, { band: kind === 'bucket' ? 1.2 : 0 }), brimF: brimFaces(brim, colour), knob: hatFaces([2, 1, 2], colour) };
  }, [kind, colour, h]);
  const { crown, brim } = faces;
  return (
    <group>
      <Box part="hat" size={crown} faces={faces.crownF} painted={painted} position={[0, base + crown[1] / 2, h.z]} />
      {kind === 'bucket' ? (
        <Box size={brim} faces={faces.brimF} painted={painted} position={[0, base + 0.2, h.z]} rotation={[0, 0, 0]} />
      ) : (
        <>
          <Box size={brim} faces={faces.brimF} painted={painted} position={[0, base + 0.4, h.z + crown[2] / 2 + brim[2] / 2 - 1]} rotation={[0.08, 0, 0]} />
          <Box size={[2, 1, 2]} faces={faces.knob} painted={painted} position={[0, base + crown[1] + 0.5, h.z]} />
        </>
      )}
    </group>
  );
}

/** 幼童軍帽（手冊 P.98）：男 = 深綠色黃間條鴨舌帽；女 = 深綠色圓形有邊帽（後面蝴蝶結）。帽章縫喺帽冠前面 */
function CubHat({ B, girl, painted }) {
  const h = B.head;
  const headTop = h.y + h.h;
  const base = headTop - 4.5;
  const badgeTex = useTexture(CAP_BADGE);
  const F = useMemo(() => {
    const crown = girl ? [h.w + 1.6, 7, h.d + 1.6] : [h.w + 1.2, 6.5, h.d + 1.2];
    const brim = girl ? [h.w + 7, 0.8, h.d + 7] : [h.w - 2, 0.8, 8];
    return {
      crown, brim,
      crownF: cubCapFaces(crown, girl ? 'round' : 'cap'),
      brimF: brimFaces(brim, C.capGreen),
      bowF: hatFaces([2.4, 2.4, 1], C.capGreen),
    };
  }, [girl, h]);
  const { crown, brim } = F;
  const front = h.z + crown[2] / 2 + 0.06;
  return (
    <group>
      <Box part="hat" size={crown} faces={F.crownF} painted={painted} position={[0, base + crown[1] / 2, h.z]} />
      {girl ? (
        <>
          <Box size={brim} faces={F.brimF} painted={painted} position={[0, base + 0.3, h.z]} />
          {[1, -1].map((s) => (
            <Box key={s} size={[2.4, 2.4, 1]} faces={F.bowF} painted={painted} position={[s * 1.5, base + 2.4, h.z - crown[2] / 2 - 0.5]} rotation={[0, 0, s * 0.5]} />
          ))}
        </>
      ) : (
        <Box size={brim} faces={F.brimF} painted={painted} position={[0, base + 0.4, h.z + crown[2] / 2 + brim[2] / 2 - 1]} rotation={[0.08, 0, 0]} />
      )}
      <mesh position={[0, base + crown[1] * 0.55, front]}>
        <planeGeometry args={[3.2, 2.4]} />
        <meshStandardMaterial map={painted ? badgeTex : null} color={painted ? '#f2f2f2' : '#b4b6b9'} roughness={0.8} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}

/**
 * 童軍深綠色軟帽（手冊 P.30、P.98–99、P.102）：黑色膠邊離眉毛約 2 cm；向穿著者右邊（-x）拉低；
 * 金屬帽章戴喺帽身、膠邊上面、左眼（+x）上方（用戶 v17：唔好低到似戴喺頭髮上）。方塊造型只係示意。
 */
function ScoutBeret({ B, painted, colour = C.beret, cap = null }) {
  const h = B.head;
  const headTop = h.y + h.h;
  const browY = headTop - 7.5; // pixels.js headFaces：眉毛離頭頂 7.5 cm
  const bandY = browY + 2 + 1; // 膠邊底離眉 2 cm，膠邊高 2 cm
  const badgeTex = useTexture(cap?.file ?? SCOUT_CAP_BADGE);
  const F = useMemo(() => {
    const band = [h.w + 0.8, 2, h.d + 0.8];
    const crown = [h.w + 3.5, 3.6, h.d + 3];
    return {
      band, crown,
      bandF: hatFaces(band, C.beretBand),
      crownF: hatFaces(crown, colour),
      knob: hatFaces([1.2, 0.8, 1.2], colour),
    };
  }, [h, colour]);
  const { band, crown } = F;
  const eyeX = h.w / 2 - 5.25; // 穿著者左眼（+x）
  // 帽章戴喺帽身（綠色）上、左眼上方，底邊貼住膠邊頂（v17 用戶：以前太低，好似戴喺頭髮上）。
  // 放喺帽身 group 入面，跟帽身一齊側；group 原點 x = -2，所以本地 x = eyeX + 2。
  const CROWN = [-2, bandY + 1 + crown[1] / 2 - 0.2, h.z - 0.5];
  const local = { x: eyeX - CROWN[0], bottom: -crown[1] / 2 + 0.15, z: crown[2] / 2 + 0.08 };
  return (
    <group>
      <Box size={band} faces={F.bandF} painted={painted} position={[0, bandY, h.z]} />
      <group position={CROWN} rotation={[-0.06, 0, 0.16]}>
        <Box part="hat" size={crown} faces={F.crownF} painted={painted} position={[0, 0, 0]} />
        <Box size={[1.2, 0.8, 1.2]} faces={F.knob} painted={painted} position={[1.5, crown[1] / 2 + 0.4, 0]} />
        {cap ? (
          <RankCapBadge tex={badgeTex} painted={painted} position={[local.x, local.bottom, local.z]} />
        ) : (
          <mesh position={[local.x, local.bottom + 1.4, local.z]}>
            <circleGeometry args={[1.4, 32]} />
            <meshStandardMaterial map={painted ? badgeTex : null} color={painted ? '#f2f2f2' : '#b4b6b9'} transparent alphaTest={0.3} roughness={0.35} metalness={0.4} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/**
 * 職級帽章（手冊 P.103–105）：銀色帽章上面有一束顏色帽纓（顏色跟職級）。
 * position = 帽章底部中間；闊 2.6 cm，高跟圖案比例（約 4.5 cm）。
 */
function RankCapBadge({ tex, painted, position, rotation }) {
  const w = 2.6;
  const img = tex?.image;
  const hgt = img?.width ? (w * img.height) / img.width : w * 1.74;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, hgt / 2, 0]}>
        <planeGeometry args={[w, hgt]} />
        <meshStandardMaterial map={painted ? tex : null} color={painted ? '#ffffff' : '#b4b6b9'} transparent alphaTest={0.35} roughness={0.5} metalness={0.15} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}

/**
 * 深綠色金邊硬帽（女性成年成員編號 3、4；手冊 P.100、P.105）：帽邊離眼眉約 4 cm；
 * 職級帽章戴喺硬帽右方（穿著者右 = -x），同右耳成一直線。方塊造型只係示意。
 */
function HardHat({ B, painted, cap }) {
  const h = B.head;
  const headTop = h.y + h.h;
  const browY = headTop - 7.5;
  const base = browY + 4;
  const size = useMemo(() => [h.w + 1.2, 7, h.d + 1.2], [h]);
  const faces = useMemo(() => hardHatFaces(size), [size]);
  const tex = useTexture(cap.file);
  return (
    <group position={[0, base + size[1] / 2, h.z]}>
      <Box size={size} faces={faces} painted={painted} position={[0, 0, 0]} />
      <RankCapBadge tex={tex} painted={painted} position={[-(size[0] / 2 + 0.08), -size[1] / 2 + 0.9, 0.5]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  );
}

/**
 * 海童軍白頂帽（手冊 P.32–33、P.100、P.102）：帽邊喺眼眉上方約 2 cm、同水平線看齊；
 * 黑色帽帶喺白色帽邊下面，「SEA SCOUTS」字放喺帽前中央；帽子左邊（穿著者左 = +x）中央綁蝴蝶結，
 * 蝴蝶結同帽帶尾各長 3 cm。方塊造型只係示意。
 */
function SeaCap({ B, painted }) {
  const h = B.head;
  const headTop = h.y + h.h;
  const browY = headTop - 7.5;
  const bandH = 3.6;
  const bandY = browY + 2 + bandH / 2; // 帽邊（帽帶底）離眉 2 cm
  const tallyTex = useTexture(SEA_TALLY);
  const F = useMemo(() => {
    const band = [h.w + 0.8, bandH, h.d + 0.8];
    const wall = [h.w + 1.4, 1.6, h.d + 1.4]; // 白色帽邊（帽帶上面）
    const top = [h.w + 5, 1.4, h.d + 5]; // 白頂
    return {
      band, wall, top,
      bandF: hatFaces(band, C.beretBand),
      wallF: seaCapFaces(wall, C.seaCapTop),
      topF: seaCapFaces(top, C.seaCapTop),
      // 蝴蝶結用淺少少嘅黑（同黑頭髮分得開）
      bowF: hatFaces([0.5, 1.4, 1.5], '#34343a'),
      tailF: hatFaces([0.3, 3, 0.9], '#34343a'),
    };
  }, [h]);
  const { band, wall, top } = F;
  const wallY = bandY + bandH / 2 + wall[1] / 2;
  const topY = wallY + wall[1] / 2 + top[1] / 2 - 0.2;
  const tallyW = Math.min(h.w - 2, 13);
  const sideX = band[0] / 2 + 0.25;
  return (
    <group>
      <Box size={band} faces={F.bandF} painted={painted} position={[0, bandY, h.z]} />
      <Box size={wall} faces={F.wallF} painted={painted} position={[0, wallY, h.z]} />
      <Box size={top} faces={F.topF} painted={painted} position={[0, topY, h.z]} />
      <mesh position={[0, bandY, h.z + band[2] / 2 + 0.06]}>
        <planeGeometry args={[tallyW, tallyW / 4.3]} />
        <meshStandardMaterial map={painted ? tallyTex : null} color={painted ? '#ffffff' : '#9a9da1'} roughness={0.8} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      {/* 蝴蝶結（左右兩翼共 3 cm）+ 兩條 3 cm 帽帶尾，喺穿著者左邊中央 */}
      <group position={[sideX, bandY, h.z]}>
        {[1, -1].map((s) => (
          <Box key={s} size={[0.5, 1.4, 1.5]} faces={F.bowF} painted={painted} position={[0, 0, s * 0.75]} rotation={[s * 0.35, 0, 0]} />
        ))}
        <Box size={[0.7, 0.9, 0.7]} faces={F.bowF} painted={painted} position={[0.1, 0, 0]} />
        {[1, -1].map((s) => (
          <Box key={s} size={[0.3, 3, 0.9]} faces={F.tailF} painted={painted} position={[0.05, -1.6, s * 0.5]} rotation={[s * 0.25, 0, 0]} />
        ))}
      </group>
    </group>
  );
}

/**
 * 海童軍男／女領袖白頂帽（深資海童軍戴；手冊 P.38–39、P.101、P.102）：帽邊喺眼眉上方約 2 cm、同水平線看齊；
 * 深資海童軍帽章喺帽前黑色帽帶中央。男裝白頂闊、黑帽舌；女裝白頂細、後面向上翹、帽舌短。方塊造型只係示意。
 */
function SeaLeaderCap({ B, girl, painted, badge = VENTURE_SEA_CAP_BADGE }) {
  const h = B.head;
  const headTop = h.y + h.h;
  const browY = headTop - 7.5;
  const bandH = girl ? 2.6 : 3.4;
  const bandY = browY + 2 + bandH / 2;
  const badgeTex = useTexture(badge);
  const F = useMemo(() => {
    const band = [h.w + 0.8, bandH, h.d + 0.8];
    const top = girl ? [h.w + 1.6, 2.2, h.d + 1.2] : [h.w + 6, 1.6, h.d + 6];
    const peak = girl ? [h.w - 5, 0.5, 3] : [h.w - 3, 0.6, 5];
    return {
      band, top, peak,
      bandF: hatFaces(band, C.beretBand),
      topF: seaCapFaces(top, C.seaCapTop),
      peakF: brimFaces(peak, C.capPeak),
    };
  }, [h, girl, bandH]);
  const { band, top, peak } = F;
  const topY = bandY + bandH / 2 + top[1] / 2 - 0.1;
  const front = h.z + band[2] / 2;
  return (
    <group>
      <Box size={band} faces={F.bandF} painted={painted} position={[0, bandY, h.z]} />
      <group position={[0, topY, h.z - (girl ? 0.4 : 0)]} rotation={[girl ? -0.12 : 0, 0, 0]}>
        <Box size={top} faces={F.topF} painted={painted} position={[0, 0, 0]} />
      </group>
      <Box size={peak} faces={F.peakF} painted={painted} position={[0, bandY - bandH / 2 + 0.2, front + peak[2] / 2 - 0.6]} rotation={[0.28, 0, 0]} />
      <mesh position={[0, bandY + (girl ? 0.3 : 0.2), front + 0.08]}>
        <planeGeometry args={girl ? [2.4, 2.8] : [2.8, 3.3]} />
        <meshStandardMaterial map={painted ? badgeTex : null} color={painted ? '#ffffff' : '#9a9da1'} transparent alphaTest={0.3} roughness={0.7} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}

/** 基維爾巾圈（土耳其結）大細：細過皮巾圈、厚啲 */
const GILWELL_WOG = [5.2, 4, 2.6];

/** 領巾尖嘅圖案（會巾：香港章；基維爾領巾：格仔布），貼喺背後三角，面向後 */
function TipDecal({ file, w, h, painted, position }) {
  const tex = useTexture(file);
  return (
    <mesh position={position} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={painted ? tex : null} color={painted ? '#ffffff' : '#9a9da1'} roughness={0.85} polygonOffset polygonOffsetFactor={-3} />
    </mesh>
  );
}

/**
 * 木章（手冊 P.115–117；擺法跟用戶附相 2026-11-13）：皮繩由頸兩邊（top，喺領巾捲邊下面出嚟）
 * 斜斜落到胸前中間（knot，約胸袋底高度）打結，結下面兩條短繩吊住木珠；木珠打橫（穿孔喺中間），
 * 2 顆 = 每邊 1 顆；3 顆 = 左 2 右 1；4 顆 = 每邊 2 顆。木珠疊喺領巾（或者領帶）前面。頸後藏喺領巾下面，唔使畫。
 */
function WoodBadge({ top, knot, beads, painted }) {
  const F = useMemo(
    () => ({ thong: [0, 1, 2, 3, 4, 5].map(() => plain(1, 1, C.thong)), knot: hatFaces([1.4, 1.4, 1], C.thong), bead: hatFaces([3.2, 1.1, 1.1], C.woodBead) }),
    [],
  );
  const T = 0.45; // 皮繩粗幼
  const seg = (a, b, key) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    return (
      <group key={key} position={[(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]} rotation={[0, 0, Math.atan2(-dx, dy)]}>
        <Box size={[T, len, T]} faces={F.thong} painted={painted} position={[0, 0, 0]} rotation={[Math.atan2(dz, Math.hypot(dx, dy)), 0, 0]} />
      </group>
    );
  };
  // 木珠：由上到下交替左右（穿著者左先），每顆低 1.5 cm
  const list = Array.from({ length: beads }, (_, k) => {
    const s = k % 2 === 0 ? 1 : -1;
    return { s, x: s * 0.55, y: knot.y - 3.4 - k * 1.5, z: knot.z + 0.1 + (s > 0 ? 0.15 : 0) };
  });
  const lowest = (s) => list.filter((b) => b.s === s).at(-1);
  return (
    <group>
      {[1, -1].map((s) => seg({ x: s * top.x, y: top.y, z: top.z }, knot, `up${s}`))}
      <Box size={[1.4, 1.4, 1]} faces={F.knot} painted={painted} position={[knot.x, knot.y, knot.z + 0.1]} />
      {[1, -1].map((s) => {
        const b = lowest(s);
        return b ? seg({ x: knot.x + s * 0.3, y: knot.y - 0.6, z: knot.z }, { x: b.x, y: b.y + 0.4, z: b.z }, `dn${s}`) : null;
      })}
      {list.map((b, k) => (
        <Box key={k} size={[3.2, 1.1, 1.1]} faces={F.bead} painted={painted} position={[b.x, b.y, b.z]} />
      ))}
    </group>
  );
}

/**
 * 晚禮服黑色硬帽（手冊 P.206–211）：男 = 有帽舌硬帽；帽舌邊飾跟編號（oak2 兩行橡葉、oak1 一行橡葉、cord 帽繩、rim 黑邊、none 冇）；
 * 女 = 有邊硬帽（P.211）。銀色帽章圖案取自 P.208。方塊造型只係示意。
 */
function MessCap({ B, girl, painted, cap }) {
  const h = B.head;
  const headTop = h.y + h.h;
  const browY = headTop - 7.5;
  const tex = useTexture(MESS_CAP_BADGE);
  const metal = cap?.metal === 'gold' ? C.gold : C.silver;
  const F = useMemo(() => {
    const black = '#18181c';
    return {
      crownG: hatFaces([h.w + 1.4, 6.5, h.d + 1.4], black, { band: 1.2 }),
      brimG: brimFaces([h.w + 5, 0.6, h.d + 5], black),
      band: hatFaces([h.w + 0.8, 3.6, h.d + 0.8], '#101013'),
      top: hatFaces([h.w + 6, 1.8, h.d + 6], black),
      peak: brimFaces([h.w - 3, 0.6, 5], '#0c0c0e'),
      metal: hatFaces([1, 1, 1], metal),
      button: hatFaces([0.8, 0.8, 0.4], cap?.buttons === 'black' ? '#0c0c0e' : metal),
      rim: hatFaces([1, 1, 1], '#3a3a42'),
    };
  }, [h, metal, cap?.buttons]);
  const badge = (y, z, w) => (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[w, w * 0.98]} />
      <meshStandardMaterial map={painted ? tex : null} color={painted ? '#ffffff' : '#9a9da1'} transparent alphaTest={0.3} roughness={0.4} metalness={0.3} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
  if (girl) {
    const base = browY + 2.5;
    return (
      <group>
        <Box part="hat" size={[h.w + 1.4, 6.5, h.d + 1.4]} faces={F.crownG} painted={painted} position={[0, base + 3.25, h.z]} />
        <Box size={[h.w + 5, 0.6, h.d + 5]} faces={F.brimG} painted={painted} position={[0, base + 0.3, h.z]} />
        {badge(base + 3.6, h.z + (h.d + 1.4) / 2 + 0.06, 2.8)}
      </group>
    );
  }
  const bandH = 3.6;
  const bandY = browY + 2 + bandH / 2;
  const front = h.z + (h.d + 0.8) / 2;
  const peakW = h.w - 3;
  const strip = (n) =>
    Array.from({ length: n }, (_, i) => <Box key={i} size={[peakW - 1 - i * 1.5, 0.25, 1.1]} faces={F.metal} painted={painted} position={[0, 0.4, 1.6 - i * 1.3]} />);
  return (
    <group>
      <Box size={[h.w + 0.8, bandH, h.d + 0.8]} faces={F.band} painted={painted} position={[0, bandY, h.z]} />
      <Box size={[h.w + 6, 1.8, h.d + 6]} faces={F.top} painted={painted} position={[0, bandY + bandH / 2 + 0.8, h.z]} />
      <group position={[0, bandY - bandH / 2 + 0.2, front + 5 / 2 - 0.6]} rotation={[0.28, 0, 0]}>
        <Box size={[peakW, 0.6, 5]} faces={F.peak} painted={painted} position={[0, 0, 0]} />
        {cap?.trim === 'oak2' && strip(2)}
        {cap?.trim === 'oak1' && strip(1)}
        {cap?.trim === 'rim' && <Box size={[peakW + 0.1, 0.65, 0.5]} faces={F.rim} painted={painted} position={[0, 0, 2.3]} />}
      </group>
      {cap?.trim === 'cord' && <Box size={[h.w - 1, 0.45, 0.45]} faces={F.metal} painted={painted} position={[0, bandY - bandH / 2 + 0.9, front + 0.2]} />}
      {[1, -1].map((s) => (
        <Box key={s} size={[0.8, 0.8, 0.4]} faces={F.button} painted={painted} position={[s * (peakW / 2 - 0.2), bandY - bandH / 2 + 0.9, front + 0.2]} />
      ))}
      {badge(bandY + 0.5, front + 0.08, 3)}
    </group>
  );
}

/** 煲呔（男）／女裝領結（手冊 P.61）：黑色，喺恤衫領前面 */
function BowTie({ y, z, girl, painted }) {
  const F = useMemo(() => hatFaces([1, 1, 1], '#141417'), []);
  const wing = girl ? [1.8, 1.3, 0.6] : [2.4, 1.8, 0.8];
  return (
    <group position={[0, y, z]}>
      {[1, -1].map((s) => (
        <Box key={s} size={wing} faces={F} painted={painted} position={[s * (wing[0] / 2 + 0.3), 0, 0]} rotation={[0, 0, s * 0.18]} />
      ))}
      <Box size={[0.9, wing[1] * 0.6, wing[2] + 0.2]} faces={F} painted={painted} position={[0, 0, 0.05]} />
    </group>
  );
}

/** 貼喺前面嘅細圖案（晚禮服翻領銀色童軍徽） */
function FrontDecal({ file, size, painted, position }) {
  const tex = useTexture(file);
  return (
    <mesh position={position}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={painted ? tex : null} color={painted ? '#ffffff' : '#9a9da1'} transparent alphaTest={0.3} roughness={0.4} metalness={0.3} polygonOffset polygonOffsetFactor={-3} />
    </mesh>
  );
}

/**
 * 嘉許笛繩（手冊 P.184、P.188–189）：由左肩**職級肩章下面**穿出（v19 用戶指正＋相片），兜過膊頭、沿袖窿前面吊落到胸袋下面，
 * 再兜返上左胸袋口（笛子由胸袋口右方放入，唔畫）；後面一段（v20）由肩章下面向後、沿袖窿後面落到腋下同前面接埋，成個圈套住左膊。
 * 晚禮服小型笛繩幼一半、去到左襟領。
 * paths = [前面一段, 後面一段]，每段係繩經過嘅點（cm，3D）；colours = 一條或兩條繩嘅顏色。每段用四元數由 +Y 轉去段嘅方向。可以撳嚟揀。
 */
function Lanyard({ p, paths, colours, thick, painted, selected, onSelect, registry }) {
  const ref = useRef();
  useEffect(() => {
    if (!registry || !ref.current) return undefined;
    registry.set(p.key, ref.current);
    return () => registry.delete(p.key);
  }, [registry, p.key]);
  const offs = useMemo(() => strandOffsets(colours.map((k) => k.w)), [colours]);
  // 扭紋（模範童軍肩帶：綠／黃）：每段切細，每 ALT_CM 轉色
  const alt = colours.some((k) => k.alt);
  const segs = useMemo(() => paths.flatMap((pts) => lanyardSegments(alt ? subdivide(pts, ALT_CM) : pts, thick, offs)), [paths, thick, offs, alt]);
  const tassel = useMemo(() => (alt ? lanyardSegments(tasselPoints(paths[0]), thick * 0.8, [0]) : []), [paths, thick, alt]);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(p.id);
      }}
    >
      {segs.map((sg, i) =>
        colours.map((k, j) => (
          <mesh key={`${i}-${j}`} ref={i === 0 && j === 0 ? ref : undefined} position={sg.pos[j]} quaternion={sg.quat} castShadow>
            <boxGeometry args={[thick * k.w, sg.len, thick * k.w]} />
            <meshStandardMaterial color={painted ? (selected ? '#f2791c' : k.alt && i % 2 ? k.alt : k.c) : '#a3a6aa'} roughness={0.6} />
          </mesh>
        )),
      )}
      {tassel.map((sg, i) => (
        <mesh key={`t${i}`} position={sg.pos[0]} quaternion={sg.quat} castShadow>
          <boxGeometry args={[thick * 1.1, sg.len, thick * 0.6]} />
          <meshStandardMaterial color={painted ? (selected ? '#f2791c' : colours[0].alt) : '#a3a6aa'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
/**
 * v24 童軍專科徽章肩帶（綱要 P.15–16）：綠底紅邊斜布，由左肩斜落右腰；旅巾喺帶外面（帶嘅 z 低過旅巾）。
 * 幾何由 body.js sashMesh 計；貼圖橫向 紅 0.75 | 綠 11.5 | 紅 0.75 cm。
 */
function Sash({ L, painted, surf = null }) {
  const geo = useMemo(() => {
    const m = sashMesh(sashLayout(L));
    const g = new THREE.BufferGeometry();
    if (surf) {
      // v26 流線：每塊四邊形切細，再逐點貼返落圓滑上身
      const P = [], U = [], I = [];
      const n = 12;
      for (let q = 0; q < m.indices.length; q += 6) {
        const c = [m.indices[q], m.indices[q + 1], m.indices[q + 2], m.indices[q + 5]];
        const pt = (k) => m.positions.slice(c[k] * 3, c[k] * 3 + 3);
        const uv = (k) => m.uvs.slice(c[k] * 2, c[k] * 2 + 2);
        const base = P.length / 3;
        for (let j = 0; j <= n; j++) {
          for (let i = 0; i <= n; i++) {
            const a = i / n, b = j / n;
            const lerp = (f) => [0, 1, 2].map((d) => (1 - a) * (1 - b) * f(0)[d] + a * (1 - b) * f(1)[d] + a * b * f(2)[d] + (1 - a) * b * f(3)[d]);
            P.push(...snapToSurface(lerp(pt), surf, 3));
            const u = lerp((k) => [...uv(k), 0]);
            U.push(u[0], u[1]);
          }
        }
        for (let j = 0; j < n; j++) {
          for (let i = 0; i < n; i++) {
            const o = base + j * (n + 1) + i;
            I.push(o, o + 1, o + n + 2, o, o + n + 2, o + n + 1);
          }
        }
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      g.setIndex(I);
    } else {
      g.setAttribute('position', new THREE.Float32BufferAttribute(m.positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(m.uvs, 2));
      g.setIndex(m.indices);
    }
    g.computeVertexNormals();
    return g;
  }, [L, surf]);
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    const px = 8; // 每 cm
    cv.width = SASH.widthCm * px;
    cv.height = 4;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.sashGreen;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = C.sashRed;
    ctx.fillRect(0, 0, SASH.edgeCm * px, cv.height);
    ctx.fillRect(cv.width - SASH.edgeCm * px, 0, SASH.edgeCm * px, cv.height);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    return t;
  }, []);
  useEffect(() => () => {
    geo.dispose();
    tex.dispose();
  }, [geo, tex]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial map={painted ? tex : null} color={painted ? '#ffffff' : '#a3a6aa'} roughness={0.85} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
}

/** 將路線切成每段大約 step cm（扭紋轉色用） */
function subdivide(points, step) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
    for (let k = 1; k <= n; k++) out.push(a.map((v, j) => v + ((b[j] - v) * k) / n));
  }
  return out;
}
/** 笛繩每段：中心（每條繩一個，並排；offs = strandOffsets，以 thick 計）、長度、四元數（+Y → 段方向）。並排方向 = 段方向 × 前（+Z）；段近乎前後就用 +X。 */
function lanyardSegments(points, thick, offs) {
  const up = new THREE.Vector3(0, 1, 0);
  return points.slice(1).map((b, i) => {
    const a = new THREE.Vector3(...points[i]);
    const d = new THREE.Vector3(...b).sub(a);
    const len = d.length();
    const dir = d.clone().normalize();
    let side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1));
    if (side.lengthSq() < 0.05) side = new THREE.Vector3(1, 0, 0);
    side.normalize();
    const mid = a.clone().addScaledVector(d, 0.5);
    const pos = offs.map((o) => mid.clone().addScaledVector(side, o * thick).toArray());
    return { pos, len: len + thick, quat: new THREE.Quaternion().setFromUnitVectors(up, dir) };
  });
}

const SHORTS_BOTTOM = 38; // 短褲腳離地（cm，膝頭上面）
const BEIGE_SHORTS_BOTTOM = { cub: { boy: 47, girl: 45 }, scout: { boy: 54, girl: 52 } }; // 幼童軍／童軍短褲、裙褲腳離地
const BEIGE_SOCK_H = { cub: 34, scout: 40 }; // 長襪到膝頭下
const SOCK_H = { short: 6, long: 25 }; // 襪由腳底量起（短襪過腳眼；長襪到膝頭下）

export default function Blocky({ section = 'grasshopper', outfit, badges = {}, picks = {}, selected = null, onSelect, registry }) {
  const RULES = SECTIONS[section] ?? SECTIONS.grasshopper;
  // 幼童軍同童軍：同款杏色恤衫、草青色短褲／裙褲、深草青色長襪（手冊 P.28、P.30）
  // 深資童軍：同樣係恤衫制服（兩胸袋、皮帶），另加肩帶；長褲／半截裙（手冊 P.36–41）
  // 樂行童軍（手冊 P.42–47）同深資童軍一樣：肩帶、長褲／半截裙、領帶
  const venture = isSenior(section);
  // 成年成員（手冊 P.52–81）：同深資／樂行童軍一樣有肩帶；制服編號決定領巾／領帶、褲／裙／短褲
  const leader = section === 'leader';
  const cub = section === 'cub' || section === 'scout' || venture;
  const scout = section === 'scout';
  const leather = scout || venture; // 啡色皮巾圈（手冊 P.110）
  // 童軍支部制服款式：童軍／海童軍／空童軍（手冊 P.30–35）；幼童軍同陸上童軍同色
  const U = scout
    ? scoutVariant(outfit.variant)
    : leader
    ? leaderVariant(['u1', 'u2'].includes(outfit.uniform) ? 'land' : outfit.variant) // 禮服／晚禮服只有一款，海／空童軍領袖都一樣（手冊 P.57–62，用戶確認）
    : section === 'rover'
    ? roverVariant(outfit.variant)
    : venture
    ? ventureVariant(outfit.variant)
    : SCOUT_VARIANTS.land;
  // 成年成員一律當已宣誓（冇未宣誓狀態）
  const invested = leader ? true : outfit.invested;
  const gender = outfit.gender === 'girl' ? 'girl' : 'boy';
  const painted = outfit.finish !== 'unpainted';
  const smooth = useSmooth(); // v26 流線公仔
  const L = useMemo(() => layout(gender, section), [gender, section]);
  const VL = leader ? leaderLegwear(gender, outfit.uniform) : venture ? ventureLegwear(gender, outfit.ventureLegwear) : null;
  // 禮服（編號 1）／晚禮服（編號 2）外套：同毛衣一樣係一層殼（手冊 P.57–62）
  const dress = leader ? VL.dress : null;
  const D = useMemo(() => (dress ? dressLayout(L, VL.uniform) : null), [dress, L, VL?.uniform]); // eslint-disable-line react-hooks/exhaustive-deps
  const summer = outfit.season === 'summer';
  const jacketColour = dress === 'jacket' ? U.leg : dress === 'mess' ? (summer ? C.messWhite : C.messBlack) : null;
  // 制服毛衣（手冊 P.121–122）：幼童軍、童軍、深資童軍；深草青色，海／空童軍深藍色（禮服、晚禮服冇）
  const sweater = cub && !!outfit.sweater && !dress;
  const sweaterColour = U.sweater ?? C.sweaterGreen;
  // 深資童軍領帶（手冊 P.48、P.113）：代替旅巾；宣誓後先戴（同旅巾一樣，待確認）
  const tie = leader ? VL.tie : venture && outfit.neckwear === 'tie';
  const strap = useMemo(() => (venture ? strapLayout(L, { sweater: sweater || !!dress }) : null), [venture, L, sweater, dress]);
  const { B } = L;
  const top = cub ? 'cub' : outfit.top ?? 'orange';
  const topColour = cub ? (dress === 'mess' ? C.messShirt : U.shirt) : outfit.topColour ?? '#ffffff';
  const long = (!cub && outfit.sleeves === 'long') || sweater || !!dress;
  const vest = !cub && !!outfit.vest;
  const shorts = leader ? VL.shorts : venture ? false : cub || outfit.legwear === 'shorts';
  const legColour = dress === 'mess' ? C.messBlack : cub ? U.leg : outfit.legColour ?? '#8a9099';
  const shortsBottom = leader && VL.shorts ? B.shortsBottom : venture ? (VL?.longSkirt ? LONG_SKIRT_BOTTOM : B.skirtBottom) : cub ? BEIGE_SHORTS_BOTTOM[section][gender] : SHORTS_BOTTOM;
  const culottes = cub && !venture && gender === 'girl';
  const skirt = !!VL?.skirt;

  // 成年成員帽（手冊 P.97–105）：海童軍領袖 = 白頂帽 + 海童軍領袖帽章；女（陸上、編號 3／4）= 金邊硬帽或軟帽；
  // 其餘軟帽（陸上深綠色、深資童軍領袖棗紅色、空童軍領袖灰藍色）+ 職級帽章
  const landLeader = leader && (!!dress || !['sea', 'air'].includes(outfit.variant));
  const hatInfo = useMemo(() => {
    if (!leader) return { kind: 'none' };
    if (dress === 'mess') return { kind: 'mess', cap: messCapOf(RULES, picks.rank, gender) }; // 晚禮服黑色硬帽（手冊 P.206–211）
    if (U.hat === 'seaLeader') return { kind: 'sea' };
    const cap = rankCap(RULES, picks.rank);
    // 硬帽：女、陸上、編號 3／4（半截裙）；教練員唔戴硬帽（手冊 P.100）
    if (landLeader && skirt && outfit.hatStyle !== 'beret' && picks.rank !== 'instructor') return { kind: 'hardHat', cap };
    // 禮服（編號 1）：男一律深綠色軟帽（手冊 P.58）
    return { kind: 'beret', colour: landLeader && outfit.ventureLeader && !dress ? C.maroon : U.beret, cap };
  }, [leader, U, RULES, picks.rank, landLeader, skirt, outfit.hatStyle, outfit.ventureLeader, dress, gender]);
  // 成年成員領巾、巾圈、木章
  const LN = useMemo(() => (leader ? leaderNeckwear(RULES, outfit, picks) : null), [leader, RULES, outfit, picks]);
  // 旅巾花款（素色＋花邊／斜紋、左右唔同色）；會巾、基維爾領巾固定顏色
  const neckerFixed = LN ? (LN.necker === 'association' ? C.assocNecker : LN.necker === 'gilwell' ? C.gilwellNecker : null) : null;
  const NP = useMemo(
    () => neckerPalettes(outfit, neckerFixed),
    [outfit.neckerPattern, outfit.neckerStripes, outfit.neckerSplit, outfit.neckerMain, outfit.neckerBorder, outfit.neckerThird, outfit.neckerRMain, outfit.neckerRBorder, outfit.neckerRThird, neckerFixed], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // 徽章：位置全部由規則 JSON 計出嚟（學校運動上衣、背心會改位）；區章、地域章、優異旅團章圖案跟用戶揀
  const staticUrls = useMemo(() => [...placeAll(RULES, gender).map((p) => p.art).filter((a) => a && !a.startsWith('dyn:')), ...ribbonUrls(RULES)], [RULES, gender]); // 勳條（一般場合）預先載入
  const fixed = useBadgeTextures(staticUrls);
  const dynArts = useMemo(() => {
    const o = {};
    for (const b of RULES.badges) if (b.dynamic) o[dynKey(b.id)] = resolveArt(b, picks, DISTRICTS, PATROLS);
    return o;
  }, [RULES, picks]);
  const dyn = useDynamicTextures(dynArts);
  const textures = useMemo(() => ({ ...fixed, ...dyn }), [fixed, dyn]);
  const unavailable = useMemo(() => RULES.badges.filter((b) => b.dynamic && !dynArts[dynKey(b.id)]).map((b) => b.id), [RULES, dynArts]);
  const all = useMemo(() => placeFor(RULES, outfit), [RULES, outfit]);
  // v24 專章帶（綱要 P.15–16）：只限童軍、整齊制服（唔著毛衣）；專科徽章頭 16 個改戴喺帶上
  const sashOn = scout && sashActive(RULES, outfit, badges); // v24c：要有 12 個專科徽章
  const shown = useMemo(
    () => visible(all, badges, { invested, school: outfit.school, unavailable, level: leader ? picks.level : null, sash: sashOn }),
    [all, badges, invested, outfit.school, unavailable, leader, picks.level, sashOn],
  );
  const patchProps = { textures, painted, onSelect, registry };
  const torsoItems = shown.filter((p) => p.mount === 'torso');
  const armItems = (side) => shown.filter((p) => p.mount === side);
  const seamY = L.top - L.shoulderY;
  // 嘉許笛繩：左肩職級肩章下面 → 兜過膊頭 → 沿袖窿前面吊落 → 兜返上左胸袋口（禮服、恤衫）；晚禮服小型笛繩去到左襟領
  // v22 模範童軍肩帶：右肩（左右反轉）、末端扣喺右胸袋袋蓋近中線嗰邊；童軍模型冇畫肩帶就用 virtual 肩帶計路線
  const lanyards = useMemo(() => {
    const st = strap ?? strapLayout(L, { virtual: true });
    if (!st) return [];
    return shown
      .filter((p) => p.kind === 'lanyard')
      .map((p) => {
        const side = p.x < 0 ? -1 : 1;
        const slide = leader ? all.find((q) => q.key === `epaulette-${side < 0 ? 'r' : 'l'}`) : null; // 職級肩章（冇揀都用佢個位）
        const z = p.z + 0.3;
        const thick = p.mini ? 0.3 : 0.55;
        const args = { L, strap: st, D: p.mini ? D : null, z, thick, slideX: slide?.x, side, end: p.end };
        const paths = [lanyardPoints(args), lanyardBackPoints(args)]; // 前面一段＋後面一段（套住膊頭嘅圈）
        return { p, paths, colours: LANYARD_COLOURS[p.choice] ?? LANYARD_COLOURS.commendation, thick };
      });
  }, [all, shown, strap, D, L, leader]);

  // 身體貼圖
  const body = useMemo(() => {
    const sl = [B.sleeve.w, B.sleeve.len, B.sleeve.d];
    const slLong = [B.sleeve.w, L.top - L.shoulderY + B.upperArm.h, B.sleeve.d];
    const legH = B.leg.top - B.leg.y;
    return {
      head: headFaces(B, smooth),
      pigtail: pigtailFaces([4.5, 12, 4.5], PIGTAIL_TIE),
      neck: neckFaces(B),
      arm: {
        upper: skinFaces([B.upperArm.w, B.upperArm.h, B.upperArm.d]),
        lower: skinFaces([B.lowerArm.w, B.lowerArm.h, B.lowerArm.d]),
        hand: handFaces([B.hand.w, B.hand.h, B.hand.d]),
      },
      legH,
      // 黑皮鞋（綁帶）；深資／樂行女團員配半截裙 = 非綁帶中跟皮鞋，用 pumpParts 砌（下面）
      // 晚禮服男裝：黑色光身皮鞋（手冊 P.61）→ 冇鞋帶
      shoe: cub ? shoeFaces([B.shoe.w, B.shoe.h, B.shoe.d], { colour: C.shoeBlack, sole: C.soleBlack, lace: dress === 'mess' ? C.shoeBlack : '#3a3a40' }) : shoeFaces([B.shoe.w, B.shoe.h, B.shoe.d]),
      pump: skirt ? pumpParts(B.shoe) : null,
      pumpF: skirt
        ? {
            shoe: [C.shoeBlack, C.shoeBlack, '#2b2b31', C.soleBlack, C.shoeBlack, C.shoeBlack].map((c) => plain(2, 2, c)),
            tights: [0, 1, 2, 3, 4, 5].map(() => plain(2, 2, C.tights)),
          }
        : null,
      sl,
      slLong,
    };
  }, [B, L, cub, skirt, dress, smooth]);

  // 衫（跟款式、顏色、袖長變）
  const shirt = useMemo(() => {
    const cuffSize = [B.lowerArm.w + 1, B.lowerArm.h, B.lowerArm.d + 1.4];
    return {
      torso: cub ? cubTorsoFaces(B, { legColour, shirt: topColour, skirt }) : torsoFaces(B, top, topColour),
      sleeve: sleeveFaces(body.sl, B.sleeve.band, top, topColour, false),
      // 著毛衣：長袖同前臂袖改做毛衣（坑紋、膊布、袖口坑紋）
      // 禮服／晚禮服：外套長袖（同外套同色）
      sleeveLong: jacketColour ? sleeveFaces(body.slLong, B.sleeve.band, 'polo', jacketColour, true) : sweater ? sweaterSleeveFaces(body.slLong, sweaterColour) : sleeveFaces(body.slLong, B.sleeve.band, top, topColour, true),
      cuff: jacketColour ? cuffFaces(cuffSize, 'polo', jacketColour) : sweater ? sweaterCuffFaces(cuffSize, sweaterColour) : cuffFaces(cuffSize, top, topColour),
      // 禮服：外套衣領（草青色）；晚禮服：白恤衫領
      collar: [1, 1, 1, 1, 1, 1].map(() => plain(2, 2, dress === 'jacket' ? shade(jacketColour, 1.06) : shirtPalette(top, topColour).collar)),
    };
  }, [B, body, top, topColour, cub, legColour, sweater, sweaterColour, skirt, jacketColour, dress]);
  // 禮服／晚禮服外套殼
  const dressF = useMemo(() => {
    if (!D) return null;
    if (dress === 'jacket') return dressJacketFaces(D, B, { colour: jacketColour, shirt: U.shirt, tie: U.tie, waist: B.waist });
    return messJacketFaces(D, B, { colour: jacketColour, shirt: C.messShirt, purple: C.purple, leg: legColour });
  }, [D, dress, B, jacketColour, U.shirt, U.tie, legColour]);
  const armFaces = useMemo(() => ({ ...body.arm, ...shirt }), [body, shirt]);

  // 褲、襪
  const legs = useMemo(() => {
    const shinH = shortsBottom - B.leg.y;
    const grow = culottes ? 1.8 : 0.6; // 裙褲闊啲
    const shortsSize = [B.leg.w + grow, B.leg.top - shortsBottom, B.leg.d + grow];
    const shinSize = [B.leg.w - 1.4, shinH, B.leg.d - 1.4];
    return {
      trousers: VL?.stripe ? messTrouserFaces([B.leg.w, body.legH, B.leg.d], legColour, C.purple) : legFaces([B.leg.w, body.legH, B.leg.d], legColour),
      shorts: shortsFaces(shortsSize, legColour),
      shortsSize,
      shin: cub ? cubShinFaces(shinSize, (B.longSockTop ?? BEIGE_SOCK_H[section]) - B.leg.y, U.sock) : shinFaces(shinSize, SOCK_H[outfit.socks] ?? SOCK_H.short, outfit.sockColour ?? '#ffffff'),
      shinSize,
      shinH,
      // 深資童軍半截裙：一件過包住兩隻腳，及膝；下面肉色襪褲
      skirtSize: [L.legX * 2 + B.leg.w + 2.4, B.leg.top - shortsBottom, B.leg.d + 2.4],
      skirtF: venture ? skirtFaces([L.legX * 2 + B.leg.w + 2.4, B.leg.top - shortsBottom, B.leg.d + 2.4], legColour) : null,
      tightsF: venture ? [0, 1, 2, 3, 4, 5].map(() => plain(2, 2, C.tights)) : null,
    };
  }, [B, L, body.legH, legColour, outfit.socks, outfit.sockColour, shortsBottom, culottes, cub, venture, section, U.sock, VL?.stripe]);

  // 背心
  const t = B.torso, h = B.head;
  const vestBox = [t.w + VEST_T * 2, t.h + 1.5, t.d + VEST_T * 2];
  // v26 流線：最外面嗰件上衣（禮服／毛衣／背心／恤衫）嘅圓滑表面，章、專章帶、笛繩貼返落去；衫袖表面喺手臂座標
  const torsoSurf = useMemo(() => {
    if (D && dressF) return surfaceOf('torso', [D.w, D.h, D.d], [0, D.bottom + D.h / 2, 0]);
    if (sweater || vest) return surfaceOf('torso', vestBox, [0, t.y - 1 + vestBox[1] / 2, 0]);
    return surfaceOf('torso', [t.w, t.h, t.d], [0, t.y + t.h / 2, 0]);
  }, [D, dressF, sweater, vest, t.w, t.h, t.d, t.y]); // eslint-disable-line react-hooks/exhaustive-deps
  const sleeveSurf = useMemo(() => {
    const seam = L.top - L.shoulderY;
    const len = long ? seam + B.upperArm.h : B.sleeve.len;
    return surfaceOf('sleeve', [B.sleeve.w, len, B.sleeve.d], [0, seam - len / 2, 0]);
  }, [L, B, long]);
  // v27：有冇戴帽（同下面畫帽嘅條件一樣）— 戴帽時立體頭髮壓薄啲
  const hatOn = !!outfit.hat && (
    (!cub && outfit.hat !== 'none') ||
    ((section === 'cub' || scout || (venture && !leader)) && !!outfit.invested) ||
    (leader && (hatInfo.kind === 'sea' || hatInfo.kind === 'beret' || hatInfo.kind === 'mess' || (hatInfo.kind === 'hardHat' && !!hatInfo.cap)))
  );
  // v26 流線：笛繩切細（1.5 cm）再貼返圓滑上身，唔會喺膊頭圓角度浮起
  const lanyardsShown = useMemo(
    () => (smooth ? lanyards.map((q) => ({ ...q, paths: q.paths.map((pts) => subdivide(pts, 1.5).map((v) => snapToSurface(v, torsoSurf))) })) : lanyards),
    [smooth, lanyards, torsoSurf],
  );
  const vestF = useMemo(() => (vest ? vestFaces(vestBox, outfit.vestColour ?? '#1f2f4f', B.neck.w) : null), [vest, outfit.vestColour, B, t.w]); // eslint-disable-line react-hooks/exhaustive-deps
  // 毛衣殼同背心一樣大（頂面高過膊頭 SWEATER_TOP）
  const sweaterF = useMemo(() => (sweater ? sweaterFaces(vestBox, sweaterColour, B.neck.w) : null), [sweater, sweaterColour, B, t.w]); // eslint-disable-line react-hooks/exhaustive-deps
  // 領帶：結喺衣領前面；帶身貼住恤衫（著毛衣時俾毛衣遮住，手冊 P.122「領帶放在毛衣與制服恤衫之間」）
  const tieF = useMemo(() => {
    if (!tie) return null;
    const len = L.top - B.waist - 1;
    return { len, blade: tieCanvas(3.2, 6.4, len, U.tie), knot: hatFaces([3, 2.6, 1.4], shade(U.tie, 0.92)) };
  }, [tie, L, B, U.tie]);

  // 旅巾（跟顏色、背心變）
  const N = useMemo(() => {
    const G = neckerLayout(L, { vest: vest || sweater });
    const P = (s) => (s > 0 ? NP.left : NP.right); // s = +1 穿著者左
    const per = (fn) => ({ 1: fn(1), [-1]: fn(-1) });
    return {
      ...G,
      split: NP.split,
      roll: {
        back: NP.split ? per((s) => neckerRollFaces([G.outer / 2, G.rollH, G.rollT], P(s), -s)) : neckerRollFaces([G.outer, G.rollH, G.rollT], NP.left, 1),
        side: per((s) => neckerRollFaces([G.rollT, G.rollH, G.inner + G.rollT + 1.2], P(s), s)),
      },
      upperC: per((s) => neckerTailCanvas(G.tail.w, G.len + 1, P(s), 0, s)),
      lowerC: per((s) => neckerTailCanvas(G.tail.w, G.tail.len, P(s), G.tail.tip, s)),
      backC: neckerBackCanvas(G.back.w, G.back.h, NP.left, NP.right),
    };
  }, [L, vest, sweater, NP]);

  // 童軍：啡色皮巾圈（手冊 P.110）；其他支部：顏色巾圈
  const gilwellWog = !!LN?.gilwellWoggle;
  const wogFaces = useMemo(
    () => (gilwellWog ? gilwellWogglePaint(GILWELL_WOG, { trainer: LN.trainer }) : leather ? scoutWogglePaint([8, 3, 1.4]) : wogglePaint([8, 2.6, 1.2], outfit.woggle)),
    [outfit.woggle, leather, gilwellWog, LN?.trainer], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // 木章（手冊 P.116–117、用戶附相）：皮繩由頸兩邊斜落到胸前中間打結，木珠吊喺結下面
  const wood = useMemo(() => {
    if (!LN?.woodBadge || !invested) return null;
    const N0 = neckerLayout(L);
    const out = dress ? VEST_T : 0; // 禮服：掛喺外套 V 位前面
    const top = tie
      ? { x: B.neck.w / 2 + 1.9, y: L.top + 0.2 + out, z: B.torso.d / 2 + 0.7 + out } // 領帶：皮繩由衣領兩邊落（唔好穿入身）
      : { x: N0.outer / 2 - 0.8, y: L.top + N0.rollH - 0.2, z: N0.front + 0.6 };
    // 結喺胸前中間，約胸袋底高度（巾圈下面巾尾長度約 2/3）；木珠吊喺結下面、疊喺巾尾／領帶前面
    const tailLen = B.necker.tailLen;
    const knotY = (tie ? L.top - B.necker.wogDrop : N0.wogY) - tailLen * 0.68;
    const knot = { x: 0, y: knotY, z: (tie ? B.torso.d / 2 + 0.7 + out : N0.front + 0.4) + 0.8 };
    return { top, knot, beads: LN.beads };
  }, [LN, invested, L, B, tie, dress]);
  // 肩帶（恤衫色，邊深少少）
  // 肩帶：恤衫色；著毛衣就係毛衣膊布色（手冊 P.122 附圖）
  const strapF = useMemo(
    () => (strap ? hatFaces([strap.len, strap.boxT, strap.w], jacketColour ?? (sweater ? brighten(sweaterColour, 1.75) : shirtPalette('cub', topColour).main)) : null),
    [strap, topColour, sweater, sweaterColour, jacketColour],
  );

  const collarH = 3.6;
  const hasCollar = top !== 'tee';
  return (
    <group>
      <Plinth />
      <group position={[0, BASE_H, 0]} scale={0.01}>
        {/* 頭、頸、帽 */}
        <Box part="head" size={[h.w, h.h, h.d]} faces={body.head} painted={painted} position={[0, h.y + h.h / 2, h.z]} />
        {smooth && <SmoothHead head={h} style={B.hair} hat={hatOn} painted={painted} tie={PIGTAIL_TIE} />}
        {!smooth && B.hair === 'pigtails' &&
          [1, -1].map((s) => (
            <Box part="limb" key={s} size={[4.5, 12, 4.5]} faces={body.pigtail} painted={painted} position={[s * (h.w / 2 + 1.6), h.y + 5, -4.5]} rotation={[0.15, 0, s * 0.12]} />
          ))}
        {!cub && outfit.hat && outfit.hat !== 'none' && <Hat B={B} kind={outfit.hat} colour={outfit.hatColour ?? '#1f2f4f'} painted={painted} />}
        {section === 'cub' && outfit.hat && outfit.invested && <CubHat B={B} girl={gender === 'girl'} painted={painted} />}
        {scout && outfit.hat && outfit.invested && (U.hat === 'sea' ? <SeaCap B={B} painted={painted} /> : <ScoutBeret B={B} painted={painted} colour={U.beret} />)}
        {venture && !leader && outfit.hat && outfit.invested && (U.hat === 'seaLeader' ? <SeaLeaderCap B={B} girl={gender === 'girl'} painted={painted} /> : <ScoutBeret B={B} painted={painted} colour={U.beret} />)}
        {leader && outfit.hat && hatInfo.kind === 'sea' && <SeaLeaderCap B={B} girl={gender === 'girl'} painted={painted} badge={SEA_LEADER_CAP_BADGE} />}
        {leader && outfit.hat && hatInfo.kind === 'hardHat' && hatInfo.cap && <HardHat B={B} painted={painted} cap={hatInfo.cap} />}
        {leader && outfit.hat && hatInfo.kind === 'beret' && <ScoutBeret B={B} painted={painted} colour={hatInfo.colour} cap={hatInfo.cap} />}
        {leader && outfit.hat && hatInfo.kind === 'mess' && <MessCap B={B} girl={gender === 'girl'} painted={painted} cap={hatInfo.cap} />}
        <Box part="neck" size={[B.neck.w, B.neck.h, B.neck.d]} faces={body.neck} painted={painted} position={[0, B.neck.y + B.neck.h / 2, 0]} />
        {/* 上身 */}
        <Box part="torso" size={[t.w, t.h, t.d]} faces={shirt.torso} painted={painted} position={[0, t.y + t.h / 2, 0]} />
        {strap &&
          [1, -1].map((s) => <Box key={`strap${s}`} size={[strap.len, strap.boxT, strap.w]} faces={strapF} painted={painted} position={[s * strap.cx, strap.boxY, 0]} />)}
        {sweater && <Box part="torso" size={vestBox} faces={sweaterF} painted={painted} alpha position={[0, t.y - 1 + vestBox[1] / 2, 0]} />}
        {D && dressF && <Box part="torso" size={[D.w, D.h, D.d]} faces={dressF} painted={painted} alpha position={[0, D.bottom + D.h / 2, 0]} />}
        {D?.fleur && [1, -1].map((s) => <FrontDecal key={`fleur${s}`} file={LAPEL_FLEUR} size={D.fleur.size} painted={painted} position={[s * D.fleur.x, D.fleur.y, D.front + 0.08]} />)}
        {leader && VL.bowTie && <BowTie y={L.top + SWEATER_TOP + 1.6} z={B.neck.d / 2 + 0.7} girl={gender === 'girl'} painted={painted} />}
        {lanyardsShown.map((q) => (
          <Lanyard key={q.p.key} p={q.p} paths={q.paths} colours={q.colours} thick={q.thick} painted={painted} selected={selected === q.p.id} onSelect={onSelect} registry={registry} />
        ))}
        {sashOn && <Sash L={L} painted={painted} surf={smooth ? torsoSurf : null} />}
        {vest && <Box part="torso" size={vestBox} faces={vestF} painted={painted} alpha position={[0, t.y - 1 + vestBox[1] / 2, 0]} />}
        {/* 企領（有領上衣先有；前面開口） */}
        {hasCollar && (
          <>
            <Box size={[N.inner, collarH, N.collarT]} faces={shirt.collar} painted={painted} position={[0, L.top + collarH / 2, -(N.nw / 2 + N.collarT / 2)]} />
            {[1, -1].map((s) => (
              <Box key={s} size={[N.collarT, collarH, N.nw]} faces={shirt.collar} painted={painted} position={[s * (N.nw / 2 + N.collarT / 2), L.top + collarH / 2, 0]} />
            ))}
          </>
        )}
        {['l', 'r'].map((side) => (
          <Arm key={side} L={L} side={side} painted={painted} faces={armFaces} long={long}>
            {armItems(side).map((p) => (
              <SleeveBadges key={p.key} items={[p]} side={side} sleeveW={B.sleeve.w} sleeveD={B.sleeve.d} seamY={seamY} surf={sleeveSurf} selected={selected === p.id} {...patchProps} />
            ))}
          </Arm>
        ))}
        {torsoItems.map((p) => (
          <TorsoBadges key={p.key} items={[p]} surf={torsoSurf} selected={selected === p.id} {...patchProps} />
        ))}
        {/* 褲、襪、鞋 */}
        {[1, -1].map((s) => (
          <group key={s}>
            {venture && skirt ? (
              <Box part="limb" size={[B.leg.w - 1, legs.shinH + 2, B.leg.d - 1]} faces={legs.tightsF} painted={painted} position={[s * L.legX, B.leg.y + (legs.shinH + 2) / 2, 0]} />
            ) : shorts ? (
              <>
                <Box part="limb" size={legs.shortsSize} faces={legs.shorts} painted={painted} taper={1.05} position={[s * (L.legX + (culottes ? 0.4 : 0)), (shortsBottom + B.leg.top) / 2, 0]} />
                <Box part="limb" size={smooth ? [legs.shinSize[0], legs.shinSize[1] + 2, legs.shinSize[2]] : legs.shinSize} faces={legs.shin} painted={painted} position={[s * L.legX, B.leg.y + legs.shinH / 2 + (smooth ? 1 : 0), 0]} taper={smooth ? 0.86 : 1} />
              </>
            ) : (
              <Box part="limb" size={[B.leg.w, body.legH, B.leg.d]} faces={legs.trousers} painted={painted} taper={0.9} position={[s * L.legX, (B.leg.y + B.leg.top) / 2, 0]} />
            )}
            {body.pump ? (
              <group position={[s * L.legX, 0, B.shoe.z]}>
                {body.pump.map((q) => (
                  <Box key={q.part} size={q.size} faces={body.pumpF[q.kind]} painted={painted} position={q.pos} rotation={q.rot} />
                ))}
              </group>
            ) : (
              <Box part="shoe" size={[B.shoe.w, B.shoe.h, B.shoe.d]} faces={body.shoe} painted={painted} position={[s * L.legX, B.shoe.h / 2, B.shoe.z]} />
            )}
          </group>
        ))}
        {venture && skirt && <Box part="skirt" size={legs.skirtSize} faces={legs.skirtF} painted={painted} taper={1.08} position={[0, (shortsBottom + B.leg.top) / 2, 0]} />}
        {/* 旅巾 + 巾圈（宣誓後先戴；戴喺衣領／背心外面） */}
        {invested && tie && (
          <group>
            <Box size={[3, 2.6, 1.4]} faces={tieF.knot} painted={painted} position={[0, L.top + SWEATER_TOP + 1.4, B.neck.d / 2 + 0.9]} />
            <Plane size={[6.4, tieF.len]} canvas={tieF.blade} painted={painted} position={[0, L.top - tieF.len / 2, t.d / 2 + 0.12]} />
            <Box size={[3, 0.5, t.d / 2 - B.neck.d / 2]} faces={tieF.knot} painted={painted} position={[0, L.top + 0.25, (t.d / 2 + B.neck.d / 2) / 2 + 0.2]} />
          </group>
        )}
        {invested && !tie && !VL?.bowTie && (
          <group>
            {N.split ? (
              [1, -1].map((s) => (
                <Box key={`rb${s}`} size={[N.outer / 2, N.rollH, N.rollT]} faces={N.roll.back[s]} painted={painted} position={[(s * N.outer) / 4, L.top + N.rollH / 2, -(N.inner / 2 + N.rollT / 2)]} />
              ))
            ) : (
              <Box size={[N.outer, N.rollH, N.rollT]} faces={N.roll.back} painted={painted} position={[0, L.top + N.rollH / 2, -(N.inner / 2 + N.rollT / 2)]} />
            )}
            {[1, -1].map((s) => (
              <Box key={s} size={[N.rollT, N.rollH, N.inner + N.rollT + 1.2]} faces={N.roll.side[s]} painted={painted} position={[s * (N.inner / 2 + N.rollT / 2), L.top + N.rollH / 2, 0.6]} />
            ))}
            {[1, -1].map((s) => (
              <group key={s}>
                <Plane size={[N.tail.w, N.len + 1]} canvas={N.upperC[s]} painted={painted} position={[s * (N.a[0] + N.b[0]) / 2, (N.a[1] + N.b[1]) / 2, N.front + 0.35 + (s > 0 ? 0.08 : 0)]} rotation={[0, 0, -s * N.ang]} />
                <Plane size={[N.tail.w, N.tail.len]} canvas={N.lowerC[s]} painted={painted} position={[s * N.tail.x, N.tail.top - N.tail.len / 2, N.tailZ(s)]} />
              </group>
            ))}
            {gilwellWog ? (
              <Box size={GILWELL_WOG} faces={wogFaces} painted={painted} position={[0, N.wogY, N.front + 1.5]} />
            ) : leather ? (
              <Box size={[8, 3, 1.4]} faces={wogFaces} painted={painted} position={[0, N.wogY, N.front + 1.2]} />
            ) : (
              <Box size={[8, 2.6, 1.2]} faces={wogFaces} painted={painted} position={[0, N.wogY, N.front + 1.1]} />
            )}
            <Plane size={[N.back.w, N.back.h]} canvas={N.backC} painted={painted} position={[0, N.back.top - N.back.h / 2, N.back.z]} rotation={[0, Math.PI, 0]} />
            {LN?.necker === 'association' && (
              <TipDecal file={HK_BADGE} w={3} h={4.2} painted={painted} position={[0, N.back.top - N.back.h + 2.6 + 2.1, N.back.z - 0.05]} />
            )}
            {LN?.necker === 'gilwell' && (
              <TipDecal file={GILWELL_TARTAN} w={3} h={2} painted={painted} position={[0, N.back.top - N.back.h + 2.4 + 1, N.back.z - 0.05]} />
            )}
          </group>
        )}
        {wood && <WoodBadge {...wood} painted={painted} />}
      </group>
    </group>
  );
}

export { PX };
