// 一枚徽章：貼喺父 mesh 表面嘅 decal — v1.0 · © SCOUT SYSTEM
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Decal } from '@react-three/drei';
import { placeOnSurface } from './placement.js';
import { ringTexture } from './textures.js';
import { useRegistry } from './registry.js';

/**
 * props:
 *  regId      登記名（相機聚焦用）
 *  selectId   撳落去揀邊項
 *  geometry   父 mesh 嘅 geometry（本地座標）
 *  origin/dir 射線（本地座標）
 *  up         徽章「上」方向（本地）
 *  w/h        闊／高（米）
 *  shape      circle | square | rect
 *  texture    貼圖
 *  visible    顯示與否（隱藏時仍然登記位置）
 */
// 只接受「最前面」嘅命中：射線穿過身體打中背後徽章唔算
function isFront(e) {
  const first = e.intersections?.[0];
  return !first || e.distance - first.distance < 0.004;
}

export default function Badge({
  regId,
  selectId,
  geometry,
  origin,
  dir,
  up,
  w,
  h,
  depth = 0.03,
  shape,
  texture,
  visible = true,
  selected = false,
  ring = true,
  onSelect,
}) {
  const anchor = useRef();
  const registry = useRegistry();
  const [hover, setHover] = useState(false);

  const place = useMemo(
    () => placeOnSurface(geometry, origin, dir, up),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometry, origin.x, origin.y, origin.z, dir.x, dir.y, dir.z],
  );

  useLayoutEffect(() => {
    if (!place || !anchor.current) return undefined;
    const obj = anchor.current;
    registry.set(regId, () => {
      const parent = obj.parent;
      parent.updateWorldMatrix(true, false);
      const point = parent.localToWorld(place.position.clone());
      const normal = place.normal.clone().transformDirection(parent.matrixWorld);
      return { point, normal };
    });
    return () => registry.delete(regId);
  }, [place, regId, registry]);

  if (!place) return null;
  const pos = [place.position.x, place.position.y, place.position.z];
  const rot = [place.rotation.x, place.rotation.y, place.rotation.z];

  return (
    <>
      <object3D ref={anchor} />
      {visible && (
        <Decal
          position={pos}
          rotation={rot}
          scale={[w, h, depth]}
          renderOrder={2}
          depthTest
          onClick={(e) => {
            if (!isFront(e)) return;
            e.stopPropagation();
            onSelect?.(selectId);
          }}
          onPointerOver={(e) => {
            if (!isFront(e)) return;
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = '';
          }}
        >
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.02}
            roughness={0.8}
            polygonOffset
            polygonOffsetFactor={-10}
            emissive={hover ? '#332200' : '#000000'}
            side={THREE.FrontSide}
          />
        </Decal>
      )}
      {visible && selected && ring && (
        <Decal
          position={pos}
          rotation={rot}
          scale={[w * 1.2 + 0.008, h * 1.2 + 0.008, depth]}
          renderOrder={3}
          depthTest
          raycast={() => null}
        >
          <meshBasicMaterial
            map={ringTexture(shape === 'circle' ? 'circle' : 'square')}
            transparent
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-14}
            toneMapped={false}
          />
        </Decal>
      )}
    </>
  );
}

/** 一組徽章（例如進步章 2×2）共用一個選取框 */
export function Ring({ geometry, origin, dir, up, w, h, depth = 0.04 }) {
  const place = useMemo(
    () => placeOnSurface(geometry, origin, dir, up),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometry, origin.x, origin.y, origin.z, dir.x, dir.y, dir.z],
  );
  if (!place) return null;
  return (
    <Decal
      position={[place.position.x, place.position.y, place.position.z]}
      rotation={[place.rotation.x, place.rotation.y, place.rotation.z]}
      scale={[w, h, depth]}
      renderOrder={3}
      depthTest
      raycast={() => null}
    >
      <meshBasicMaterial
        map={ringTexture('square')}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-14}
        toneMapped={false}
      />
    </Decal>
  );
}
