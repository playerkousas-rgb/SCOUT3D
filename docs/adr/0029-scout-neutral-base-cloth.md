# 0029 — B 人台：「童軍中性底」＋ 獨立布料衫裙褲

SCOUT3D v1.0 · © SCOUT SYSTEM

- Status: accepted（v32，待用戶驗收三張圖）
- 延續 ADR-0028（B 人台配件做法照舊）

## 背景

用戶 v32 規格：所有支部用一個新嘅「童軍中性底」取代成年女仔底（約 12 歲、中性、頭身 1:6.5、膊頭約等於盤骨、胸／盤骨／肚最少、盤骨平、大髀短啲令身腿 1:1）；衫、裙、褲要係獨立 mesh（唔係皮膚貼圖）、厚 0.3 cm、放大約 3–4%（離身約 1 cm）；恤衫要有領、袖口、衫腳；裙要 2 cm 腰頭加 3–4 條直摺；旅巾要有厚度、巾圈壓入。驗收：正面、側面、背面三張圖，唔好自己話過關。

用戶亦問會唔會用現成開源資源好啲。調查：MakeHuman 社區衣服資產多數係 CC-BY（要署名）同埋要用 MakeHuman／MPFB 嘅 proxy 綁定（`.mhclo`）先套得落身，冇 Blender 喺沙盒做唔到，而且得一般 T-shirt／褲，冇香港童軍制服（兩胸袋、肩帶、弓字褶裙褲）。Anny 本身已經係 MakeHuman/MPFB2 CC0 身體，所以身形用 Anny 局部參數調；衣服照舊由身體推出嚟，但做成真布料。

## 決定

### 身形（`scripts/mannequin/build_mannequin.py`）

- `anny.Anny(local_changes='default', phenotypes='all')`；`BASE_PHENOTYPE`：gender 0.5、age 12 歲（0.357）、proportions 0、muscle／weight／firmness 0.5、cupsize 0。
- `BASE_LOCAL`（Anny 局部參數，有正負）：頭三軸放大 0.65（頭身 1:6.5）、膊頭距 +0.3、臀量 −1、肚 −1、盤骨深 −0.6、上身深 −0.3、大髀長 +0.1。
- 十個身形全部同一個底，只係按支部身高／肩峰高縮放；姿勢擬合只計一次。`index.json` 加 `base`（參數）同每個身形 `years: 12`、`base`、`measure { headRatio, crotchRatio }`。
- 實測：童軍／深資／領袖頭身 6.54–6.61、褲襠高 0.499–0.500；小草蜢／幼童軍身高矮所以頭身 5.6／5.9（同一個頭）。

### 布料（`src/three/mannequin.js`）

- `clothify(shell, { thick, band, lift, smooth })`：喺 k = 0 真係切開三角形（幾何邊）→ 先切後平滑（邊界釘死；先平滑會令切口鋸齒、褲頭前面凹 V）→ 邊位 `band` cm 內再厚 `lift`（摺邊）→ Solidify（反轉內層 + 邊）。回傳 `outerTris`，`torsoGroups` 將內層／邊當普通布（唔畫章）。
- 恤衫離身 1.6、袖 +0.4／+1.1；褲頭（塞衫）2.4 → 6 cm 內收返 1.2，褲管另加 `legEase`。
- `skirtRings`：96 段、2 cm 腰頭（+0.35 再一級）、弓字直摺（腰頭下 6 cm 車死向下漸深）、Solidify；裙頭 `B.waist + 2`、離身 2.1（包住塞入去嘅衫腳）。半截裙無摺（手冊），裙褲（`CULOTTE_PLEATS`）前後各兩條。
- `beltRing`：皮帶以前畫喺皮膚貼圖，布料蓋住咗 → 喺褲頭／裙頭外面量最外半徑另起 3 cm 皮帶圈＋扣（幼童軍、童軍、深資；冷衫／外套蓋住就唔起）。
- 旅巾（`Blocky.jsx`）：B 人台旅巾 `thick` 0.25（boxGeometry），巾圈壓入 0.5。幼童軍帽喺人台上戴到眉上 3 cm（同頭髮收口一致）。

## 驗證

- `docs/acceptance/v32-{f,s,b}.jpg`：童軍女（裙褲）、深資女（半截裙）、童軍男、幼童軍，正面／側面／背面。交用戶驗收，唔自行宣佈過關。
- `tests/v32.test.mjs`（7 個）：同一個底、頭身／腿身、男女相同、膊頭 vs 盤骨、布厚 0.3、褲頭包衫、裙唔係錐形＋有摺＋皮帶。測試共 325 個。

## 已知未做

- 女仔孖辮（B 仍然係及下巴短髮）；褲襠前面有少少凹位；短髮款側面露少少頭皮（髮型本身）。
- 側面睇布料離身約 1–2 cm，未做物理垂墜（冇 Blender／布料模擬）。
