"""
SCOUT3D v30 試做 B：用 Anny（NAVER LABS，Apache 2.0；身體數據 = MakeHuman／MPFB2，CC0）
生成各支部嘅無面容真人人台，匯出細小嘅二進制檔俾網站即場載入（public/models/mannequin/）。

只喺開發機行一次（網站唔使 Python）：
    python3 -m venv /tmp/av && /tmp/av/bin/pip install torch anny pillow requests pyyaml scipy
    /tmp/av/bin/python scripts/mannequin/build_mannequin.py

輸出（所有人台同一套拓撲，三角形同部位標籤只存一次）：
    faces.bin      Uint16 × 3 × 三角形數
    regions.bin    Uint8 × 頂點數（REGIONS 次序，由蒙皮權重最大嘅骨決定）
    <body>.bin     Int16 × 3 × 頂點數，單位 = 1/40 cm（SCOUT3D 座標：+X = 穿著者左、+Y = 上、+Z = 前，腳底 y = 0）
    index.json     單位、授權、每個人台嘅關節位置（cm）

身形：年齡 → Anny age（0 = 1 歲、1/3 = 11 歲、2/3 = 25 歲、1 = 90 歲），男 gender 0／女 1，肌肉、體重 0.5。
再整體縮放到 body.js 嘅身高，然後縱向分段拉伸，令肩峰（膊頭最高點）= body.js 嘅膊頂 L.top，
咁 badgeLayout.js 以厘米計嘅章位唔使改（ADR-0027）。
姿勢：手臂由 A 字垂落（外展約 6°）、手踭微屈 12°；兩腳收埋企直。
無面容：刪走眼球、口腔（獨立嘅細網格），塊面（眉到下巴）推去填平咗眼縫同口嘅高度圖，再做 Taubin 平滑，變成人台蛋面，只留淡淡嘅鼻同下巴輪廓。
© SCOUT SYSTEM · SCOUT3D v1.0
"""
import json, math, os, sys
import numpy as np
import torch
import anny
from scipy.optimize import minimize
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'models', 'mannequin')
UNIT = 40  # 每 cm 幾多格（Int16）

# body.js：身高、膊頂 L.top（= torso.y + torso.h）、年齡
BODIES = {
    'grasshopper': {'boy': (117, 92, 7), 'girl': (117, 92, 7)},
    'cub': {'boy': (135, 108, 10), 'girl': (135, 108, 10)},
    'scout': {'boy': (155, 127, 13), 'girl': (155, 127, 13)},
    'venture': {'boy': (168, 138, 17), 'girl': (168, 138, 17)},  # 樂行童軍同一套尺寸
    'leader': {'boy': (172, 138 * 172 / 168, 30), 'girl': (160, 138 * 160 / 168, 30)},
}

REGIONS = ['head', 'neck', 'torso', 'pelvis', 'upperarmL', 'upperarmR', 'lowerarmL', 'lowerarmR', 'handL', 'handR',
           'upperlegL', 'upperlegR', 'lowerlegL', 'lowerlegR', 'footL', 'footR']



