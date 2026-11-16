import sys, glob, numpy as np, trimesh, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
out = sys.argv[1]
body = trimesh.load('/tmp/gcs/run/bodies/cub_girl_mh.obj', process=False)
sim = sorted(glob.glob('/tmp/gcs/run/out/culottes/*_sim.obj'))
box = '/tmp/gcs/run/out/culottes/culottes_boxmesh.obj'
cl = trimesh.load(sim[0] if sim else box, process=False, force='mesh')
bv = body.vertices * 100
cv = np.asarray(cl.vertices)
if cv[:, 1].max() < 5: cv = cv * 100
print('cloth bbox', cv.min(0), cv.max(0), 'sim' if sim else 'box')
L = np.array([0.3, 0.5, 1.0]); L /= np.linalg.norm(L)
def shade(mesh_v, faces, base):
    tri = mesh_v[faces]
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]); n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
    k = 0.35 + 0.65 * np.abs(n @ L)
    return np.clip(np.outer(k, base), 0, 1)
fig = plt.figure(figsize=(10, 7), dpi=110)
for i, (az, title) in enumerate([(-90, 'front'), (0, 'side')]):
    ax = fig.add_subplot(1, 2, i + 1, projection='3d')
    m = bv[:, 1] < 95
    keep = m[body.faces].all(1)
    polys, cols = [], []
    for V, F, col in [(bv, body.faces[keep], np.array([0.95, 0.8, 0.68])), (cv, np.asarray(cl.faces), np.array([0.45, 0.55, 0.22]))]:
        P = V[:, [0, 2, 1]] * np.array([1, -1, 1])  # z 前 → 圖 −y（azim −90 = 由前望）
        polys.append(P[F]); cols.append(shade(P, F, col))
    pc = Poly3DCollection(np.concatenate(polys), facecolors=np.concatenate(cols), edgecolors='none')
    ax.add_collection3d(pc)
    ax.set_xlim(-25, 25); ax.set_ylim(-25, 25); ax.set_zlim(40, 90)
    ax.view_init(elev=5, azim=az); ax.set_box_aspect((1, 1, 1)); ax.axis('off'); ax.set_title(title)
plt.tight_layout(); plt.savefig(out); print('saved', out)
