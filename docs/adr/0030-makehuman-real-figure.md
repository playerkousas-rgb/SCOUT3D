# 0030 — B 人台換做 MakeHuman 真人身體＋真衫褲

SCOUT3D v1.0 · © SCOUT SYSTEM

- Status: accepted（v33 第一輪，待用戶驗收六個支部嘅正面、側面、背面圖）
- 取代 ADR-0029（「童軍中性底」＋自己推出嚟嘅布料，用戶話「唔似衫、唔似人」）
- 延續 ADR-0027／0028（章嘅厘米位置、配件變形貼身照舊）

## 背景

v32 交咗之後用戶話「你還是不明白那重點」：件衫唔似衫，身體（上身、個頭）唔似人；叫我搵 GitHub 現成資源，真係唔得先返去方塊人。
調查之後揀咗 [ffunch/vrm-avatar-maker](https://github.com/ffunch/vrm-avatar-maker)：程式 MIT、素材 CC0（MakeHuman 社群）；有身體、
.mhclo 衫褲（有領恤衫、半截裙、鞋）、頭髮、眼、眉、皮膚貼圖，全部可以喺 node 計（唔使 Blender）。

試做（`docs/research/makehuman-cc0-demo.jpg`、`makehuman-uniform-spike.jpg`）用戶意見：面（眼耳口鼻）OK；頭髮怪要換；著制服唔可以打開手、
打開腳；最後一張制服試做「好像還不錯，接入 3D 取代而家 B 人台」。

## 決定

### 建置（離線，`scripts/mannequin/`）

- `build_mh.mjs <vrm-avatar-maker>/web/assets`：讀 base／macros／rig／skin／items（同 `web/lib/avatar-core.js` 一樣嘅格式），
  1. macro 調身形：年齡（小草蜢 7、幼童軍 9.5、童軍 12.5、深資 16、領袖 30 歲）、性別（男 0.8–1、女 0–0.2）、肌肉 0.5、體重 0.45、亞洲 85%／白人 15%；
  2. .mhclo 套衫（`fitItem`），衫裙推出 0.3 mm×比例；骨權重經 refs 插值；
  3. 制服企姿 bake 入頂點（線性蒙皮）：上臂近乎垂直（離身少少）、前臂微微向前、大髀向中間收（腳併埋）；
  4. 縮放：肩峰 = body.js `L.top`（章位一致）；地面 = 腳底；Int16 = cm × 40。
  輸出 `public/models/mannequin/`：焊埋身體（`faces.bin`、`regions.bin`、`{key}.bin`，同以前一樣格式，舊嘅計算照用）、
  渲染身體（`body_render_*`、`body_uv.bin`）、每件嘢嘅拓撲（`{item}_src／faces／uv／regions／hides.bin`）同每個身形嘅位置（`{key}_{item}.bin`）。
  男仔：恤衫褲、短髮 `short02`；女仔：再加半截裙、齊肩 bob `toigo_blunt_bob`（試做時用戶話怪嘅 `short04` 唔用）。
- `mh_textures.py`：皮膚（亞洲年輕男女）縮到 1024；頭髮、眉、眼睫毛變灰階（平均 0.5）網頁乘髮色；衫褲鞋只留模糊咗嘅「摺痕明暗」灰階圖，顏色由制服決定。
- 大細：資料夾約 2.6 MB（v32 約 1 MB）；dist 約 7.9 MB，喺 guard S7 10 MB 以內。

### 網頁（`src/three/mh.js` 純計算、`Mannequin.jsx`）

- `keepDistance` → `clipMesh`：按「保留距離」沿 K = 0 幾何切（直邊）。恤衫：衫腳 = 腰（大髀關節上面；小草蜢唔塞，腰下 9 cm）、
  袖口 = 肩縫下 `B.sleeve.len`（長袖去到手腕）。褲：腰 → `pantsHem`，唔要手臂（件衫長袖垂到褲頭下面）。
  裙：腰 → `skirt.hem`，最低去到兩側嘅裙腳（.mhclo 喺兩腳之間拉低咗一個尖）。鞋：腳眼上 2.5 cm 切走（`shoes01` 自帶白襪）。
  頭髮：戴帽就帽口以上切走。
- `hiddenBody`：件衫嘅 `delete_verts` 入面、而且喺切口入面 2.5 cm 以上嘅身體頂點先收埋（切短咗嘅衫唔會見窿）。
- 恤衫照用恤衫方塊貼圖（袋、鈕、肩章）＋ `shaded()` 乘真衫摺痕明暗（`uvShade`）；`torsoGroups(…, { plainOutside })`：方塊以外
  （兩側、衫腳下面、側面）用素色，唔會拉長貼圖邊變一條條橫紋。褲、裙、鞋 = 制服顏色 × 摺痕明暗（唔用布紋法線，MakeHuman UV 唔係 cm）。
- 襪、半截裙嘅肉色絲襪、毛衣／背心／禮服外套照舊由身體推出（貼身嘢用殼最自然）；外套離身再加 0.8 cm 包住真衫。
- 章（正面高度圖、袖外側高度圖）、旅巾／笛繩變形（`bodyWarp`）、帽（`headBox`）全部改為量真衫同真人身體。
- `Blocky.jsx`：人台唔再加方塊企領（真衫本身有衣領）。
- 貼圖未載完先用一格底色（皮膚色、白色；頭髮透明），唔會一陣黑色皮膚。

## 第二輪（v33r2）

- **胸袋**（`pocketGeometry`）：真衫正面高度圖上面砌立體袋身（鼓起 0.3 cm、有邊）、袋蓋（中間尖 1.2 cm、厚 0.3 cm）同鈕；
  位置、大細 = `B.pocket`（`top` 由上身方塊頂量），uv = 方塊正面投影，所以恤衫貼圖嘅袋線、鈕對得上。袋併入正面高度圖，
  章（`TorsoBadges`）同 `bodyWarp`（旅巾前面、笛繩）都跟住袋面。只限有袋嘅杏色恤衫（幼童軍以上、領袖；外衣蓋住就唔做）。
- **旅巾圈**（`collarRing` + `rollTube`）：舊做法係方塊圈經 `neckWarp` 變形；`neckField` 取最入嗰個交點（頸皮），真衫衣領
  一厚就喺頸兩邊企起。改為直接量真衫：每 10° 搵衣領頂同衣領（連翻領）外半徑 → 圈擱喺領頂、包住翻領；前面兩條由頸邊
  三次曲線落到巾圈，逐點推出衫面。橫切面扁橢圓（約 3.3 × 1.4 cm），貼圖用返旅巾花款（左右可以唔同）。
  人台唔再畫方塊圈同上截巾尾；背後三角頂加一條窄布（唔闊過衣領）接到巾圈。
- **裙褲**（`pleatDepth`）：真裙切細（0.6 cm）再沿法線壓入四條 V 形直摺（前後各兩條，±0.35 rad），腰頭下 6 cm 車死、
  之後 6 cm 漸深到 1.1 cm；摺入面用頂點色暗少少、摺線一條深色。
- **鞋**：小草蜢白色波鞋（同現有公仔），其他黑皮鞋。
- **戴帽**：頭髮切喺帽口（`hatCut`），唔再「最少切到眉上 3 cm」（女領袖晚禮服帽下面露頭皮）；方盒帽按帽口嗰度頭髮
  厚度闊返（最多 4 cm），包住切口。
- **貼圖遲載**：WebGL2 貼圖儲存大小固定，1×1 底色上咗 GPU 之後換大圖會失敗（女仔後載：光頭、皮膚冇紋理）→ 換圖前 `dispose()`。
- **GarmentCode 試驗**另開（`docs/research/garmentcode-spike/`），唔影響主線。

## 未做

- 笛繩、專章帶仍然用 `bodyWarp.route`／`sashMesh` 貼真衫（第一輪已改為量真衫，今輪冇再改）。
- 肩帶（深資、樂行、領袖）仍然係方塊經變形；肩章跟肩帶。

## 驗證

- 第二輪：`npm test`（`tests/v33r2.test.mjs`）；驗收圖 `docs/acceptance/v33r2-{f,s,b}.jpg`。

- `npm test` 330 個（`tests/v33.test.mjs` 9 個新；v32 身形測試 4 個退役；v30 檔案大細／身高容差、v31 笛繩陷入容差按真衫調）。
- 無頭 Chromium 截圖：`docs/acceptance/v33-{f,s,b}.jpg`（六個支部：小草蜢男、幼童軍女、童軍男、深資女、樂行男、領袖女）。
