// 方塊人（真實比例；小童軍 / 幼童軍 / 童軍）— v1.0 · © SCOUT SYSTEM
// 全部由程式畫，唔使下載模型。單位：厘米，整個人縮放 0.01 變米。
// 人物面向 +z；穿著者左 = +x。
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { layout, neckerLayout, strapLayout, dressLayout, VEST_T, SWEATER_TOP, PX, scoutVariant, SCOUT_VARIANTS, ventureVariant, roverVariant, leaderVariant, isSenior, ventureLegwear, leaderLegwear, pumpParts } from './body.js';
import { useTexture } from '@react-three/drei';
import { SECTIONS, DISTRICTS, PATROLS } from '../data/rules.js';
import { resolveArt, rankCap, leaderNeckwear, messCapOf } from '../lib/picks.js';
import { placeAll, placeFor, visible, dynKey } from './badgeLayout.js';
import { useBadgeTextures, useDynamicTextures, TorsoBadges, SleeveBadges } from './Badges.jsx';
import {
  headFaces, pigtailFaces, neckFaces, torsoFaces, sleeveFaces, cuffFaces, skinFaces, handFaces, legFaces, shortsFaces, shinFaces,
  shoeFaces, skirtFaces, vestFaces, hatFaces, brimFaces, shirtPalette, rollFaces, tailCanvas, backTriangleCanvas, plain, material, wogglePaint,
  cubTorsoFaces, cubShinFaces, cubCapFaces, scoutWogglePaint, seaCapFaces, shade, brighten, sweaterFaces, sweaterSleeveFaces, sweaterCuffFaces, tieCanvas,
  gilwellWogglePaint, hardHatFaces, dressJacketFaces, messJacketFaces, messTrouserFaces,
} from './pixels.js';
import { COLOURS as C } from './body.js';

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

