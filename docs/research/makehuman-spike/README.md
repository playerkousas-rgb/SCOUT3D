# MakeHuman CC0 制服試做（v32 spike）

- 來源：[ffunch/vrm-avatar-maker](https://github.com/ffunch/vrm-avatar-maker)（程式 MIT，素材 CC0，MakeHuman 社區）。本機 `web/` 用 `python3 -m http.server 5288` 開，`editor/editor.js` 加咗 `?nohide`（唔好收埋衫底下嘅身體，剪短袖／短褲先唔會穿窿）。
- `mh.mjs`：puppeteer 開 editor（12 歲、亞洲 85%）→ Preview → Standing → 注入 `mhops.js`。
- `mhops.js`：手垂直、腳併埋；件衫（`male_casualsuit01` 恤衫＋牛仔褲／`female_elegantsuit01` 恤衫＋半截裙）按身體骨位切開（幾何切口）：恤衫 → 短袖、杏色；褲 → 膝上 7 cm 短褲、綠色；皮帶圈；身體膝下到腳眼加綠色長襪。換色用模糊咗嘅貼圖明暗。
- 結果：`../makehuman-uniform-spike.jpg`（未有章、旅巾、胸袋、肩帶）。
