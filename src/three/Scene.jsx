// 3D 場景：燈、相機控制、預設視角、聚焦 — v1.0 · © SCOUT SYSTEM
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import Figure from './Figure.jsx';
import { RegistryContext, createRegistry } from './registry.js';

const TARGET = new THREE.Vector3(0, 0.56, 0);
const DIST = 2.75;
export const VIEWS = {
  front: [0, 0.74, DIST],
  back: [0, 0.74, -DIST],
  left: [DIST, 0.74, 0], // 穿著者左 = +x
  right: [-DIST, 0.74, 0],
};

// 防止相機入咗公仔：身體大約係半徑 0.26 嘅圓柱
const BODY_R = 0.3;
const BODY_TOP = 1.25;
const MIN_DIST = 0.5;
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
    focus(point, normal) {
      const target = point.clone();
      const pos = point.clone().addScaledVector(normal.clone().normalize(), 0.95);
      pos.y += 0.08;
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
    c.target.y = THREE.MathUtils.clamp(c.target.y, 0.1, 1.15);
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

const Scene = forwardRef(function Scene({ outfit, badges, selected, onSelect, onReady }, ref) {
  const rig = useRef();
  const registry = useMemo(() => createRegistry(), []);
  const glRef = useRef();

  useImperativeHandle(ref, () => ({
    view: (name) => rig.current?.view(name),
    focus(id) {
      // 進步章有 4 格：攞已登記嗰幾格嘅平均位置
      const getters = [...registry.entries()].filter(([k]) => k === id || k.startsWith(`${id}-`)).map(([, g]) => g());
      if (!getters.length) return false;
      const point = new THREE.Vector3();
      const normal = new THREE.Vector3();
      for (const g of getters) {
        point.add(g.point);
        normal.add(g.normal);
      }
      point.divideScalar(getters.length);
      rig.current?.focus(point, normal);
      return true;
    },
    canvas: () => glRef.current?.domElement ?? null,
  }));

  return (
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
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#eef1f4']} />
      <hemisphereLight args={['#ffffff', '#b9c2cc', 1.1]} />
      <directionalLight
        position={[1.6, 2.6, 2.2]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-0.8}
        shadow-camera-right={0.8}
        shadow-camera-top={1.4}
        shadow-camera-bottom={-0.2}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-2, 1.4, -1.6]} intensity={0.55} />
      <RegistryContext.Provider value={registry}>
        <Figure outfit={outfit} badges={badges} selected={selected} onSelect={onSelect} />
      </RegistryContext.Provider>
      <ContactShadows position={[0, -0.045, 0]} scale={1.6} blur={2.4} opacity={0.35} far={0.4} />
      <Rig ref={rig} />
    </Canvas>
  );
});

export default Scene;
