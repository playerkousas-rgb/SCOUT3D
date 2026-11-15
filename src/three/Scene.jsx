// 3D 場景：燈、相機控制、預設視角 — v1.0 · © SCOUT SYSTEM
import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Lightformer, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import Blocky from './Blocky.jsx';
import { useLang } from '../i18n.jsx';
import { LookContext, DEFAULT_LOOK } from './look.js';

const TARGET = new THREE.Vector3(0, 0.6, 0);
/** 幼童軍、童軍、深資童軍高啲（135、155、168 cm vs 117 cm）：望住點同相機一齊升 */
const LIFT = { grasshopper: 0, cub: 0.09, scout: 0.17, venture: 0.23, rover: 0.23, leader: 0.25 };
/** 童軍、深資童軍成個人高咗：預設視角企遠少少，先至見到全身 */
const ZOOM = { grasshopper: 1, cub: 1, scout: 1.15, venture: 1.24, rover: 1.24, leader: 1.27 };
const DIST = 3.05;
const EYE = 0.82;
export const VIEWS = {
  front: [0, EYE, DIST],
  back: [0, EYE, -DIST],
  left: [DIST, EYE, 0], // 穿著者左 = +x
  right: [-DIST, EYE, 0],
};

// 防止相機入咗公仔：身體大約係半徑 0.26 嘅圓柱
const BODY_R = 0.32;
const BODY_TOP = 1.3;
const MIN_DIST = 0.28; // 可以拉好近睇章
const MAX_DIST = 3.9;

/** 上下移動範圍（望住點 y，米）：腳 → 頭頂 */
export const HEIGHT_MIN = 0.1;
export const heightMax = (lift) => 1.35 + lift;

const Rig = forwardRef(function Rig({ lift: liftProp = 0, zoom: zoomProp = 1, onHeight }, ref) {
  const controls = useRef();
  const goal = useRef(null);
  const lastH = useRef(null);
  const { camera } = useThree();

  useImperativeHandle(ref, () => ({
    /** opts 由 Scene 直接傳入：Canvas 入面嘅 Rig 比外面遲 render，唔可以靠 props 嘅 lift／zoom */
    view(name, opts = {}) {
      const lift = opts.lift ?? liftProp;
      const zoom = opts.zoom ?? zoomProp;
      const p = VIEWS[name] ?? VIEWS.front;
      goal.current = { pos: new THREE.Vector3(p[0] * zoom, p[1] + lift, p[2] * zoom), target: TARGET.clone().setY(TARGET.y + lift) };
    },
    /** 上下移動：望住點同相機一齊升降（唔轉角度），等用戶拉近之後睇到唔同高度嘅章 */
    setHeight(y) {
      const c = controls.current;
      if (!c) return;
      goal.current = null;
      const ny = THREE.MathUtils.clamp(y, HEIGHT_MIN, heightMax(liftProp));
      const dy = ny - c.target.y;
      c.target.y += dy;
      camera.position.y += dy;
      c.update();
    },
    focus(point, normal) {
      const target = point.clone();
      const pos = point.clone().addScaledVector(normal.clone().normalize(), 0.75);
      pos.y += 0.05;
      goal.current = { pos, target };
    },
  }));

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (goal.current) {
      const a = 1 - Math.exp(-dt * 7);
      camera.position.lerp(goal.current.pos, a);
      c.target.lerp(goal.current.target, a);
      if (camera.position.distanceTo(goal.current.pos) < 0.002 && c.target.distanceTo(goal.current.target) < 0.002) {
        goal.current = null;
      }
    }
    // 目標點限制喺身體附近
    c.target.x = THREE.MathUtils.clamp(c.target.x, -0.32, 0.32);
    c.target.y = THREE.MathUtils.clamp(c.target.y, 0.1, 1.35 + liftProp);
    c.target.z = THREE.MathUtils.clamp(c.target.z, -0.32, 0.32);
    // 相機唔可以入身體、唔可以去咗地底
    const p = camera.position;
    if (p.y < 0.04) p.y = 0.04;
    const r = Math.hypot(p.x, p.z);
    if (p.y < BODY_TOP + liftProp && r < BODY_R) {
      const k = r < 1e-4 ? 1 : BODY_R / r;
      p.x = r < 1e-4 ? BODY_R : p.x * k;
      p.z *= r < 1e-4 ? 0 : k;
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={TARGET.toArray()}
      enableDamping
      dampingFactor={0.12}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
      maxPolarAngle={Math.PI * 0.62}
      minPolarAngle={0.15}
      panSpeed={0.6}
      zoomToCursor
      onChange={() => {
        const y = controls.current?.target.y;
        if (y != null && Math.abs(y - (lastH.current ?? -9)) > 0.005) {
          lastH.current = y;
          onHeight?.(y);
        }
      }}
      onStart={() => {
        goal.current = null;
      }}
    />
  );
});

