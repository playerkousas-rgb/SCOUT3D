# 真人人台模型（SCOUT3D v30 試做 B）

呢個資料夾嘅 `*.bin`、`index.json` 由 `scripts/mannequin/build_mannequin.py` 生成。

- **身體數據**：MakeHuman／MPFB2 嘅 base mesh、targets、rig，以 **CC0 1.0 Universal**（公有領域）發佈。
  https://github.com/makehumancommunity/mpfb2
- **生成工具**：Anny 0.6.2，© 2025 NAVER Corporation，**Apache License 2.0**。
  https://github.com/naver/anny
  我哋冇再發佈 Anny 嘅程式碼，只係用佢喺開發機計出身形（年齡、性別、身高）同姿勢。
- 冇用 SMPL／SMPL-X 拓撲（非商業授權）。

SCOUT3D 做咗以下修改：刪咗眼球同口腔網格、塊面平滑（無面容）、縱向拉伸對齊 body.js 嘅膊頂高度、
手臂垂落姿勢、換做 SCOUT3D 座標（cm，+X = 穿著者左、+Y = 上、+Z = 前）。

---

Body data: MakeHuman / MPFB2 assets, CC0 1.0. Generated with Anny 0.6.2 (© 2025 NAVER Corporation, Apache-2.0).
No SMPL/SMPL-X topology is used.
