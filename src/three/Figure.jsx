// 小童軍人物（程序生成公仔）— v1.0 · © SCOUT SYSTEM
// 座標：人物面向 +z；穿著者左 = +x。
import { useMemo } from 'react';
import * as THREE from 'three';
import { D, SLEEVE, CM } from './dims.js';
import {
  torsoGeometry,
  vestGeometry,
  sleeveGeometry,
  hipsGeometry,
  neckerBackGeometry,
  neckerTailGeometry,
  bucketHatGeometry,
} from './geometry.js';
import Badge, { Ring } from './Badge.jsx';
import { BADGE_TEXTURES, progressTexture, neckerTexture } from './textures.js';
import { badgeById } from '../data/rules.js';

export const SHIRT_ORANGE = '#f2791c';

const fabric = { roughness: 0.88, metalness: 0 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

function size(id) {
  const s = badgeById(id).size;
  return [s.wCm * CM, s.hCm * CM, s.shape];
}

/* ---------- 頭 ---------- */
function Head({ gender, skin, hair, hat, hatColour }) {
  const hy = D.headY;
  const r = D.headR;
  const bucket = useMemo(() => bucketHatGeometry(), []);
  return (
    <group>
      <mesh position={[0, D.neckY + 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.036, 0.04, 0.09, 20]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      <mesh position={[0, hy, 0]} scale={[1, 1.04, 0.98]} castShadow>
        <sphereGeometry args={[r, 40, 32]} />
        <meshStandardMaterial color={skin} roughness={0.65} />
      </mesh>
      {/* 耳 */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * r * 0.98, hy - 0.005, 0]} scale={[0.5, 1, 0.8]}>
          <sphereGeometry args={[0.024, 16, 12]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      ))}
      {/* 眼 */}
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.036, hy + 0.004, r * 0.93]}>
          <mesh scale={[1, 1.25, 0.6]}>
            <sphereGeometry args={[0.012, 16, 12]} />
            <meshStandardMaterial color="#2a1d17" roughness={0.3} />
          </mesh>
          <mesh position={[s * -0.003, 0.005, 0.006]}>
            <sphereGeometry args={[0.0035, 8, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {gender === 'girl' && (
            <mesh position={[s * 0.01, 0.012, 0.002]} rotation={[0, 0, s * -0.6]}>
              <boxGeometry args={[0.012, 0.0025, 0.003]} />
              <meshStandardMaterial color="#2a1d17" />
            </mesh>
          )}
        </group>
      ))}
      {/* 眉 */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.037, hy + 0.034, r * 0.9]} rotation={[-0.3, 0, s * 0.12]}>
          <boxGeometry args={[0.022, 0.004, 0.004]} />
          <meshStandardMaterial color={hair} />
        </mesh>
      ))}
      {/* 鼻、口、面珠 */}
      <mesh position={[0, hy - 0.016, r * 0.99]}>
        <sphereGeometry args={[0.008, 12, 10]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[0, hy - 0.04, r * 0.93]} rotation={[0.25, 0, Math.PI]}>
        <torusGeometry args={[0.016, 0.0035, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#9b3b33" />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.058, hy - 0.024, r * 0.8]} scale={[1, 0.7, 0.3]}>
          <sphereGeometry args={[0.016, 12, 10]} />
          <meshStandardMaterial color="#f29a8c" transparent opacity={0.55} roughness={0.9} />
        </mesh>
      ))}
      {/* 頭髮 */}
      <mesh position={[0, hy + 0.006, -0.006]} rotation={[-0.42, 0, 0]} castShadow>
        <sphereGeometry args={[r * 1.07, 40, 24, 0, Math.PI * 2, 0, gender === 'girl' ? 1.85 : 1.55]} />
        <meshStandardMaterial color={hair} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, hy + 0.06, 0.06]} rotation={[0.6, 0, 0]} scale={[1.6, 0.5, 0.7]}>
        <sphereGeometry args={[0.04, 16, 12]} />
        <meshStandardMaterial color={hair} roughness={0.75} />
      </mesh>
      {gender === 'girl' &&
        [1, -1].map((s) => (
          <group key={s} position={[s * 0.105, hy + 0.01, -0.03]}>
            <mesh position={[s * 0.02, -0.055, 0]} rotation={[0, 0, s * 0.25]} scale={[0.8, 1.5, 0.8]} castShadow>
              <sphereGeometry args={[0.035, 20, 16]} />
              <meshStandardMaterial color={hair} roughness={0.75} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.016, 0.007, 8, 16]} />
              <meshStandardMaterial color="#e94b6a" roughness={0.5} />
            </mesh>
          </group>
        ))}
      {/* 帽 */}
      {hat === 'bucket' && (
        <mesh geometry={bucket} position={[0, hy + 0.035, -0.004]} rotation={[-0.08, 0, 0]} castShadow>
          <meshStandardMaterial color={hatColour} {...fabric} side={THREE.DoubleSide} />
        </mesh>
      )}
      {hat === 'cap' && (
        <group position={[0, hy + 0.012, 0]} rotation={[-0.12, 0, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[r * 1.1, 40, 20, 0, Math.PI * 2, 0, 1.45]} />
            <meshStandardMaterial color={hatColour} {...fabric} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.012, 0.035]} rotation={[0.12, 0, 0]} scale={[1, 1, 1.05]}>
            <cylinderGeometry args={[0.11, 0.11, 0.006, 32, 1, false, -Math.PI / 2, Math.PI]} />
            <meshStandardMaterial color={hatColour} {...fabric} />
          </mesh>
          <mesh position={[0, r * 1.1, 0]}>
            <sphereGeometry args={[0.009, 10, 8]} />
            <meshStandardMaterial color={hatColour} {...fabric} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ---------- 旅巾 ---------- */
function Necker({ main, border, woggle, school, badges, selected, onSelect }) {
  const back = useMemo(() => neckerBackGeometry(), []);
  const tailL = useMemo(() => neckerTailGeometry('left'), []);
  const tailR = useMemo(() => neckerTailGeometry('right'), []);
  const tex = useMemo(() => neckerTexture(main, border), [main, border]);
  const mat = <meshStandardMaterial color={main} {...fabric} side={THREE.DoubleSide} />;
  const [mw, mh, mshape] = size('membership');
  const [pw, ph] = size('progress');
  const steps = badges.progress;
  // 學校運動上衣：進步章依左袖排列放喺巾尾末端（每條巾尾兩枚）——待確認
  const tailBadges = (side) =>
    [1, 2, 3, 4]
      .filter((st) => (side === 'left' ? st === 1 || st === 3 : st === 2 || st === 4))
      .map((st) => {
        const x = (side === 'left' ? 1 : -1) * 0.0175;
        const y = st <= 2 ? 0.708 : 0.708 + ph;
        return (
          <Badge
            key={st}
            regId={`progress-${st}`}
            selectId="progress"
            geometry={side === 'left' ? tailL : tailR}
            origin={V(x, y, 0.6)}
            dir={V(0, 0, -1)}
            up={UP}
            w={pw * 0.98}
            h={ph * 0.98}
            depth={0.02}
            shape="square"
            texture={progressTexture(st)}
            visible={school && st <= steps}
            selected={selected === 'progress'}
            ring={false}
            onSelect={onSelect}
          />
        );
      });
  return (
    <group>
      <mesh geometry={back} castShadow>
        <meshStandardMaterial map={tex} {...fabric} side={THREE.DoubleSide} />
        {school && (
          <Badge
            regId="membership"
            selectId="membership"
            geometry={back}
            origin={V(0, 0.75, -0.6)}
            dir={V(0, 0, 1)}
            up={UP}
            w={mw}
            h={mh}
            shape={mshape}
            texture={BADGE_TEXTURES.membership()}
            visible={badges.membership}
            selected={selected === 'membership'}
            onSelect={onSelect}
          />
        )}
      </mesh>
      {['left', 'right'].map((side) => {
        const g = side === 'left' ? tailL : tailR;
        const x = (side === 'left' ? 1 : -1) * 0.0175;
        return (
          <mesh key={side} geometry={g} castShadow>
            {mat}
            {tailBadges(side)}
            {school && selected === 'progress' && steps > (side === 'left' ? 0 : 1) && (
              <Ring geometry={g} origin={V(x, 0.708 + ph / 2, 0.6)} dir={V(0, 0, -1)} up={UP} w={pw + 0.01} h={ph * 2 + 0.01} depth={0.02} />
            )}
          </mesh>
        );
      })}
      {/* 頸後捲起部分 */}
      <mesh position={[0, 0.926, -0.002]} rotation={[Math.PI / 2 + 0.26, 0, 0]} scale={[1, 0.9, 1]} castShadow>
        <torusGeometry args={[0.062, 0.013, 12, 40]} />
        {mat}
      </mesh>
      {/* 顏色巾圈 */}
      <mesh position={[0, 0.846, 0.096]} rotation={[Math.PI / 2 - 0.12, 0, 0]} scale={[1.2, 1, 0.75]} castShadow>
        <torusGeometry args={[0.018, 0.0075, 12, 28]} />
        <meshStandardMaterial color={woggle} roughness={0.45} />
      </mesh>
    </group>
  );
}

/* ---------- 手臂 + 袖 ---------- */
function Arm({ side, skin, shirtColour, long, badges, school, selected, onSelect }) {
  const s = side === 'left' ? 1 : -1;
  const geo = useMemo(() => sleeveGeometry(long), [long]);
  const out = (y, z = 0) => ({ origin: V(s * 0.5, y, z), dir: V(-s, 0, 0) });
  const hemY = SLEEVE.shortHemY; // 長袖「相同位置」= 短袖袖口高度
  const items = [];

  if (!school && side === 'right') {
    const [tw, th] = size('troop');
    const [dw, dh] = size('district');
    const [ew, eh] = size('meritorious');
    const troopY = SLEEVE.seamY - 2 * CM - th / 2;
    const distY = SLEEVE.seamY - 2 * CM - th - 2 * CM - dh / 2;
    const meritY = hemY + 0.5 * CM + eh / 2;
    items.push(
      { id: 'troop', y: troopY, w: tw, h: th, shape: 'rect' },
      { id: 'district', y: distY, w: dw, h: dh, shape: 'rect' },
      { id: 'meritorious', y: meritY, w: ew, h: eh, shape: 'rect' },
    );
  }

  const progress = [];
  if (!school && side === 'left') {
    const [pw, ph] = size('progress');
    const row1 = hemY + 0.5 * CM + ph / 2;
    const row2 = row1 + ph;
    // 由左邊望住左袖：紅（左下）靠穿著者前面（+z）——待確認
    const cells = { 1: [row1, pw / 2], 2: [row1, -pw / 2], 3: [row2, pw / 2], 4: [row2, -pw / 2] };
    for (const st of [1, 2, 3, 4]) {
      const [y, z] = cells[st];
      progress.push({ st, y, z, w: pw, h: ph });
    }
    const [gw, gh, gshape] = size('grasshopperAward');
    items.push({ id: 'grasshopperAward', y: row2 + ph / 2 + 1 * CM + gh / 2, w: gw, h: gh, shape: gshape });
  }

  return (
    <group position={[s * D.shoulderX, D.shoulderY, 0]} rotation={[0, 0, s * D.armSpread]}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={shirtColour} {...fabric} side={THREE.DoubleSide} />
        {items.map((it) => (
          <Badge
            key={it.id}
            regId={it.id}
            selectId={it.id}
            geometry={geo}
            {...out(it.y)}
            up={UP}
            w={it.w}
            h={it.h}
            depth={0.05}
            shape={it.shape}
            texture={BADGE_TEXTURES[it.id]()}
            visible={!!badges[it.id]}
            selected={selected === it.id}
            onSelect={onSelect}
          />
        ))}
        {progress.map((p) => (
          <Badge
            key={p.st}
            regId={`progress-${p.st}`}
            selectId="progress"
            geometry={geo}
            {...out(p.y, p.z)}
            up={UP}
            w={p.w * 0.98}
            h={p.h * 0.98}
            depth={0.04}
            shape="square"
            texture={progressTexture(p.st)}
            visible={p.st <= badges.progress}
            selected={selected === 'progress'}
            ring={false}
            onSelect={onSelect}
          />
        ))}
        {progress.length > 0 && selected === 'progress' && badges.progress > 0 && (
          <Ring
            geometry={geo}
            {...out((progress[0].y + progress[2].y) / 2, 0)}
            up={UP}
            w={progress[0].w * 2 + 0.012}
            h={progress[0].h * 2 + 0.012}
          />
        )}
      </mesh>
      {/* 手臂皮膚 */}
      <mesh position={[0, -0.19, 0]} castShadow>
        <capsuleGeometry args={[0.032, 0.3, 8, 20]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.395, 0.004]} scale={[0.8, 1.1, 0.9]} castShadow>
        <sphereGeometry args={[0.036, 20, 16]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ---------- 下身 ---------- */
function Legs({ skin, legwear, legColour, socks, sockColour, shoeColour }) {
  const hips = useMemo(() => hipsGeometry(), []);
  const long = legwear === 'trousers';
  return (
    <group>
      <mesh geometry={hips} castShadow>
        <meshStandardMaterial color={legColour} {...fabric} />
      </mesh>
      {[1, -1].map((s) => {
        const x = s * D.hipX;
        const legTop = 0.55;
        const pantBottom = long ? 0.075 : 0.43;
        const pantLen = legTop - pantBottom;
        const sockTop = socks === 'long' ? 0.29 : 0.11;
        return (
          <group key={s}>
            <mesh position={[x, (legTop + 0.04) / 2, 0]} castShadow>
              <cylinderGeometry args={[0.041, 0.031, legTop - 0.04, 20]} />
              <meshStandardMaterial color={skin} roughness={0.7} />
            </mesh>
            <mesh position={[x, legTop - pantLen / 2, 0]} castShadow>
              <cylinderGeometry args={[0.056, long ? 0.044 : 0.055, pantLen, 24, 1, true]} />
              <meshStandardMaterial color={legColour} {...fabric} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[x, (sockTop + 0.035) / 2, 0]} castShadow>
              <cylinderGeometry args={[0.0345, 0.032, sockTop - 0.035, 20]} />
              <meshStandardMaterial color={sockColour} {...fabric} />
            </mesh>
            {/* 運動鞋 */}
            <group position={[x * 1.05, 0, 0.02]}>
              <mesh position={[0, 0.034, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.75]} castShadow>
                <capsuleGeometry args={[0.04, 0.085, 8, 20]} />
                <meshStandardMaterial color={shoeColour} roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.009, 0]} scale={[1, 1, 1]} castShadow>
                <boxGeometry args={[0.084, 0.018, 0.168]} />
                <meshStandardMaterial color="#f4f4f4" roughness={0.8} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/* ---------- 全身 ---------- */
export default function Figure({ outfit, badges, selected, onSelect }) {
  const torso = useMemo(() => torsoGeometry(), []);
  const vest = useMemo(() => vestGeometry(), []);
  const shirtColour = outfit.top === 'orange' ? SHIRT_ORANGE : outfit.topColour;
  const invested = outfit.invested;
  const school = outfit.school;
  const [mw, mh, mshape] = size('membership');
  const [cw, ch, cshape] = size('commemorative');
  const chest = (x, y) => ({ origin: V(x, y, 0.6), dir: V(0, 0, -1) });
  const membershipOnShirt = invested && !school && !outfit.vest;
  const membershipOnVest = invested && !school && outfit.vest;
  const showBadges = { ...badges, membership: badges.membership && invested };

  return (
    <group>
      {/* 公仔底座 */}
      <mesh position={[0, -0.022, 0]} receiveShadow>
        <cylinderGeometry args={[0.3, 0.32, 0.044, 64]} />
        <meshStandardMaterial color="#2c3440" roughness={0.6} metalness={0.1} />
      </mesh>

      <Head gender={outfit.gender} skin={outfit.skin} hair={outfit.hair} hat={outfit.hat} hatColour={outfit.hatColour} />

      <mesh geometry={torso} castShadow>
        <meshStandardMaterial color={shirtColour} {...fabric} />
        {membershipOnShirt && (
          <Badge
            regId="membership"
            selectId="membership"
            geometry={torso}
            {...chest(0.065, D.shoulderY - 0.07)}
            up={UP}
            w={mw}
            h={mh}
            shape={mshape}
            texture={BADGE_TEXTURES.membership()}
            visible={showBadges.membership}
            selected={selected === 'membership'}
            onSelect={onSelect}
          />
        )}
        {!school && (
          <Badge
            regId="commemorative"
            selectId="commemorative"
            geometry={torso}
            {...chest(-0.065, D.shoulderY - 0.055)}
            up={UP}
            w={cw}
            h={ch}
            shape={cshape}
            texture={BADGE_TEXTURES.commemorative()}
            visible={!!badges.commemorative && !outfit.vest}
            selected={selected === 'commemorative'}
            onSelect={onSelect}
          />
        )}
      </mesh>

      {/* 領 */}
      {outfit.top === 'tee' ? (
        <mesh position={[0, 0.928, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.86, 1]}>
          <torusGeometry args={[0.045, 0.005, 8, 32]} />
          <meshStandardMaterial color={shirtColour} {...fabric} />
        </mesh>
      ) : (
        <group>
          <mesh position={[0, 0.93, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.86, 1]}>
            <torusGeometry args={[0.047, 0.009, 8, 32]} />
            <meshStandardMaterial color={shirtColour} {...fabric} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh key={s} position={[s * 0.028, 0.905, 0.062]} rotation={[-0.9, s * 0.45, s * 0.5]}>
              <boxGeometry args={[0.036, 0.022, 0.003]} />
              <meshStandardMaterial color={shirtColour} {...fabric} />
            </mesh>
          ))}
        </group>
      )}

      {outfit.vest && (
        <mesh geometry={vest} castShadow>
          <meshStandardMaterial color={outfit.vestColour} {...fabric} side={THREE.DoubleSide} />
          {membershipOnVest && (
            <Badge
              regId="membership"
              selectId="membership"
              geometry={vest}
              {...chest(0.068, D.shoulderY - 0.075)}
              up={UP}
              w={mw}
              h={mh}
              shape={mshape}
              texture={BADGE_TEXTURES.membership()}
              visible={showBadges.membership}
              selected={selected === 'membership'}
              onSelect={onSelect}
            />
          )}
        </mesh>
      )}

      {invested && (
        <Necker
          main={outfit.neckerMain}
          border={outfit.neckerBorder}
          woggle={outfit.woggle}
          school={school}
          badges={showBadges}
          selected={selected}
          onSelect={onSelect}
        />
      )}

      {['left', 'right'].map((side) => (
        <Arm
          key={side}
          side={side}
          skin={outfit.skin}
          shirtColour={shirtColour}
          long={outfit.sleeves === 'long'}
          badges={badges}
          school={school}
          selected={selected}
          onSelect={onSelect}
        />
      ))}

      <Legs
        skin={outfit.skin}
        legwear={outfit.legwear}
        legColour={outfit.legColour}
        socks={outfit.socks}
        sockColour={outfit.sockColour}
        shoeColour={outfit.shoeColour}
      />
    </group>
  );
}
