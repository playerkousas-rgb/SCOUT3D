# 真人人台模型（SCOUT3D v33，ADR-0030）

呢個資料夾嘅 `*.bin`、`index.json` 由 `scripts/mannequin/build_mh.mjs` 生成，`tex/` 由 `scripts/mannequin/mh_textures.py` 生成；
來源係 [ffunch/vrm-avatar-maker](https://github.com/ffunch/vrm-avatar-maker) 嘅 `web/assets/`。

- **身體、衫褲、頭髮、鞋、眼、眉、皮膚貼圖**：MakeHuman 社群素材，**CC0 1.0 Universal**（公有領域）。
  - 身體：MakeHuman base mesh、macro targets、rig／skin weights（https://github.com/makehumancommunity）
  - 衫褲：`male_casualsuit01`（有領恤衫＋褲）、`female_elegantsuit01`（半截裙）、`shoes01`
  - 頭髮：`short02`（男仔）、`toigo_blunt_bob`（女仔）；眉 `eyebrow001`、眼睫毛 `eyelashes01`、眼 `low-poly`（`eye_brown`）
  - 皮膚：`skin_young_asian_male／female`
- **轉換程式（參考）**：vrm-avatar-maker，**MIT License**（.mhclo 套衫、macro 調身形、骨權重插值嘅做法）。
  我哋冇發佈佢嘅程式碼；`build_mh.mjs` 係 SCOUT3D 自己寫嘅 node 版本。
- 冇用 SMPL／SMPL-X 拓撲（非商業授權）；冇用 Mixamo（唔可以再發佈）。

SCOUT3D 做咗以下修改：按支部調年齡（7–30 歲）、性別、肌肉、體重、亞洲 85%；制服企姿（手垂直、腳併埋）bake 入頂點；
縮放到 body.js 嘅膊頂高度；換做 SCOUT3D 座標（cm，+X = 穿著者左、+Y = 上、+Z = 前）；
衫褲按制服切（袖長、衫腳、褲腳、裙腳），再上制服顏色（貼圖只留摺痕明暗）；頭髮、眉變灰階再乘髮色；貼圖縮細。

---

Body, clothes, hair, shoes, eyes, brows and skin textures: MakeHuman community assets, CC0 1.0, taken from
ffunch/vrm-avatar-maker `web/assets/` (its code is MIT; only its approach was re-implemented). Morphed, posed
(arms down, legs together), scaled, cut to uniform lengths and recoloured by SCOUT3D.
