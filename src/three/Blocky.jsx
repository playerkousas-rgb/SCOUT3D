// 方塊人（真實比例；小童軍 / 幼童軍 / 童軍）— v1.0 · © SCOUT SYSTEM
// 全部由程式畫，唔使下載模型。單位：厘米，整個人縮放 0.01 變米。
// 人物面向 +z；穿著者左 = +x。
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { layout, neckerLayout, VEST_T, PX, scoutVariant, SCOUT_VARIANTS } from './body.js';
import { useTexture } from '@react-three/drei';
import { SECTIONS, DISTRICTS, PATROLS } from '../data/rules.js';
import { resolveArt } from '../lib/picks.js';
import { placeAll, placeFor, visible, dynKey } from './badgeLayout.js';
import { useBadgeTextures, useDynamicTextures, TorsoBadges, SleeveBadges } from './Badges.jsx';
import {
  headFaces, pigtailFaces, neckFaces, torsoFaces, sleeveFaces, cuffFaces, skinFaces, handFaces, legFaces, shortsFaces, shinFaces,
  shoeFaces, vestFaces, hatFaces, brimFaces, shirtPalette, rollFaces, tailCanvas, backTriangleCanvas, plain, material, wogglePaint,
  cubTorsoFaces, cubShinFaces, cubCapFaces, scoutWogglePaint, seaCapFaces,
} from './pixels.js';
import { COLOURS as C } from './body.js';