def face_flatten(P, F, head, wgt, adj, deg, cell=0.25, close_cm=2.4, sigma=0.6, iters=1500):
    """無面容：塊面正面高度圖（每格最外 z）→ 灰度閉運算（填平細過 close_cm 嘅眼縫、口）→ 輕微模糊，
    再將塊面頂點（按 wgt）推去呢個面。鼻、下巴係凸出嚟，閉運算唔會削走，只係變柔和。"""
    from scipy.ndimage import gaussian_filter, grey_closing, map_coordinates
    m = head & (P[:, 2] > 0)
    x0, x1 = P[m, 0].min() - 1, P[m, 0].max() + 1
    y0, y1 = P[m, 1].min() - 1, P[m, 1].max() + 1
    nu = int((x1 - x0) / cell) + 1
    nv = int((y1 - y0) / cell) + 1
    H = np.full((nv, nu), -np.inf)
    for a, b, c in F[m[F].all(1)]:
        A, B, C = P[a], P[b], P[c]
        xs = np.array([A[0], B[0], C[0]])
        ys = np.array([A[1], B[1], C[1]])
        den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1])
        if abs(den) < 1e-12:
            continue
        u0, u1 = int((xs.min() - x0) / cell), min(nu - 1, int((xs.max() - x0) / cell) + 1)
        v0, v1 = int((ys.min() - y0) / cell), min(nv - 1, int((ys.max() - y0) / cell) + 1)
        uu, vv = np.meshgrid(np.arange(u0, u1 + 1), np.arange(v0, v1 + 1))
        X, Y = x0 + uu * cell, y0 + vv * cell
        l1 = ((B[1] - C[1]) * (X - C[0]) + (C[0] - B[0]) * (Y - C[1])) / den
        l2 = ((C[1] - A[1]) * (X - C[0]) + (A[0] - C[0]) * (Y - C[1])) / den
        l3 = 1 - l1 - l2
        ok = (l1 >= -1e-3) & (l2 >= -1e-3) & (l3 >= -1e-3)
        Z = l1 * A[2] + l2 * B[2] + l3 * C[2]
        sub = H[v0:v1 + 1, u0:u1 + 1]
        upd = ok & (Z > sub)
        sub[upd] = Z[upd]
    valid = np.isfinite(H)
    Hf = np.where(valid, H, H[valid].min())
    k = int(round(close_cm / cell)) | 1
    yy, xx = np.mgrid[-(k // 2):k // 2 + 1, -(k // 2):k // 2 + 1]
    Hc = grey_closing(Hf, footprint=(xx ** 2 + yy ** 2) <= (k // 2) ** 2)
    num = gaussian_filter(np.where(valid, Hc, 0), sigma / cell)
    dd = gaussian_filter(valid.astype(float), sigma / cell)
    S = np.where(dd > 0.2, num / np.maximum(dd, 1e-3), Hf)
    surf = lambda x, y: map_coordinates(S, [(y - y0) / cell, (x - x0) / cell], order=1, mode='nearest')
    # 推去高度圖之後，眼皮、口唇嗰啲好密嘅頂點會疊埋（三角形反轉、出黑點）：
    # 塊面頂點喺 x、y 方向做切向平滑（每次再投影返落高度圖），疊埋嘅頂點會散返開
    Q = P.copy()
    w = wgt.ravel()
    for _ in range(iters):
        avg = (adj @ Q) / deg[:, None]
        Q[:, :2] += (w * 0.6)[:, None] * (avg[:, :2] - Q[:, :2])
        Q[:, 2] += w * (surf(Q[:, 0], Q[:, 1]) - Q[:, 2])
    return Q

def age_param(years):
    pts = [(1, 0.0), (11, 1 / 3), (25, 2 / 3), (90, 1.0)]
    for (y0, a0), (y1, a1) in zip(pts, pts[1:]):
        if years <= y1:
            return a0 + (a1 - a0) * (years - y0) / (y1 - y0)
    return 1.0


def region_of(label):
    side = 'L' if label.endswith('.L') else 'R' if label.endswith('.R') else ''
    b = label.split('.')[0]
    if b.startswith(('head', 'jaw', 'eye', 'special', 'tongue', 'levator', 'oris', 'orbicularis', 'temporalis', 'risorius', 'mandible')):
        return 'head'
    if b.startswith('neck'):
        return 'neck'
    if b.startswith(('spine', 'clavicle', 'breast', 'shoulder', 'root')):
        return 'torso'
    if b.startswith('pelvis'):
        return 'pelvis'
    if b.startswith('upperarm'):
        return 'upperarm' + side
    if b.startswith('lowerarm'):
        return 'lowerarm' + side
    if b.startswith(('wrist', 'finger', 'metacarpal', 'thumb')):
        return 'hand' + side
    if b.startswith('upperleg'):
        return 'upperleg' + side
    if b.startswith('lowerleg'):
        return 'lowerleg' + side
    if b.startswith(('foot', 'toe')):
        return 'foot' + side
    return 'head'


def rotvec_mat(r):
    r = np.asarray(r, float)
    t = np.linalg.norm(r)
    M = np.eye(4)
    if t < 1e-9:
        return M
    a = r / t
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    M[:3, :3] = np.eye(3) + math.sin(t) * K + (1 - math.cos(t)) * K @ K
    return M


def main():
    torch.set_grad_enabled(False)
    model = anny.Anny().to(dtype=torch.float32)
    labels = list(model.bone_labels)
    idx = {n: i for i, n in enumerate(labels)}
    faces = model.faces.numpy().astype(np.int64)
    w = model.vertex_bone_weights.numpy()
    bi = model.vertex_bone_indices.numpy()
    dom = bi[np.arange(len(bi)), w.argmax(1)]
    regions = np.array([REGIONS.index(region_of(labels[d])) for d in dom], np.uint8)
    # 只留最大嘅網格（刪眼球、口腔／牙）→ 重新編號
    n0 = len(regions)
    r_, c_ = np.concatenate([faces[:, 0], faces[:, 1], faces[:, 2]]), np.concatenate([faces[:, 1], faces[:, 2], faces[:, 0]])
    _, lab = connected_components(coo_matrix((np.ones(len(r_)), (r_, c_)), shape=(n0, n0)), directed=False)
    keep_v = lab == np.bincount(lab).argmax()
    remap = -np.ones(n0, np.int64)
    remap[keep_v] = np.arange(keep_v.sum())
    faces = remap[faces[keep_v[faces[:, 0]]]]
    regions = regions[keep_v]
    nV = len(regions)
    # 鄰接（Taubin 平滑用）
    e = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    e = np.concatenate([e, e[:, ::-1]])
    adj = coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(nV, nV)).tocsr()
    adj.data[:] = 1
    deg = np.asarray(adj.sum(1)).ravel()
    assert nV < 65536
    os.makedirs(OUT, exist_ok=True)
    faces.astype('<u2').tofile(os.path.join(OUT, 'faces.bin'))
    regions.tofile(os.path.join(OUT, 'regions.bin'))
    index = {
        'unit': UNIT, 'vertices': int(nV), 'triangles': int(len(faces)), 'regions': REGIONS,
        'source': 'Anny 0.6.2 (NAVER LABS Europe, Apache-2.0) · MakeHuman/MPFB2 body data (CC0 1.0)',
        'bodies': {},
    }

    def run(pose, ph):
        out = model(pose_parameters=torch.tensor(pose, dtype=torch.float32)[None], phenotype_kwargs=ph)
        return out['vertices'][0].numpy(), out['bone_poses'][0].numpy()

    for section, genders in BODIES.items():
        for gender, (height, ltop, years) in genders.items():
            ph = {k: 0.5 for k in model.phenotype_labels}
            ph.update(gender=0.0 if gender == 'boy' else 1.0, age=age_param(years), proportions=0.0, muscle=0.5, weight=0.5)
            base = np.tile(np.eye(4), (len(labels), 1, 1))

            def head_of(bp, n):
                return bp[idx[n]][:3, 3]

            def posed(x):
                p = base.copy()
                for s, sg in (('L', 1), ('R', -1)):
                    m = np.array([1, sg, sg])  # 左右鏡像（繞 y、z 軸角度反向）
                    p[idx['upperarm01.' + s]] = rotvec_mat(x[0:3] * m)
                    p[idx['lowerarm01.' + s]] = rotvec_mat(x[3:6] * m)
                    p[idx['upperleg01.' + s]] = rotvec_mat(np.array([0, x[6], 0]) * m)
                    p[idx['foot.' + s]] = rotvec_mat(np.array([0, -x[6], 0]) * m)
                return p

            # Anny 座標：+x = 左、+z = 上、−y = 前
            ab, fl = math.radians(6), math.radians(12)
            d_up = np.array([math.sin(ab), 0, -math.cos(ab)])
            d_fo = d_up * math.cos(fl) + np.array([0, -1, 0]) * math.sin(fl)

            def cost(x):
                _, bp = run(posed(x), ph)
                sh, el, wr = head_of(bp, 'upperarm01.L'), head_of(bp, 'lowerarm01.L'), head_of(bp, 'wrist.L')
                u = (el - sh) / np.linalg.norm(el - sh)
                f = (wr - el) / np.linalg.norm(wr - el)
                hip, ank = head_of(bp, 'upperleg01.L'), head_of(bp, 'foot.L')
                lg = (ank - hip) / np.linalg.norm(ank - hip)
                # 拇指向前：腕 → 拇指根喺前面（−y）
                th = head_of(bp, 'finger1-1.L') - wr
                thumb = max(0.0, th[1] / (np.linalg.norm(th) + 1e-9) + 0.5)
                return (np.sum((u - d_up) ** 2) * 4 + np.sum((f - d_fo) ** 2) * 2 + (lg[0] - math.sin(math.radians(1.5))) ** 2 * 4
                        + thumb ** 2 + 0.002 * np.sum(np.asarray(x) ** 2))

            res = minimize(cost, np.array([0, 0.6, 0, 0, 0, 0, -0.05]), method='Powell', options={'maxiter': 3000, 'xtol': 1e-3, 'ftol': 1e-6})
            V, bp = run(posed(res.x), ph)
            V = V[keep_v]
            # → SCOUT3D cm：X = x、Y = z、Z = −y
            P = np.stack([V[:, 0], V[:, 2], -V[:, 1]], 1) * 100.0
            J = {n: np.array([bp[idx[n]][0, 3], bp[idx[n]][2, 3], -bp[idx[n]][1, 3]]) * 100.0 for n in labels}
            y0 = P[:, 1].min()
            P[:, 1] -= y0
            for n in J:
                J[n][1] -= y0
            k = height / P[:, 1].max()
            P *= k
            for n in J:
                J[n] *= k
            # 肩峰：上臂關節正上方（±2 cm）嘅最高點
            sh = J['upperarm01.L']
            near = (np.abs(P[:, 0] - sh[0]) < 2.0) & (np.abs(P[:, 2] - sh[2]) < 4.0) & np.isin(regions, [REGIONS.index(r) for r in ('torso', 'upperarmL')])
            acro = P[near, 1].max()

            def warp(y):
                return np.where(y <= acro, y * ltop / acro, ltop + (y - acro) * (height - ltop) / (height - acro))

            P[:, 1] = warp(P[:, 1])
            for n in J:
                J[n][1] = warp(np.array(J[n][1]))
            # 無面容：塊面（頭部、前面、眉以下、下巴以上）Taubin 平滑；邊位權重漸變
            head = regions == REGIONS.index('head')
            topH = P[head, 1].max()
            hh = topH - P[head, 1].min()
            hz = J['head'][2]
            ss = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))
            hw = np.abs(P[head, 0]).max()
            # 前面半個頭（包埋眼窩、口腔入面嘅頂點，佢哋 z 比塊面細），左右只到 0.75 × 半頭闊（唔郁耳仔）
            fn = np.cross(P[faces[:, 1]] - P[faces[:, 0]], P[faces[:, 2]] - P[faces[:, 0]])
            vn = np.zeros_like(P)
            for k in range(3):
                np.add.at(vn, faces[:, k], fn)
            nz = vn[:, 2] / np.maximum(np.linalg.norm(vn, axis=1), 1e-12)
            front = np.clip((nz - 0.1) / 0.3, 0, 1)
            # 下巴底、面頰外側（法線向側）只郁向前嘅頂點；眼、口（中間）全部郁
            chin = np.maximum(front, ss(topH - 0.93 * hh, topH - 0.89 * hh, P[:, 1]))
            cheek = np.maximum(front, 1 - ss(0.5 * hw, 0.58 * hw, np.abs(P[:, 0])))
            wgt = head * ss(hz - 4, hz - 1, P[:, 2]) * (1 - ss(0.55 * hw, 0.7 * hw, np.abs(P[:, 0]))) * ss(topH - 0.96 * hh, topH - 0.92 * hh, P[:, 1]) * chin * cheek * (1 - ss(topH - 0.4 * hh, topH - 0.32 * hh, P[:, 1]))
            wgt = wgt[:, None]
            # 先將塊面推去「填平咗眼縫、口」嘅正面高度圖，再 40 輪 Taubin 保體積（拉普拉斯對密嘅眼皮網格冇效）
            P = face_flatten(P, faces, head, wgt, adj, deg)
            for it in range(40):
                for lam in (0.5, -0.53):
                    avg = (adj @ P) / deg[:, None]
                    P = P + wgt * lam * (avg - P)
            q = np.round(P * UNIT)
            assert np.abs(q).max() < 32767
            name = f'{section}_{gender}'
            q.astype('<i2').tofile(os.path.join(OUT, name + '.bin'))
            pick = lambda n: [round(float(c), 2) for c in J[n]]
            index['bodies'][name] = {
                'height': height, 'top': round(ltop, 2), 'years': years, 'acromionScale': round(float(ltop / acro), 4),
                'joints': {key: pick(n) for key, n in {
                    'shoulderL': 'upperarm01.L', 'shoulderR': 'upperarm01.R', 'elbowL': 'lowerarm01.L', 'elbowR': 'lowerarm01.R',
                    'wristL': 'wrist.L', 'wristR': 'wrist.R', 'hipL': 'upperleg01.L', 'hipR': 'upperleg01.R',
                    'kneeL': 'lowerleg01.L', 'kneeR': 'lowerleg01.R', 'ankleL': 'foot.L', 'ankleR': 'foot.R', 'neck': 'neck01', 'head': 'head',
                }.items()},
                'pose': [round(float(c), 4) for c in res.x],
            }
            print(name, 'cost', round(float(res.fun), 5), 'acro', round(float(acro), 1), '→', round(ltop, 1), 'x-span', round(float(P[:, 0].max() - P[:, 0].min()), 1), flush=True)
    with open(os.path.join(OUT, 'index.json'), 'w') as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main()