function Loading() {
  const { active, progress } = useProgress();
  const { t } = useLang();
  if (!active) return null;
  return (
    <div className="stage__loading" role="status">
      {t('loading')} {Math.round(progress)}%
    </div>
  );
}

/** 攞返 R3F 狀態（匯出時要 gl、scene、camera） */
function Grab({ into }) {
  into.current = useThree((s) => s.get);
  return null;
}

const SHADOW_BOX = {
  'shadow-camera-left': -0.8,
  'shadow-camera-right': 0.8,
  'shadow-camera-top': 1.7,
  'shadow-camera-bottom': -0.2,
};

/** 曝光：精緻模式暗少少（環境光已經夠光），顏色先唔會變白 */
function Exposure({ value }) {
  const gl = useThree((st) => st.gl);
  useEffect(() => {
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
}

/** 簡約：原本嘅燈（v1–v24） */
function SimpleLights() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#9aa3ad', 1.5]} />
      <directionalLight position={[1.1, 2.4, 3.0]} intensity={2.3} castShadow shadow-mapSize={[2048, 2048]} {...SHADOW_BOX} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[-1.6, 2, -2.4]} intensity={1.5} />
      <directionalLight position={[-1.6, 1.2, 1.8]} intensity={0.35} />
    </>
  );
}

/**
 * v25 精緻：影樓燈。環境光由 Lightformer 即場畫（唔使下載 HDR 檔）：頂燈箱、前面主燈箱、兩邊輪廓光，
 * 金屬章同布面先有反光同柔和明暗；主燈軟陰影。
 */
