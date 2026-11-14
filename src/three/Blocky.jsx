// 方塊人（真實比例；小童軍 / 幼童軍）— v1.0 · © SCOUT SYSTEM
// 全部由程式畫，唔使下載模型。單位：厘米，整個人縮放 0.01 變米。
// 人物面向 +z；穿著者左 = +x。
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { layout, neckerLayout, VEST_T, PX } from './body.js';
import { useTexture } from '@react-three/drei';
import { SECTIONS, DISTRICTS } from '../data/rules.js';
import { resolveArt } from '../lib/picks.js';
import { placeAll, placeFor, visible, dynKey } from './badgeLayout.js';
import { useBadgeTextures, useDynamicTextures, TorsoBadges, SleeveBadges } from './Badges.jsx';
import {
  headFaces, pigtailFaces, neckFaces, torsoFaces, sleeveFaces, cuffFaces, skinFaces, handFaces, legFaces, shortsFaces, shinFaces,
  shoeFaces, vestFaces, hatFaces, brimFaces, shirtPalette, rollFaces, tailCanvas, backTriangleCanvas, plain, material, wogglePaint,
  cubTorsoFaces, cubShinFaces, cubCapFaces,
} from './pixels.js';
import { COLOURS as C } from './body.js';

const CAP_BADGE = '/badges/cub_cap_badge.png';

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

const SHORTS_BOTTOM = 38; // 短褲腳離地（cm，膝頭上面）
const CUB_SHORTS_BOTTOM = { boy: 47, girl: 45 }; // 幼童軍短褲／裙褲腳離地
const CUB_SOCK_H = 34; // 長襪到膝頭下
const SOCK_H = { short: 6, long: 25 }; // 襪由腳底量起（短襪過腳眼；長襪到膝頭下）

export default function Blocky({ section = 'grasshopper', outfit, badges = {}, picks = {}, selected = null, onSelect, registry }) {
  const RULES = SECTIONS[section] ?? SECTIONS.grasshopper;
  const cub = section === 'cub';
  const gender = outfit.gender === 'girl' ? 'girl' : 'boy';
  const painted = outfit.finish !== 'unpainted';
  const L = useMemo(() => layout(gender, section), [gender, section]);
  const { B } = L;
  const top = cub ? 'cub' : outfit.top ?? 'orange';
  const topColour = outfit.topColour ?? '#ffffff';
  const long = !cub && outfit.sleeves === 'long';
  const vest = !cub && !!outfit.vest;
  const shorts = cub || outfit.legwear === 'shorts';
  const legColour = cub ? C.cubGreen : outfit.legColour ?? '#8a9099';
  const shortsBottom = cub ? CUB_SHORTS_BOTTOM[gender] : SHORTS_BOTTOM;
  const culottes = cub && gender === 'girl';

  // 徽章：位置全部由規則 JSON 計出嚟（學校運動上衣、背心會改位）；區章、地域章、優異旅團章圖案跟用戶揀
  const staticUrls = useMemo(() => placeAll(RULES, gender).map((p) => p.art).filter((a) => a && !a.startsWith('dyn:')), [RULES, gender]);
  const fixed = useBadgeTextures(staticUrls);
  const dynArts = useMemo(() => {
    const o = {};
    for (const b of RULES.badges) if (b.dynamic) o[dynKey(b.id)] = resolveArt(b, picks, DISTRICTS);
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
    torso: cub ? cubTorsoFaces(B, { legColour }) : torsoFaces(B, top, topColour),
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
      shin: cub ? cubShinFaces(shinSize, CUB_SOCK_H - B.leg.y) : shinFaces(shinSize, SOCK_H[outfit.socks] ?? SOCK_H.short, outfit.sockColour ?? '#ffffff'),
      shinSize,
      shinH,
    };
  }, [B, body.legH, legColour, outfit.socks, outfit.sockColour, shortsBottom, culottes, cub]);

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

  const wogFaces = useMemo(() => wogglePaint([8, 2.6, 1.2], outfit.woggle), [outfit.woggle]);

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
        {cub && outfit.hat && outfit.invested && <CubHat B={B} girl={gender === 'girl'} painted={painted} />}
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
            <Box size={[8, 2.6, 1.2]} faces={wogFaces} painted={painted} position={[0, N.wogY, N.front + 1.1]} />
            <Plane size={[N.back.w, N.back.h]} canvas={N.backC} painted={painted} position={[0, N.back.top - N.back.h / 2, N.back.z]} rotation={[0, Math.PI, 0]} />
          </group>
        )}
      </group>
    </group>
  );
}

export { PX };
