# 0027 — 外觀只留「流線」；人形試做 A（修正）同 B（真人人台）俾用戶比較

SCOUT3D v1.0 · © SCOUT SYSTEM

- Status: trial（2026-11-16）— A／B 等用戶揀；揀咗之後另開 ADR 定案，冇揀嘅一款會刪走

用戶 v30 三個決定：

1. 旅巾遮住少少香港特區章（小童軍、幼童軍、童軍上身窄）—— **維持現狀**（揀 (a)），同真人戴法一樣。
2. 「那應該多小能減輕一點負擔」—— 外觀**只留「流線」**，刪「精緻」同「簡約」。
3. 「A B 你各做一個比我預覽下先」—— 研究文件（`docs/research/realistic-mannequin.md`）嘅路線 A（修正現有程序公仔）同路線 B（真人人台）**各做一個試做**，俾用戶比較先再決定。

## 決定 — 只留「流線」

- `LOOKS = ['smooth']`；外觀掣、`LookContext`、`roundedBox`／`plainBox`（ADR-0023）、方塊頭髮／手／孖辮貼圖、`texOf` 全部刪走；`Box` 一定用 `smoothBox`，一定有立體頭髮、手指（`SmoothHead`／`SmoothHand`）。
- 章嘅厚度、金屬反光（ADR-0023 嘅 `BADGE_LIFT`、`isMetalBadge`）同屈面（ADR-0024 `bendGeometry`）保留，唔再睇外觀模式。
- 章位置照舊由 `badgeLayout.js` 用厘米計，同外觀無關（測試鎖住）。

## 決定 — 人形掣（試做比較）

- `FIGURES = ['current', 'a', 'b']`，`FigureContext`；掣喺 3D 畫面下面一列（同視角掣一齊），撳一下轉下一款；記喺瀏覽器（`scout3d.figure`），網址 `?figure=a`／`?figure=b` 可以直接開（截圖用）。
- 三款章嘅厘米位置一樣：A 只改頭同四肢形狀；B 嘅身體縱向拉到膊頂 = `L.top`，章由方塊面投影返落衫面。

## 試做 A —— 修正現有公仔

- 頭：`figureLayout(L, 'a')` 頭闊 × 0.76、深 × 0.9（真人約 15–16 cm 闊，以前大 35%），下巴收窄（`HEAD_A.profile`）；頭高唔變，所以帽、頭髮、旅巾位照計。有五官同頭髮（唔係人台）。
- 關節：上臂、前臂（手肘收、前臂脹）、小腿（膝頭、小腿肚）、褲管用 `profile` 收窄；手肘屈 12°（`ELBOW_BEND_A`）；膊頭收圓多啲（`torsoA`，`TORSO_RE_TOP_A` 3.6 cm）。
- 皮膚：`skinMaterial(painted, rich)` 用 MeshPhysicalMaterial（sheen），有體積感。

## 試做 B —— 真人人台

- 身體：Anny 0.6.2（NAVER，Apache-2.0）生成嘅 MakeHuman／MPFB2 身體（**CC0**），每個支部 × 男女一個身形（年齡、身高跟 `body.js`），手臂垂落（Powell 擬合）；刪眼球、口腔；塊面推去「灰度閉運算填平咗眼縫同口」嘅正面高度圖，再 Taubin 平滑，做無面容人台面（保留柔和嘅鼻同下巴）；縱向拉到膊頂 = `L.top`。冇用 SMPL／SMPL-X 拓撲（非商業）。
- 開發用腳本 `scripts/mannequin/build_mannequin.py`（要自己裝 anny、torch；唔係 build 一部分）。輸出 `public/models/mannequin/`：`faces.bin`（u16）、`regions.bin`（u8，16 區）、10 個 `<支部>_<性別>.bin`（i16，1/40 cm）、`index.json`、`LICENSE.md`；共約 1 MB，dist 由 5.29 MB 升到約 6.29 MB（guard S7 上限 10 MB）。
- 衫褲：`src/three/mannequin.js`（純計算、node 測試得到）由皮膚沿法線推出殼（恤衫 0.75–1.5 cm、袖 0.8–2.1 cm、褲 0.45–1.1 cm＋褲管闊度、襪、鞋），切口用頂點 alpha＋alphaTest。恤衫上身用原本方塊貼圖（胸袋、鈕、皮帶）以方塊平面投影（UV 頂截住，唔會拉長領口），膊頭向上嘅面改用前／後幅；袖素色（`shirtPalette`）。塞入褲：大髀嗰截恤衫喺褲頭下 1 cm 停（小童軍唔塞）。半截裙（深資、樂行、女領袖）：裙下面絲襪貼身（0.12 cm），裙係每 2 cm 一圈、每個角度量身體最外半徑＋0.8 cm 嘅筒（`skirtRings`），向下唔收窄，裙腳微散。
- 章：上身由正面投影高度圖（只用上身三角形），袖章由手臂座標側面投影；`snapToSurface` 見到 `S.snap` 就用網格表面。`facing: 'up'` 嘅嘢（例如笛繩扣）唔畫。
- 未做（試做範圍外）：旅巾、帽、頭髮、笛繩、專章帶、毛衣、連身裙／晚禮服。如果用戶揀 B，下一輪補返，再刪方塊身體。

## 後果

- 揀 A：刪 `Mannequin.jsx`／`mannequin.js`／`public/models/mannequin/`／腳本，A 變預設，`figureLayout` 合併入 `layout`。
- 揀 B：補返旅巾、帽、笛繩、專章帶、毛衣、連身裙；A 嘅改動同 `current` 刪走。
- 測試：`tests/v30.test.mjs`（外觀、人形、A 嘅頭、人台檔大細／授權／對齊、無面容、衫褲殼、高度圖投影、i18n、半截裙）；v17、v25、v26、v27、v29 改返只剩流線。共 313 個。
