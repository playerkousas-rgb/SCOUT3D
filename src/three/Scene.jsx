// 3D 場景：燈、相機控制、預設視角 — v1.0 · © SCOUT SYSTEM
import { Suspense, forwardRef, useImperativeHandle, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import Blocky from './Blocky.jsx';
import { useLang } from '../i18n.jsx';

const TARGET = new THREE.Vector3(0, 0.6, 0);
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
const MIN_DIST = 0.45;
const MAX_DIST = 3.4;

const Rig = forwardRef(function Rig(_, ref) {
  const controls = useRef();
  const goal = useRef(null);
  const { camera } = useThree();

  useImperativeHandle(ref, () => ({
    view(name) {
      const p = VIEWS[name] ?? VIEWS.front;
      goal.current = { pos: new THREE.Vector3(...p), target: TARGET.clone() };
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
    c.target.y = THREE.MathUtils.clamp(c.target.y, 0.1, 1.2);
    c.target.z = THREE.MathUtils.clamp(c.target.z, -0.32, 0.32);
    // 相機唔可以入身體、唔可以去咗地底
    const p = camera.position;
    if (p.y < 0.04) p.y = 0.04;
    const r = Math.hypot(p.x, p.z);
    if (p.y < BODY_TOP && r < BODY_R) {
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

const Scene = forwardRef(function Scene({ outfit, onReady }, ref) {
  const rig = useRef();
  const glRef = useRef();

  useImperativeHandle(ref, () => ({
    view: (name) => rig.current?.view(name),
    canvas: () => glRef.current?.domElement ?? null,
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
      >
        <color attach="background" args={['#e9edf1']} />
        <hemisphereLight args={['#ffffff', '#9aa3ad', 1.5]} />
        <directionalLight
          position={[1.1, 2.4, 3.0]}
          intensity={2.3}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-0.8}
          shadow-camera-right={0.8}
          shadow-camera-top={1.5}
          shadow-camera-bottom={-0.2}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
        />
        <directionalLight position={[-1.6, 2, -2.4]} intensity={1.5} />
        <directionalLight position={[-1.6, 1.2, 1.8]} intensity={0.35} />
        <Suspense fallback={null}>
          <Blocky outfit={outfit} />
        </Suspense>
        <ContactShadows position={[0, 0.001, 0]} scale={1.8} blur={2.6} opacity={0.4} far={0.5} />
        <Rig ref={rig} />
      </Canvas>
      <Loading />
    </>
  );
});

export default Scene;