function StudioLights() {
  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={0.6}>
        <color attach="background" args={['#5d636b']} />
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 0.5]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={2.6} position={[2.2, 1.6, 3]} scale={[2.5, 2.5, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[-3, 1.4, 1.5]} scale={[1.5, 3, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={1.8} position={[0, 1.8, -3.5]} scale={[4, 2, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={0.6} position={[0, -1, 2]} rotation-x={-Math.PI / 2} scale={[6, 6, 1]} color="#e8e2d6" />
      </Environment>
      <hemisphereLight args={['#ffffff', '#8f8a82', 0.35]} />
      <directionalLight
        position={[1.9, 2.6, 2.4]}
        intensity={2.4}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        {...SHADOW_BOX}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      <directionalLight position={[-1.6, 2, -2.4]} intensity={1.1} color="#e6eeff" />
    </>
  );
}

const Scene = forwardRef(function Scene({ section = 'grasshopper', look = DEFAULT_LOOK, outfit, badges, picks, selected, onSelect, onReady, onHeight }, ref) {
  const rig = useRef();
  const lift = LIFT[section] ?? 0;
  const zoom = ZOOM[section] ?? 1;
  // 轉支部：鏡頭返去正面（高度、遠近唔同）
  useEffect(() => {
    rig.current?.view('front', { lift, zoom });
  }, [section, lift, zoom]);
  const glRef = useRef();
  const getState = useRef(null);
  const figure = useRef();
  const registry = useMemo(() => new Map(), []);
  const detailed = look === 'detailed';

  useImperativeHandle(ref, () => ({
    view: (name) => rig.current?.view(name, { lift, zoom }),
    /** 鏡頭轉去望住某個章（進步獎章有幾格就攞平均） */
    focus(id) {
      const meshes = [...registry.entries()].filter(([k]) => k === id || k.startsWith(`${id}-`)).map(([, m]) => m);
      if (!meshes.length) return false;
      const point = new THREE.Vector3();
      const normal = new THREE.Vector3();
      const q = new THREE.Quaternion();
      for (const m of meshes) {
        point.add(m.getWorldPosition(new THREE.Vector3()));
        normal.add(new THREE.Vector3(0, 0, 1).applyQuaternion(m.getWorldQuaternion(q)));
      }
      point.divideScalar(meshes.length);
      // 平放喺膊頭嘅章（深資童軍肩章）：由前面斜上望，唔好由頭頂直落（會俾個頭遮住）
      if (normal.lengthSq() > 0 && Math.abs(normal.clone().normalize().y) > 0.9) normal.set(0, 0.75, 0.66);
      rig.current?.focus(point, normal);
      return true;
    },
    canvas: () => glRef.current?.domElement ?? null,
    setHeight: (y) => rig.current?.setHeight(y),
    heightRange: () => [HEIGHT_MIN, heightMax(lift)],
    /** 公仔 group（GLB／STL 匯出用；唔包燈、地影） */
    figure: () => figure.current ?? null,
    /**
     * 用指定解像度重畫一次再抄出嚟（PNG 匯出）。scale = 每個 CSS 像素幾多格（0 = 跟螢幕）；
     * transparent = 透明背景。畫完即刻還原。
     */
    renderImage({ scale = 0, transparent = false } = {}) {
      const st = getState.current?.();
      if (!st) return null;
      const { gl, scene, camera, size } = st;
      const prevPR = gl.getPixelRatio();
      const prevBg = scene.background;
      const prevColour = new THREE.Color();
      gl.getClearColor(prevColour);
      const prevAlpha = gl.getClearAlpha();
      const maxSide = Math.min(8192, gl.capabilities.maxTextureSize || 4096);
      const want = scale > 0 ? scale : prevPR;
      const pr = Math.max(0.5, Math.min(want, maxSide / Math.max(size.width, size.height)));
      try {
        gl.setPixelRatio(pr);
        gl.setSize(size.width, size.height, false);
        if (transparent) {
          scene.background = null;
          gl.setClearColor(0x000000, 0);
        }
        gl.render(scene, camera);
        const out = document.createElement('canvas');
        out.width = gl.domElement.width;
        out.height = gl.domElement.height;
        out.getContext('2d').drawImage(gl.domElement, 0, 0);
        return out;
      } finally {
        scene.background = prevBg;
        gl.setClearColor(prevColour, prevAlpha);
        gl.setPixelRatio(prevPR);
        gl.setSize(size.width, size.height, false);
        gl.render(scene, camera);
      }
    },
  }));

  return (
    <>
      <Canvas
        className="scene"
        shadows
        dpr={[1, 2]}
        camera={{ position: VIEWS.front, fov: 32, near: 0.02, far: 30 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => {
          glRef.current = gl;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          onReady?.();
        }}
        onPointerMissed={() => onSelect?.(null)}
      >
        <color attach="background" args={[detailed ? '#e6eaee' : '#e9edf1']} />
        {detailed ? <StudioLights /> : <SimpleLights />}
        <Exposure value={detailed ? 0.92 : 1} />
        <Suspense fallback={null}>
          <LookContext.Provider value={look}>
            <group ref={figure} name="SCOUT3D figure" userData={{ copyright: '© SCOUT SYSTEM · SCOUT3D v1.0' }}>
              <Blocky section={section} outfit={outfit} badges={badges} picks={picks} selected={selected} onSelect={onSelect} registry={registry} />
            </group>
          </LookContext.Provider>
        </Suspense>
        {detailed ? (
          <>
            <ContactShadows position={[0, 0.001, 0]} scale={1.8} blur={3.2} opacity={0.5} far={0.6} resolution={512} />
            <ContactShadows position={[0, 0.0015, 0]} scale={0.9} blur={1.2} opacity={0.35} far={0.12} resolution={512} />
          </>
        ) : (
          <ContactShadows position={[0, 0.001, 0]} scale={1.8} blur={2.6} opacity={0.4} far={0.5} />
        )}
        <Rig ref={rig} lift={lift} zoom={zoom} onHeight={onHeight} />
        <Grab into={getState} />
      </Canvas>
      <Loading />
    </>
  );
});

export default Scene;
