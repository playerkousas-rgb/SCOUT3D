import yaml, sys, copy
from pathlib import Path
sys.path.insert(0, '/tmp/gc')
from assets.garment_programs.meta_garment import MetaGarment
from assets.bodies.body_params import BodyParameters
d = yaml.safe_load(open('assets/design_params/default.yaml'))['design']
b = yaml.safe_load(open('assets/bodies/mean_female.yaml'))
# cub girl ~133 cm: scale linear measurements
k = 133 / b['body']['height']
for key, v in b['body'].items():
    if key not in ('arm_pose_angle', 'shoulder_incl', 'hip_inclination'): b['body'][key] = v * k
yaml.safe_dump(b, open('/tmp/gcs/cub_girl.yaml', 'w'))
body = BodyParameters('/tmp/gcs/cub_girl.yaml')
d['meta']['upper']['v'] = None
d['meta']['bottom']['v'] = 'Pants'
d['meta']['wb']['v'] = 'StraightWB'
d['pants']['length']['v'] = 0.35
d['pants']['width']['v'] = 1.45
d['pants']['flare']['v'] = 1.2
g = MetaGarment('cub_culottes', body, d)
p = g.assembly()
print('self-intersecting', g.is_self_intersecting())
out = p.serialize(Path('/tmp/gcs/out'), tag='', to_subfolder=True, with_3d=False, with_text=False, view_ids=False, with_printable=False)
print('saved', out)
