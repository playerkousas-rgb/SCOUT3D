// runs in page: window.__mh(mode, view)
window.__mh = (mode, view) => {
  const E = window.avatarEditor, vrm = E.preview.vrm, THREE = window.__THREE;
  const h = vrm.humanoid;
  const set = (bn, x, y, z) => h.getNormalizedBoneNode(bn)?.rotation.set(x, y, z);
  set('leftUpperArm', 0, 0, -1.42); set('rightUpperArm', 0, 0, 1.42);
  set('leftLowerArm', 0, -0.1, 0); set('rightLowerArm', 0, 0.1, 0);
  set('leftUpperLeg', 0, 0, -0.06); set('rightUpperLeg', 0, 0, 0.06);
  set('leftLowerLeg', 0, 0, 0.02); set('rightLowerLeg', 0, 0, -0.02);
  const meshes = [];
  vrm.scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const bodyM = meshes.find((m) => m.name === 'body');
  const sk = bodyM.skeleton;
  const bp = {};
  sk.bones.forEach((b, i) => { bp[b.name] = new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert()); });
  const thighY = bp.thigh_l.y, kneeY = bp.calf_l.y, ankleY = bp.foot_l.y;
  const shX = bp.upperarm_l.x, armLen = bp.lowerarm_l.x - bp.upperarm_l.x;
  const recolour = (m, col, keepDark = 0) => {
    const img = m.map?.image; if (!img) { m.color.set(col); return; }
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.filter = 'blur(' + Math.round(img.width / 160) + 'px)'; ctx.drawImage(img, 0, 0); ctx.filter = 'none';
    const d = ctx.getImageData(0, 0, c.width, c.height), s = d.data;
    let sum = 0, n = 0;
    for (let i = 0; i < s.length; i += 4) if (s[i + 3] > 128) { sum += 0.3 * s[i] + 0.59 * s[i + 1] + 0.11 * s[i + 2]; n++; }
    const mean = sum / n || 1, t = [1, 3, 5].map((k) => parseInt(col.slice(k, k + 2), 16));
    for (let i = 0; i < s.length; i += 4) {
      const L = (0.3 * s[i] + 0.59 * s[i + 1] + 0.11 * s[i + 2]) / mean;
      if (L < keepDark) { s[i] = 70; s[i + 1] = 45; s[i + 2] = 28; continue; } // 皮帶：啡色
      const l = Math.pow(Math.max(0.4, L), 0.38);
      s[i] = Math.min(255, t[0] * l); s[i + 1] = Math.min(255, t[1] * l); s[i + 2] = Math.min(255, t[2] * l);
    }
    ctx.putImageData(d, 0, 0);
    const o0 = m.map, tex = new THREE.CanvasTexture(c);
    tex.flipY = o0.flipY; tex.colorSpace = o0.colorSpace; tex.wrapS = o0.wrapS; tex.wrapT = o0.wrapT; tex.channel = o0.channel;
    m.map = tex; m.color.set('#ffffff'); m.needsUpdate = true;
  };
  // 由一個 SkinnedMesh 切出 f(x,y,z) >= 0 嗰部分（三角形喺切口真係切開 → 齊邊），做新 mesh（同一副骨）
  const sub = (o, f, col, keepDark = 0, offset = 0) => {
    const g = o.geometry, I = g.index.array;
    const names = Object.keys(g.attributes);
    const src = Object.fromEntries(names.map((n) => [n, g.attributes[n]]));
    const outA = Object.fromEntries(names.map((n) => [n, []]));
    const P = src.position;
    const F = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) F[i] = f(P.getX(i), P.getY(i), P.getZ(i));
    const map = new Map();
    let nV = 0;
    const copyV = (i) => {
      const k = 'v' + i; if (map.has(k)) return map.get(k);
      for (const n of names) { const A = src[n]; for (let q = 0; q < A.itemSize; q++) outA[n].push(A.array[i * A.itemSize + q]); }
      map.set(k, nV); return nV++;
    };
    const cutV = (a, b) => {
      const k = a < b ? 'e' + a + '_' + b : 'e' + b + '_' + a; if (map.has(k)) return map.get(k);
      const t = F[a] / (F[a] - F[b]);
      for (const n of names) {
        const A = src[n], s0 = A.itemSize;
        const discrete = n === 'skinIndex' || n === 'skinWeight' || n.startsWith('_JOINTS') || n.startsWith('_WEIGHTS');
        for (let q = 0; q < s0; q++) {
          const va = A.array[a * s0 + q], vb = A.array[b * s0 + q];
          outA[n].push(discrete ? (t < 0.5 ? va : vb) : va + (vb - va) * t);
        }
      }
      map.set(k, nV); return nV++;
    };
    const I2 = [];
    for (let t = 0; t < I.length; t += 3) {
      const v = [I[t], I[t + 1], I[t + 2]], pos = v.map((i) => F[i] >= 0), n = pos.filter(Boolean).length;
      if (n === 3) { I2.push(copyV(v[0]), copyV(v[1]), copyV(v[2])); continue; }
      if (n === 0) continue;
      const odd = n === 1 ? pos.indexOf(true) : pos.indexOf(false);
      const a = v[odd], b = v[(odd + 1) % 3], c = v[(odd + 2) % 3];
      if (n === 1) I2.push(copyV(a), cutV(a, b), cutV(a, c));
      else { const eb = cutV(b, a), ec = cutV(c, a); I2.push(copyV(b), copyV(c), ec, copyV(b), ec, eb); }
    }
    const g2 = new THREE.BufferGeometry();
    for (const n of names) {
      const A = src[n], Ctor = A.array.constructor;
      g2.setAttribute(n, new THREE.BufferAttribute(new Ctor(outA[n]), A.itemSize, A.normalized));
    }
    g2.setIndex(I2);
    if (offset) {
      const N = g2.attributes.normal, P2 = g2.attributes.position;
      for (let i = 0; i < P2.count; i++) P2.setXYZ(i, P2.getX(i) + N.getX(i) * offset, P2.getY(i) + N.getY(i) * offset, P2.getZ(i) + N.getZ(i) * offset);
    }
    const m2 = o.material.clone();
    const mesh = new THREE.SkinnedMesh(g2, m2); mesh.name = o.name + '_part'; mesh.frustumCulled = false;
    mesh.bind(o.skeleton, o.bindMatrix); o.parent.add(mesh);
    if (col) recolour(m2, col, keepDark);
    return mesh;
  };
  const BEIGE = '#d9c8a0', GREEN = '#5b7440', SOCK = '#2e4a2b';
  const sleeveCut = shX + armLen * 0.5;
  const out = { thighY, kneeY, ankleY, shX, armLen };
  for (const o of meshes) {
    if (/casualsuit01|elegantsuit01/.test(o.name)) {
      const waist = thighY + (mode === 'venture' ? 0.05 : 0.075);
      const sleeve = (x) => sleeveCut - Math.abs(x);
      const hem = mode === 'venture' ? kneeY + 0.075 : kneeY + 0.07;
      sub(o, (x, y) => Math.min(y - waist, sleeve(x)), BEIGE);
      sub(o, (x, y) => Math.min(waist - y, y - hem), GREEN, 0);
      if (mode !== 'venture') {
        const belt = sub(o, (x, y) => Math.min(waist - 0.004 - y, y - (waist - 0.034)), null, 0, 0.004);
        belt.material.map = null; belt.material.color.set('#5a3a22'); if (belt.material.shadeColorFactor) belt.material.shadeColorFactor.set('#3a2414'); belt.material.needsUpdate = true;
      }
      o.visible = false;
    }
  }
  if (mode !== 'venture') {
    // 綠色長襪：膝下 4 cm 到腳眼
    const so = sub(bodyM, (x, y) => Math.min(kneeY - 0.04 - y, y - ankleY + 0.01), null, 0, 0.007);
    so.material.map = null; so.material.color.set(SOCK); if (so.material.shadeColorFactor) so.material.shadeColorFactor.set('#1c2e1a'); so.material.needsUpdate = true;
  }
  vrm.update(0);
  const cam = E.camera, ctl = E.controls, head = E.preview.head();
  const cy = head.y * 0.55, dist = head.y * 2.6;
  const ang = view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : 0;
  cam.position.set(Math.sin(ang) * dist, cy, Math.cos(ang) * dist); ctl.target.set(0, cy, 0); ctl.update();
  return JSON.stringify(out);
};
