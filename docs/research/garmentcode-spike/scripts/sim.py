# GarmentCode 裙褲 spike：MakeHuman CC0 幼童軍女仔身體（唔用 SMPL），CPU 模擬
import sys, json, yaml, numpy as np, os, time, traceback
sys.path.insert(0, '/tmp/gc')
import types
_r = types.ModuleType('pygarment.meshgen.render.pythonrender'); _r.render_images = lambda *a, **k: None
sys.modules['pygarment.meshgen.render.pythonrender'] = _r  # 冇 EGL：唔渲染
os.chdir('/tmp/gcs/run')
R = '/home/user/SCOUT3D/public/models/mannequin/'
idx = json.load(open(R + 'index.json'))
pos = (np.fromfile(R + 'cub_girl.bin', dtype=np.int16).astype(np.float64) / idx['unit']).reshape(-1, 3)
faces = np.fromfile(R + 'faces.bin', dtype=np.uint16).reshape(-1, 3)
reg = np.fromfile(R + 'regions.bin', dtype=np.uint8)
n = len(pos); reg = reg[:n]
# 1. 身體 OBJ（米）＋分區
with open('bodies/cub_girl_mh.obj', 'w') as o:
    for p in pos / 100: o.write('v %f %f %f\n' % tuple(p))
    for f in faces: o.write('f %d %d %d\n' % tuple(f + 1))
lab = {'body': [0, 1, 2, 3], 'left_arm': [4, 6, 8], 'right_arm': [5, 7, 9], 'left_leg': [10, 12, 14], 'right_leg': [11, 13, 15]}
seg = {k: [int(i) for i in np.where(np.isin(reg, v))[0]] for k, v in lab.items()}
seg['face_internal'] = []
json.dump(seg, open('bodies/ggg_body_segmentation.json', 'w'))
# 2. 量度：腰圍、臀圍（橫切面凸包周長）
from scipy.spatial import ConvexHull
def circ(y, regs=(2, 3)):
    m = (np.abs(pos[:, 1] - y) < 0.6) & np.isin(reg, regs)
    h = ConvexHull(pos[m][:, [0, 2]]); return h.area  # 2D: area = 周長
waistY = idx['bodies']['cub_girl']['waist']
hipY = max(np.arange(waistY - 16, waistY - 4, 0.5), key=lambda y: circ(y, (3, 10, 11)))
b = yaml.safe_load(open('/tmp/gcs/cub_girl.yaml'))
b['body']['waist'] = float(circ(waistY)); b['body']['hips'] = float(circ(hipY, (3, 10, 11)))
b['body']['height'] = 133.0
print('waist', b['body']['waist'], 'hips', b['body']['hips'], 'waistY', waistY, 'hipY', hipY)
yaml.safe_dump(b, open('bodies/cub_girl_mh.yaml', 'w'))
json.dump({'output': '/tmp/gcs/run/out', 'bodies_default_path': '/tmp/gcs/run/bodies', 'datasets_path': '', 'datasets_sim': '', 'sim_configs_path': '/tmp/gc/assets/Sim_props', 'body_samples_path': ''}, open('system.json', 'w'))
# 3. 紙樣（Pants：短、闊 → 裙褲）
from pathlib import Path
from assets.garment_programs.meta_garment import MetaGarment
from assets.bodies.body_params import BodyParameters
d = yaml.safe_load(open('/tmp/gc/assets/design_params/default.yaml'))['design']
d['meta']['upper']['v'] = None; d['meta']['bottom']['v'] = 'Pants'; d['meta']['wb']['v'] = 'StraightWB'
d['pants']['length']['v'] = 0.35; d['pants']['width']['v'] = 1.45; d['pants']['flare']['v'] = 1.2
body = BodyParameters('bodies/cub_girl_mh.yaml')
g = MetaGarment('culottes', body, d)
pat = g.assembly()
folder = pat.serialize(Path('/tmp/gcs/run/pattern'), tag='', to_subfolder=True, with_3d=False, with_text=False, view_ids=False, with_printable=False)
# 4. 箱網格 → 對齊 MakeHuman 腰（紙樣用平均女人比例擺位）
from pygarment.meshgen.boxmeshgen import BoxMesh
from pygarment.meshgen.simulation import run_sim
import pygarment.data_config as data_config
from pygarment.meshgen.sim_config import PathCofig
props = data_config.Properties('/tmp/gc/assets/Sim_props/default_sim_props.yaml')
props['sim']['config']['max_sim_steps'] = int(os.environ.get('STEPS', 300))
props['sim']['config']['max_sim_time'] = 1500
props['sim']['config']['max_frame_time'] = 120
props.set_section_stats('sim', fails={}, sim_time={}, spf={}, fin_frame={}, body_collisions={}, self_collisions={})
props.set_section_stats('render', render_time={})
paths = PathCofig(in_element_path=folder, out_path='/tmp/gcs/run/out', in_name='culottes', body_name='cub_girl_mh', smpl_body=False, add_timestamp=False)
bm = BoxMesh(paths.in_g_spec, props['sim']['config']['resolution_scale'])
bm.load()
bm.serialize(paths, store_panels=False, uv_config=props['render']['config']['uv_texture'])
V = []; L = open(paths.g_box_mesh).read().splitlines()
ys = [float(l.split()[2]) for l in L if l.startswith('v ')]
dy = (waistY + 2.5) - max(ys)
print('box top', max(ys), 'shift', dy)
with open(paths.g_box_mesh, 'w') as o:
    for l in L:
        if l.startswith('v '):
            p = l.split(); p[2] = '%f' % (float(p[2]) + dy); l = ' '.join(p)
        o.write(l + '\n')
props.serialize(paths.element_sim_props)
t0 = time.time()
try:
    run_sim(bm.name, props, paths, save_v_norms=False, store_usd=False, optimize_storage=False, verbose=False)
except Exception:
    traceback.print_exc()
print('SIM_SECONDS', time.time() - t0)
print('OUT', sorted(os.listdir(paths.out_el)))