const CAP_BADGE = '/badges/cub_cap_badge.png';
const SCOUT_CAP_BADGE = '/badges/scout_cap_badge.png';
const SEA_TALLY = '/badges/sea_scout_cap_tally.png';

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
function ScoutBeret({ B, painted, colour = C.beret }) {
  const h = B.head;
  const headTop = h.y + h.h;
  const browY = headTop - 7.5; // pixels.js headFaces：眉毛離頭頂 7.5 cm
  const bandY = browY + 2 + 1; // 膠邊底離眉 2 cm，膠邊高 2 cm
  const badgeTex = useTexture(SCOUT_CAP_BADGE);
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
      <mesh position={[eyeX, bandY, h.z + band[2] / 2 + 0.08]}>
        <circleGeometry args={[1.4, 32]} />
        <meshStandardMaterial map={painted ? badgeTex : null} color={painted ? '#f2f2f2' : '#b4b6b9'} transparent alphaTest={0.3} roughness={0.35} metalness={0.4} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
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

const SHORTS_BOTTOM = 38; // 短褲腳離地（cm，膝頭上面）
const BEIGE_SHORTS_BOTTOM = { cub: { boy: 47, girl: 45 }, scout: { boy: 54, girl: 52 } }; // 幼童軍／童軍短褲、裙褲腳離地
const BEIGE_SOCK_H = { cub: 34, scout: 40 }; // 長襪到膝頭下
const SOCK_H = { short: 6, long: 25 }; // 襪由腳底量起（短襪過腳眼；長襪到膝頭下）

export default function Blocky({ section = 'grasshopper', outfit, badges = {}, picks = {}, selected = null, onSelect, registry }) {
  const RULES = SECTIONS[section] ?? SECTIONS.grasshopper;
  // 幼童軍同童軍：同款杏色恤衫、草青色短褲／裙褲、深草青色長襪（手冊 P.28、P.30）
  const cub = section === 'cub' || section === 'scout';
  const scout = section === 'scout';
  // 童軍支部制服款式：童軍／海童軍／空童軍（手冊 P.30–35）；幼童軍同陸上童軍同色
  const U = scout ? scoutVariant(outfit.variant) : SCOUT_VARIANTS.land;
  const gender = outfit.gender === 'girl' ? 'girl' : 'boy';
  const painted = outfit.finish !== 'unpainted';
  const L = useMemo(() => layout(gender, section), [gender, section]);
  const { B } = L;
  const top = cub ? 'cub' : outfit.top ?? 'orange';
  const topColour = cub ? U.shirt : outfit.topColour ?? '#ffffff';
  const long = !cub && outfit.sleeves === 'long';
  const vest = !cub && !!outfit.vest;
  const shorts = cub || outfit.legwear === 'shorts';
  const legColour = cub ? U.leg : outfit.legColour ?? '#8a9099';
  const shortsBottom = cub ? BEIGE_SHORTS_BOTTOM[section][gender] : SHORTS_BOTTOM;
  const culottes = cub && gender === 'girl';

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
    () => visible(all, badges, { invested: outfit.invested, school: outfit.school, unavailable }),
    [all, badges, outfit.invested, outfit.school, unavailable],
  );
  const patchProps = { textures, painted, onSelect, registry };
  const torsoItems = shown.filter((p) => p.mount === 'torso');
  const armItems = (side) => shown.filter((p) => p.mount === side);
  const seamY = L.top - L.shoulderY;

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
      shoe: cub ? shoeFaces([B.shoe.w, B.shoe.h, B.shoe.d], { colour: C.shoeBlack, sole: C.soleBlack, lace: '#3a3a40' }) : shoeFaces([B.shoe.w, B.shoe.h, B.shoe.d]),
      sl,
      slLong,
    };
  }, [B, L, cub]);

  // 衫（跟款式、顏色、袖長變）
  const shirt = useMemo(() => ({
    torso: cub ? cubTorsoFaces(B, { legColour, shirt: topColour }) : torsoFaces(B, top, topColour),
    sleeve: sleeveFaces(body.sl, B.sleeve.band, top, topColour, false),
    sleeveLong: sleeveFaces(body.slLong, B.sleeve.band, top, topColour, true),
    cuff: cuffFaces([B.lowerArm.w + 1, B.lowerArm.h, B.lowerArm.d + 1.4], top, topColour),
    collar: [1, 1, 1, 1, 1, 1].map(() => plain(2, 2, shirtPalette(top, topColour).collar)),
  }), [B, body, top, topColour, cub, legColour]);
  const armFaces = useMemo(() => ({ ...body.arm, ...shirt }), [body, shirt]);

  // 褲、襪
  const legs = useMemo(() => {
    const shinH = shortsBottom - B.leg.y;
    const grow = culottes ? 1.8 : 0.6; // 裙褲闊啲
    const shortsSize = [B.leg.w + grow, B.leg.top - shortsBottom, B.leg.d + grow];
    const shinSize = [B.leg.w - 1.4, shinH, B.leg.d - 1.4];
    return {
      trousers: legFaces([B.leg.w, body.legH, B.leg.d], legColour),
      shorts: shortsFaces(shortsSize, legColour),
      shortsSize,
      shin: cub ? cubShinFaces(shinSize, BEIGE_SOCK_H[section] - B.leg.y, U.sock) : shinFaces(shinSize, SOCK_H[outfit.socks] ?? SOCK_H.short, outfit.sockColour ?? '#ffffff'),
      shinSize,
      shinH,
    };
  }, [B, body.legH, legColour, outfit.socks, outfit.sockColour, shortsBottom, culottes, cub, section, U.sock]);

  // 背心
  const t = B.torso, h = B.head;
  const vestBox = [t.w + VEST_T * 2, t.h + 1.5, t.d + VEST_T * 2];
  const vestF = useMemo(() => (vest ? vestFaces(vestBox, outfit.vestColour ?? '#1f2f4f', B.neck.w) : null), [vest, outfit.vestColour, B, t.w]); // eslint-disable-line react-hooks/exhaustive-deps

  // 旅巾（跟顏色、背心變）
  const N = useMemo(() => {
    const G = neckerLayout(L, { vest });
    return {
      ...G,
      roll: {
        back: rollFaces([G.outer, G.rollH, G.rollT], outfit.neckerMain, outfit.neckerBorder),
        side: rollFaces([G.rollT, G.rollH, G.inner + G.rollT + 1.2], outfit.neckerMain, outfit.neckerBorder),
      },
      upperC: tailCanvas(G.tail.w, G.len + 1, outfit.neckerMain, outfit.neckerBorder, 0),
      lowerC: tailCanvas(G.tail.w, G.tail.len, outfit.neckerMain, outfit.neckerBorder, G.tail.tip),
      backC: backTriangleCanvas(G.back.w, G.back.h, outfit.neckerMain, outfit.neckerBorder),
    };
  }, [L, vest, outfit.neckerMain, outfit.neckerBorder]);

  // 童軍：啡色皮巾圈（手冊 P.110）；其他支部：顏色巾圈
  const wogFaces = useMemo(() => (scout ? scoutWogglePaint([8, 3, 1.4]) : wogglePaint([8, 2.6, 1.2], outfit.woggle)), [outfit.woggle, scout]);

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
        {cub && !scout && outfit.hat && outfit.invested && <CubHat B={B} girl={gender === 'girl'} painted={painted} />}
        {scout && outfit.hat && outfit.invested && (U.hat === 'sea' ? <SeaCap B={B} painted={painted} /> : <ScoutBeret B={B} painted={painted} colour={U.beret} />)}
        <Box size={[B.neck.w, B.neck.h, B.neck.d]} faces={body.neck} painted={painted} position={[0, B.neck.y + B.neck.h / 2, 0]} />
        {/* 上身 */}
        <Box size={[t.w, t.h, t.d]} faces={shirt.torso} painted={painted} position={[0, t.y + t.h / 2, 0]} />
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
              <SleeveBadges key={p.key} items={[p]} side={side} sleeveW={B.sleeve.w} seamY={seamY} selected={selected === p.id} {...patchProps} />
            ))}
          </Arm>
        ))}
        {torsoItems.map((p) => (
          <TorsoBadges key={p.key} items={[p]} selected={selected === p.id} {...patchProps} />
        ))}
        {/* 褲、襪、鞋 */}
        {[1, -1].map((s) => (
          <group key={s}>
            {shorts ? (
              <>
                <Box size={legs.shortsSize} faces={legs.shorts} painted={painted} position={[s * (L.legX + (culottes ? 0.4 : 0)), (shortsBottom + B.leg.top) / 2, 0]} />
                <Box size={legs.shinSize} faces={legs.shin} painted={painted} position={[s * L.legX, B.leg.y + legs.shinH / 2, 0]} />
              </>
            ) : (
              <Box size={[B.leg.w, body.legH, B.leg.d]} faces={legs.trousers} painted={painted} position={[s * L.legX, (B.leg.y + B.leg.top) / 2, 0]} />
            )}
            <Box size={[B.shoe.w, B.shoe.h, B.shoe.d]} faces={body.shoe} painted={painted} position={[s * L.legX, B.shoe.h / 2, B.shoe.z]} />
          </group>
        ))}
        {/* 旅巾 + 巾圈（宣誓後先戴；戴喺衣領／背心外面） */}
        {outfit.invested && (
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
            {scout ? (
              <Box size={[8, 3, 1.4]} faces={wogFaces} painted={painted} position={[0, N.wogY, N.front + 1.2]} />
            ) : (
              <Box size={[8, 2.6, 1.2]} faces={wogFaces} painted={painted} position={[0, N.wogY, N.front + 1.1]} />
            )}
            <Plane size={[N.back.w, N.back.h]} canvas={N.backC} painted={painted} position={[0, N.back.top - N.back.h / 2, N.back.z]} rotation={[0, Math.PI, 0]} />
          </group>
        )}
      </group>
    </group>
  );
}

export { PX };
