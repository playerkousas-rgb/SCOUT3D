# 0023 — 「精緻」外觀：圓角方塊、布紋、刺繡／金屬章、影樓燈

SCOUT3D v1.0 · © SCOUT SYSTEM

- Status: accepted（2026-11-15）

用戶 v25：「睇落去係個網頁度靚D同真D」，揀咗方向 1（材質同燈光）同方向 2（精緻化方塊人）都試；「今次唔好一定要靠預覽了」（Vercel 一日 100 次部署上限）——用本機 headless 截圖驗證、一輪先 push 一次。寫實人體模型（glTF＋decal）、相片疊圖、AR 唔做：章位會變形、要重新校準、檔案太大。

## 決定

- 新模組 `src/three/look.js`；`LookContext`（`'detailed'` 預設／`'simple'`）由 `Scene.jsx` 喺 Canvas 入面提供，`Box`、`Plane`、`Patch` 用 `useDetailed()`。
- 介面：檢視列加「外觀：精緻／簡約」掣（`aria-pressed`），記喺 localStorage `scout3d.look`。「簡約」= v24 原本嘅樣（燈、材質、方塊一樣）。
- **只改點樣畫，唔改位置**：`badgeLayout.js`、規則 JSON 冇郁；徽章 x／y 照舊由厘米計。

### 方向 2：方塊精緻化
- 圓角方塊（`roundedBox`，RoundedBoxGeometry，最大半徑 0.6 cm；衫袖 `SLEEVE_RADIUS` 0.2 cm）。外框大小同普通方塊一樣。
- UV 改返「平面投影」（`planarUV`，同 three.js BoxGeometry 一樣）：RoundedBoxGeometry 原本嘅 UV 會將貼圖縮細約 1.5%，令畫喺衫上面嘅袋、縫線同章錯開；而家平面部分一模一樣。
- 長褲收窄（底 0.9）、短褲（1.05）同半截裙（1.08）放闊少少；只限冇章嘅褲／裙。
- 衣領、袋蓋、鈕扣**冇**做成立體：袋蓋同衫面上有章（右袋蓋標誌、先修章等），立體化會令章要改 z 或者陷入去，違反「袋面、袖外側、專章帶保持平面」。留待之後再諗。

### 方向 1：材質同燈光
- 像素貼圖用 Scale2x 放大兩次（每格 0.125 cm）：斜邊（領巾尖、衣領）唔再係樓梯級；線性過濾＋mipmap。
- 布：細雜色（± 2.5%）＋平滑大片光暗；近邊位暗少少（似 AO，邊位最暗 9%，皮膚、鞋 5.4%）；程式畫嘅斜紋布法線貼圖（2 × 2 cm 一格，所有面共用一個 GPU 貼圖）。皮膚、頭髮、鞋（`tagKind`）唔要布紋，粗糙度唔同。
- 布章：緞面針步法線貼圖；四角唔透明嘅長方章同圓章有 0.15 cm 厚（側面用章邊平均色，似鎖邊），章面企出 `BADGE_LIFT` 0.1 cm（只係 z）。透明底（盾形等）唔加厚度，免得見到四方邊。
- 金屬章（掛頸勳章、勳章、別針、金屬肩章、紀念章等，`isMetalBadge`）：metalness 0.65、roughness 0.32。
- 影樓燈：drei `Environment` 用 `Lightformer` 即場畫環境光（頂燈箱、前主燈、兩邊輪廓光、地面反光），**唔使下載 HDR 檔**（dist 5 MB 上限）；主燈移去右前上方、軟陰影；兩層 ContactShadows；曝光 0.92。

## 驗證

- `tests/v25.test.mjs`（10 個）：planarUV 同 BoxGeometry 一樣；圓角方塊平面部分 UV 唔變、外框唔變；所有支部男女上身章離衫邊 ≥ 圓角半徑；袖章喺圓角邊最多浮起 0.03 cm（深資四格圓章離袖邊只有 0.11 cm，所以袖用 0.2 cm 圓角）；收窄只用喺褲／裙；badgeLayout 同外觀無關；金屬章判斷；中英文字。
- 測試 271 個全過；build、guard、i18n、preflight、final-check 通過；dist 4.93 MiB（< 5 MiB）。
- 本機 headless 截圖比較：精緻／簡約互轉，章位置一樣（`.arena/v25_*`，唔入 git）。