function Box({ size, faces, painted, position, rotation, alpha = false }) {
  const mats = useMemo(() => faces.map((c) => material(c, { painted, alpha })), [faces, painted, alpha]);
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

/** 一隻手：膊頭做支點。長袖 = 上袖一直落到手踭，再加前臂袖 */
function Arm({ L, side, painted, faces, long, children }) {
  const { B } = L;
  const s = side === 'l' ? 1 : -1;
  const seam = L.top - L.shoulderY; // 肩膊縫線（相對支點）
  const len = long ? seam + B.upperArm.h : B.sleeve.len;
  const sl = [B.sleeve.w, len, B.sleeve.d];
  const cuff = [B.lowerArm.w + 1, B.lowerArm.h, B.lowerArm.d + 1.4];
  return (
    <group position={[s * L.armX, L.shoulderY, 0]} rotation={[0, 0, s * 0.045]}>
      <Box size={[B.upperArm.w, B.upperArm.h, B.upperArm.d]} faces={faces.upper} painted={painted} position={[0, -B.upperArm.h / 2, 0]} />
      <Box size={sl} faces={long ? faces.sleeveLong : faces.sleeve} painted={painted} position={[0, seam - len / 2, 0]} />
      <group position={[0, -B.upperArm.h, 0]}>
        {long ? (
          <Box size={cuff} faces={faces.cuff} painted={painted} position={[0, -B.lowerArm.h / 2, 0]} />
        ) : (
          <Box size={[B.lowerArm.w, B.lowerArm.h, B.lowerArm.d]} faces={faces.lower} painted={painted} position={[0, -B.lowerArm.h / 2, 0]} />
        )}
        <Box size={[B.hand.w, B.hand.h, B.hand.d]} faces={faces.hand} painted={painted} position={[0, -B.lowerArm.h - B.hand.h / 2, 0]} />
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
      <Box size={crown} faces={faces.crownF} painted={painted} position={[0, base + crown[1] / 2, h.z]} />
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
      <Box size={crown} faces={F.crownF} painted={painted} position={[0, base + crown[1] / 2, h.z]} />
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
 * 金屬帽章戴喺膠邊、左眼（+x）上方。方塊造型只係示意。
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
  return (
    <group>
      <Box size={band} faces={F.bandF} painted={painted} position={[0, bandY, h.z]} />
      <group position={[-2, bandY + 1 + crown[1] / 2 - 0.2, h.z - 0.5]} rotation={[-0.06, 0, 0.16]}>
        <Box size={crown} faces={F.crownF} painted={painted} position={[0, 0, 0]} />
        <Box size={[1.2, 0.8, 1.2]} faces={F.knob} painted={painted} position={[1.5, crown[1] / 2 + 0.4, 0]} />
      </group>
      {cap ? (
        <RankCapBadge tex={badgeTex} painted={painted} position={[eyeX, bandY - 1.2, h.z + crown[2] / 2 + 0.75]} />
      ) : (
        <mesh position={[eyeX, bandY, h.z + band[2] / 2 + 0.08]}>
          <circleGeometry args={[1.4, 32]} />
          <meshStandardMaterial map={painted ? badgeTex : null} color={painted ? '#f2f2f2' : '#b4b6b9'} transparent alphaTest={0.3} roughness={0.35} metalness={0.4} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      )}
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
 * 木章（手冊 P.115–117）：皮繩連木珠。皮繩由頸兩邊（top）落到胸前（end），木珠喺 end 下面吊住；
 * 兩邊分木珠（2 顆 = 每邊 1 顆；3 顆 = 左 2 右 1；4 顆 = 每邊 2 顆）。頸後嗰段藏喺領巾下面，唔使畫。
 */
function WoodBadge({ top, end, beads, painted }) {
  const F = useMemo(
    () => ({ thong: [0, 1, 2, 3, 4, 5].map(() => plain(1, 1, C.thong)), bead: hatFaces([1.2, 3, 1.2], C.woodBead) }),
    [],
  );
  const perSide = { 1: Math.ceil(beads / 2), [-1]: Math.floor(beads / 2) };
  return (
    <group>
      {[1, -1].map((s) => {
        const dx = s * (top.x - end.x);
        const dy = top.y - end.y;
        const len = Math.hypot(dx, dy);
        const n = perSide[s];
        return (
          <group key={s}>
            <Box size={[0.5, len, 0.4]} faces={F.thong} painted={painted} position={[s * (top.x + end.x) / 2, (top.y + end.y) / 2, (top.z + end.z) / 2]} rotation={[0, 0, Math.atan2(-dx, dy)]} />
            {Array.from({ length: n }, (_, i) => (
              <Box key={i} size={[1.2, 3, 1.2]} faces={F.bead} painted={painted} position={[s * end.x + (i - (n - 1) / 2) * 1.4, end.y - 1.7, end.z + 0.3]} />
            ))}
          </group>
        );
      })}
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
        <Box size={[h.w + 1.4, 6.5, h.d + 1.4]} faces={F.crownG} painted={painted} position={[0, base + 3.25, h.z]} />
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
 * 嘉許笛繩（手冊 P.184、P.188–189）：由左肩肩帶下面出嚟，吊落再兜返上左胸袋口（笛子由胸袋口右方放入，唔畫）；
 * 晚禮服小型笛繩幼一半、去到左襟領。points = 繩經過嘅點（cm），colours = 一條或兩條繩嘅顏色。可以撳嚟揀。
 */
function Lanyard({ p, points, colours, thick, painted, selected, onSelect, registry }) {
  const ref = useRef();
  useEffect(() => {
    if (!registry || !ref.current) return undefined;
    registry.set(p.key, ref.current);
    return () => registry.delete(p.key);
  }, [registry, p.key]);
  const segs = points.slice(1).map((b, i) => {
    const a = points[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], len: Math.hypot(dx, dy, b[2] - a[2]) + thick, rot: Math.atan2(-dx, dy) };
  });
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(p.id);
      }}
    >
      {segs.map((sg, i) =>
        colours.map((c, j) => (
          <mesh key={`${i}-${j}`} ref={i === 0 && j === 0 ? ref : undefined} position={[sg.pos[0] + (j - (colours.length - 1) / 2) * thick, sg.pos[1], sg.pos[2]]} rotation={[0, 0, sg.rot]} castShadow>
            <boxGeometry args={[thick, sg.len, thick]} />
            <meshStandardMaterial color={painted ? (selected ? '#f2791c' : c) : '#a3a6aa'} roughness={0.6} />
          </mesh>
        )),
      )}
    </group>
  );
}
const LANYARD_COLOURS = { commendation: ['#d98b1e'], high: ['#27346f', '#b9c94a'] }; // 手冊 P.184 相片顏色

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
    ? leaderVariant(['u1', 'u2'].includes(outfit.uniform) ? 'land' : outfit.variant) // 禮服／晚禮服只有陸上款（手冊 P.57–62）
    : section === 'rover'
    ? roverVariant(outfit.variant)
    : venture
    ? ventureVariant(outfit.variant)
    : SCOUT_VARIANTS.land;
  // 成年成員一律當已宣誓（冇未宣誓狀態）
  const invested = leader ? true : outfit.invested;
  const gender = outfit.gender === 'girl' ? 'girl' : 'boy';
  const painted = outfit.finish !== 'unpainted';
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
  const neckerMain = LN ? (LN.necker === 'association' ? C.assocNecker : LN.necker === 'gilwell' ? C.gilwellNecker : outfit.neckerMain) : outfit.neckerMain;
  const neckerBorder = LN ? (LN.necker === 'association' ? C.assocNecker : LN.necker === 'gilwell' ? C.gilwellNecker : outfit.neckerBorder) : outfit.neckerBorder;

  // 徽章：位置全部由規則 JSON 計出嚟（學校運動上衣、背心會改位）；區章、地域章、優異旅團章圖案跟用戶揀
  const staticUrls = useMemo(() => placeAll(RULES, gender).map((p) => p.art).filter((a) => a && !a.startsWith('dyn:')), [RULES, gender]);
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
  const shown = useMemo(
    () => visible(all, badges, { invested, school: outfit.school, unavailable, level: leader ? picks.level : null }),
    [all, badges, invested, outfit.school, unavailable, leader, picks.level],
  );
  const patchProps = { textures, painted, onSelect, registry };
  const torsoItems = shown.filter((p) => p.mount === 'torso');
  const armItems = (side) => shown.filter((p) => p.mount === side);
  const seamY = L.top - L.shoulderY;
  // 嘉許笛繩：左肩肩帶下面 → 吊落 → 左胸袋口（禮服、恤衫）；晚禮服小型笛繩去到左襟領
  const lanyards = useMemo(() => {
    if (!strap) return [];
    return shown
      .filter((p) => p.kind === 'lanyard')
      .map((p) => {
        const z = p.z + 0.3;
        const A = [strap.inner + 2.6, strap.base - 0.2, z - 0.15];
        let points;
        if (p.mini && D?.fleur) {
          points = [A, [D.fleur.x + 2.2, D.fleur.y - 1.5, z], [D.fleur.x + 0.4, D.fleur.y - 3.5, z]];
        } else {
          const P = B.pocket;
          const flapTop = L.top - P.top;
          points = [A, [P.x + 1.5, flapTop - 6, z], [P.x - P.w / 2 + 1.5, flapTop + 0.1, z]];
        }
        return { p, points, colours: LANYARD_COLOURS[p.choice] ?? LANYARD_COLOURS.commendation, thick: p.mini ? 0.3 : 0.55 };
      });
  }, [shown, strap, D, B, L]);

  // 身體貼圖
  const body = useMemo(() => {
    const sl = [B.sleeve.w, B.sleeve.len, B.sleeve.d];
    const slLong = [B.sleeve.w, L.top - L.shoulderY + B.upperArm.h, B.sleeve.d];
    const legH = B.leg.top - B.leg.y;
    return {
      head: headFaces(B),
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
  }, [B, L, cub, skirt, dress]);

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
    return {
      ...G,
      roll: {
        back: rollFaces([G.outer, G.rollH, G.rollT], neckerMain, neckerBorder),
        side: rollFaces([G.rollT, G.rollH, G.inner + G.rollT + 1.2], neckerMain, neckerBorder),
      },
      upperC: tailCanvas(G.tail.w, G.len + 1, neckerMain, neckerBorder, 0),
      lowerC: tailCanvas(G.tail.w, G.tail.len, neckerMain, neckerBorder, G.tail.tip),
      backC: backTriangleCanvas(G.back.w, G.back.h, neckerMain, neckerBorder),
    };
  }, [L, vest, sweater, neckerMain, neckerBorder]);

  // 童軍：啡色皮巾圈（手冊 P.110）；其他支部：顏色巾圈
  const gilwellWog = !!LN?.gilwellWoggle;
  const wogFaces = useMemo(
    () => (gilwellWog ? gilwellWogglePaint(GILWELL_WOG, { trainer: LN.trainer }) : leather ? scoutWogglePaint([8, 3, 1.4]) : wogglePaint([8, 2.6, 1.2], outfit.woggle)),
    [outfit.woggle, leather, gilwellWog, LN?.trainer], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // 木章（手冊 P.116–117）：皮繩由頸兩邊落到胸前，木珠掛喺領巾（或者領帶）前面
  const wood = useMemo(() => {
    if (!LN?.woodBadge || !invested) return null;
    const N0 = neckerLayout(L);
    const out = dress ? VEST_T : 0; // 禮服：掛喺外套 V 位前面
    const top = tie
      ? { x: B.neck.w / 2 + 1.9, y: L.top + 0.2 + out, z: B.torso.d / 2 + 0.7 + out } // 領帶：皮繩由衣領兩邊落（唔好穿入身）
      : { x: N0.outer / 2 - 0.8, y: L.top + N0.rollH - 0.2, z: N0.front + 0.6 };
    const end = tie ? { x: 4.6, y: L.top - 13, z: B.torso.d / 2 + 0.7 + out } : { x: 5.4, y: N0.wogY - 4, z: N0.front + 0.9 };
    return { top, end, beads: LN.beads };
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
        <Box size={[h.w, h.h, h.d]} faces={body.head} painted={painted} position={[0, h.y + h.h / 2, h.z]} />
        {B.hair === 'pigtails' &&
          [1, -1].map((s) => (
            <Box key={s} size={[4.5, 12, 4.5]} faces={body.pigtail} painted={painted} position={[s * (h.w / 2 + 1.6), h.y + 5, -4.5]} rotation={[0.15, 0, s * 0.12]} />
          ))}
        {!cub && outfit.hat && outfit.hat !== 'none' && <Hat B={B} kind={outfit.hat} colour={outfit.hatColour ?? '#1f2f4f'} painted={painted} />}
        {section === 'cub' && outfit.hat && outfit.invested && <CubHat B={B} girl={gender === 'girl'} painted={painted} />}
        {scout && outfit.hat && outfit.invested && (U.hat === 'sea' ? <SeaCap B={B} painted={painted} /> : <ScoutBeret B={B} painted={painted} colour={U.beret} />)}
        {venture && !leader && outfit.hat && outfit.invested && (U.hat === 'seaLeader' ? <SeaLeaderCap B={B} girl={gender === 'girl'} painted={painted} /> : <ScoutBeret B={B} painted={painted} colour={U.beret} />)}
        {leader && outfit.hat && hatInfo.kind === 'sea' && <SeaLeaderCap B={B} girl={gender === 'girl'} painted={painted} badge={SEA_LEADER_CAP_BADGE} />}
        {leader && outfit.hat && hatInfo.kind === 'hardHat' && hatInfo.cap && <HardHat B={B} painted={painted} cap={hatInfo.cap} />}
        {leader && outfit.hat && hatInfo.kind === 'beret' && <ScoutBeret B={B} painted={painted} colour={hatInfo.colour} cap={hatInfo.cap} />}
        {leader && outfit.hat && hatInfo.kind === 'mess' && <MessCap B={B} girl={gender === 'girl'} painted={painted} cap={hatInfo.cap} />}
        <Box size={[B.neck.w, B.neck.h, B.neck.d]} faces={body.neck} painted={painted} position={[0, B.neck.y + B.neck.h / 2, 0]} />
        {/* 上身 */}
        <Box size={[t.w, t.h, t.d]} faces={shirt.torso} painted={painted} position={[0, t.y + t.h / 2, 0]} />
        {strap &&
          [1, -1].map((s) => <Box key={`strap${s}`} size={[strap.len, strap.boxT, strap.w]} faces={strapF} painted={painted} position={[s * strap.cx, strap.boxY, 0]} />)}
        {sweater && <Box size={vestBox} faces={sweaterF} painted={painted} alpha position={[0, t.y - 1 + vestBox[1] / 2, 0]} />}
        {D && dressF && <Box size={[D.w, D.h, D.d]} faces={dressF} painted={painted} alpha position={[0, D.bottom + D.h / 2, 0]} />}
        {D?.fleur && [1, -1].map((s) => <FrontDecal key={`fleur${s}`} file={LAPEL_FLEUR} size={D.fleur.size} painted={painted} position={[s * D.fleur.x, D.fleur.y, D.front + 0.08]} />)}
        {leader && VL.bowTie && <BowTie y={L.top + SWEATER_TOP + 1.6} z={B.neck.d / 2 + 0.7} girl={gender === 'girl'} painted={painted} />}
        {lanyards.map((q) => (
          <Lanyard key={q.p.key} p={q.p} points={q.points} colours={q.colours} thick={q.thick} painted={painted} selected={selected === q.p.id} onSelect={onSelect} registry={registry} />
        ))}
        {vest && <Box size={vestBox} faces={vestF} painted={painted} alpha position={[0, t.y - 1 + vestBox[1] / 2, 0]} />}
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
              <SleeveBadges key={p.key} items={[p]} side={side} sleeveW={B.sleeve.w} sleeveD={B.sleeve.d} seamY={seamY} selected={selected === p.id} {...patchProps} />
            ))}
          </Arm>
        ))}
        {torsoItems.map((p) => (
          <TorsoBadges key={p.key} items={[p]} selected={selected === p.id} {...patchProps} />
        ))}
        {/* 褲、襪、鞋 */}
        {[1, -1].map((s) => (
          <group key={s}>
            {venture && skirt ? (
              <Box size={[B.leg.w - 1, legs.shinH + 2, B.leg.d - 1]} faces={legs.tightsF} painted={painted} position={[s * L.legX, B.leg.y + (legs.shinH + 2) / 2, 0]} />
            ) : shorts ? (
              <>
                <Box size={legs.shortsSize} faces={legs.shorts} painted={painted} position={[s * (L.legX + (culottes ? 0.4 : 0)), (shortsBottom + B.leg.top) / 2, 0]} />
                <Box size={legs.shinSize} faces={legs.shin} painted={painted} position={[s * L.legX, B.leg.y + legs.shinH / 2, 0]} />
              </>
            ) : (
              <Box size={[B.leg.w, body.legH, B.leg.d]} faces={legs.trousers} painted={painted} position={[s * L.legX, (B.leg.y + B.leg.top) / 2, 0]} />
            )}
            {body.pump ? (
              <group position={[s * L.legX, 0, B.shoe.z]}>
                {body.pump.map((q) => (
                  <Box key={q.part} size={q.size} faces={body.pumpF[q.kind]} painted={painted} position={q.pos} rotation={q.rot} />
                ))}
              </group>
            ) : (
              <Box size={[B.shoe.w, B.shoe.h, B.shoe.d]} faces={body.shoe} painted={painted} position={[s * L.legX, B.shoe.h / 2, B.shoe.z]} />
            )}
          </group>
        ))}
        {venture && skirt && <Box size={legs.skirtSize} faces={legs.skirtF} painted={painted} position={[0, (shortsBottom + B.leg.top) / 2, 0]} />}
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
            <Box size={[N.outer, N.rollH, N.rollT]} faces={N.roll.back} painted={painted} position={[0, L.top + N.rollH / 2, -(N.inner / 2 + N.rollT / 2)]} />
            {[1, -1].map((s) => (
              <Box key={s} size={[N.rollT, N.rollH, N.inner + N.rollT + 1.2]} faces={N.roll.side} painted={painted} position={[s * (N.inner / 2 + N.rollT / 2), L.top + N.rollH / 2, 0.6]} />
            ))}
            {[1, -1].map((s) => (
              <group key={s}>
                <Plane size={[N.tail.w, N.len + 1]} canvas={N.upperC} painted={painted} position={[s * (N.a[0] + N.b[0]) / 2, (N.a[1] + N.b[1]) / 2, N.front + 0.35 + (s > 0 ? 0.08 : 0)]} rotation={[0, 0, -s * N.ang]} />
                <Plane size={[N.tail.w, N.tail.len]} canvas={N.lowerC} painted={painted} position={[s * N.tail.x, N.tail.top - N.tail.len / 2, N.tailZ(s)]} />
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
