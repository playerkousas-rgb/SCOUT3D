# 設計檢查（開局可選）— SCOUT3D

> **第 13 項（13a，按形式加）**：只喺「有 UI／要出畫面」嘅 repo 先加，見 [docs/27 §2b](https://github.com/playerkousas-rgb/readme/blob/main/docs/27-repo-starter.md)。純工具／資料管道／知識倉唔使加。
> 借自 [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) 嘅 `SKILL.md`、`references/critique.md`、`evals/evals.json`（**2026-11-02 讀檔**）；**只借判斷方法同檢查表，無安裝、無跑佢嘅 Chrome inspector／247 站 library／39KB prompt**。
> 唔冲突：[S 瘦身](../README.md) 要零依賴，呢份係人手 checklist，唔係新工具鏈。完整評審見 [docs/29 §5](https://github.com/playerkousas-rgb/readme/blob/main/docs/29-reading-map.md)。

## 0. 先分兩類（規矩唔同）

| | 例子 | 可以 | 唔好 |
|---|---|---|---|
| **頁面**（讀／scroll） | landing、宣傳、作品集、活動、一頁紙 | 大字形、成片顏色、真圖、留白做休息 | 罐頭 section 序 |
| **App 屏幕**（做嘢） | dashboard、admin、設定、收件箱、列表＋filter、編輯器 | 安靜邊框、細 label、重複 panel、密集資料 | 漸層、glow、染色方框 icon、彩虹圖、**假數字** |

> 一個產品頁展示自己個 app：頁跟頁面規矩，入面嘅 UI 碎片跟 app 屏幕規矩，共用一套色同字體。

## 1. 開工前三步（唔好一嚟就畫）

1. **讀 brief**：主體、對象、**唯一**要佢做嘅一件事、已有品牌／stack，同**到底有乜真圖**（自己相／產品圖／真介面／生圖工具／冇）。冇圖就唔好 plan 住有圖。
2. **Inventory 8–12 件「只屬呢個項目」嘅嘢**：個名同佢嘅意思、地址門牌同條街、物料／顏色／舖頭字體／光／天氣、brief 入面嘅數字、限制（一個月一批／冬天閂／要預約）、儀式同時間、印刷品（時間表／標籤／飛／牌）。
3. **寫 argument**：每段一行「**claim ＋ 證明**」；冇 claim 嘅 section 直接刪 —— 呢步專門擋 `hero → logos → 三張 feature card → testimonial → pricing → CTA` 罐頭序。

> 佢哋嘅盲測講法（**我哋未覆核**）：贏嘅頁都用咗 inventory 其中一項做 idea；輸嘅頁有靚構圖但得個類別 default。

## 2. House style：反 slop 清單

> **版面原則（2026-11-12 加）**：*Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.* 唔好加唔必要嘅次級標籤同說明——用版面（留白、字級層次、分組）自己講嘢。下列每一條都係呢個原則嘅具體實例。

| 唔好出現 | 換成 |
|---|---|
| eyebrow label、monospace 小 caption、index 編號 | 直接講，或用真正嘅字級層次 |
| 漸層、glow、陰影、幼細分隔線當裝飾 | 成片實色 + 留白分組 |
| 一排 icon card、三個同款 card 並排 | 一個有力嘅主張 + 實際內容 |
| 假客戶 logo、發明嘅統計／價錢 | 真資料；無就唔好扮有 |
| 灰色 bar／假螢幕／lorem 數字 | 真介面截圖、計得掂嘅數 |
| 標題三行、孤字尾行、正文 >75 字闊 | 標題 ≤2 行、字級差 ≥3 倍 |
| accent 色出現十次 | 只落喺**一個**主要動作 + 一個細節 |
| 額外說明欄重複表格標題已講嘅嘢 | 唔好加——版面自己講嘢 |

## 3. 三寬度 + look-and-fix loop（對應我哋 `final_check`）

```
390 / 768 / 1440 各出一張 screenshot（唔好用 code 判斷，用人眼望圖）
→ 按 §4 逐 pass 睇 → 記低最嚴重 3 個問題 → 改 → 再出圖 → 再睇
```

- **手機要自己一個構圖**：自己嘅裁相、自己嘅斷行，唔係 desktop 壓窄。
- inspector 全綠 **只代表無犯規**，唔代表頁靚；好唔好要望圖先算。
- 收貨線：三張圖都答到「呢個係乜／俾邊個／跟住做乜」，先至交。

## 4. 六條快速 critique（由佢 14 passes 揀最抵用）

1. **1 秒 → 5 秒**：望一眼移開，得一個答案（字／圖／物件）；答「一個網站」= 無焦點。再俾 5 秒陌生人：講唔到係乜／俾邊個／做乜就未合格。
2. **Squint**：文字變灰 bar 之後，得返 2–3 嚿大細分明嘅 mass；一堆差唔多細 = 全部都係 medium。
3. **遮 logo**：換咗個名同行業名都仲成立 = 無 idea；再 scroll 睇個 idea 有冇去到頁尾。
4. **Edges**：數文字區左邊有幾多個 x 位置；2–3 個係刻意，6 個係逐舊擺。
5. **Phone**：第一屏仲係咪一件事？有冇嘢撞到標題／按鈕／橫向碌走？
6. **Substance**：brief 要嘅資訊有冇**完整**喺度（全餐牌／每間房／每個講者／價錢包乜）？主要動作係咪第一屏嘅真按鈕？

## 5. 評分（佢哋嘅 juror rubric）

`設計 40% ／ 易用 30% ／ 創意 20% ／ 內容 10%`，各 1–10 分。**低過 6 分唔好靠執色救**，返去 §1 改 argument 或 inventory。

## 6. 最容易中嘅陷阱（佢哋特別警告）

> 「拎走 ornament 只係一半。拎走咗 label、線、card 而無嘢補返，頁會變**薄**；盲測入面，有 template 味但內容充足嘅頁，每次都贏乾淨但空虛嗰張。」

另一半係 **substance**：字級放大、成片顏色、呢個主題世界嘅真圖、每段完整內容。**唔好將「克制」當「未完成」**；反 slop 唔等於留白。

## 7. 同我哋規矩點夾

| 我哋 | 呢份點配合 |
|---|---|
| [S 瘦身](https://github.com/playerkousas-rgb/readme/blob/main/docs/01-slim.md) | 零依賴、零新增 runtime；只係 MD checklist |
| [W1/W8 版權](https://github.com/playerkousas-rgb/readme/blob/main/docs/12-copyright-scout-system.md) | 用相要標來源；搵到嘅開放檔案素材寫低 credit |
| [V 雙版號](https://github.com/playerkousas-rgb/readme/blob/main/docs/13-versioning.md) | 改交付 HTML 就要改版號 + [CHANGELOG.md](../CHANGELOG.md) |
| `final_check` 六角度 | 呢份補「望圖」嗰忽；`node --check`／G10 驗唔到美術 |
| [A1 安全](https://github.com/playerkousas-rgb/readme/blob/main/PLAYBOOK.md) | 設計工具／inspector 唔好掂 `.env`、唔好要 API key |

## 未核實

- 247 站研究、20 個 directions、盲測勝負、30–45 分鐘流程全部係 **taste-skill 自己文件嘅講法**，我哋只讀檔，**未跑、未覆核**。
- 佢要 Node 22+ + 已裝 Chrome／Chromium、搵圖要網絡；我哋**無引入**。要真係用先至另外評估（[P1](https://github.com/playerkousas-rgb/readme/blob/main/PLAYBOOK.md)）。

---

## SCOUT3D 實際做咗（2026-11-13）

風格：自家 [A. Scout Field](design-styles_v1.0.md) 改：介面 accent 用小童軍橙 `#f2791c`（同活動服同色），圖標／`theme-color` 用天藍 `#7fcae9`。截圖全部喺 [`docs/review/`](review/)（headless Chromium + SwiftShader；中文字型由測試注入，真瀏覽器用系統字型）。

### ROUND 1 —— 三寬度（390 / 768 / 1440）

| 寬度 | 圖 | 最嚴重 3 個問題 | 處理 |
|---|---|---|---|
| 390 | [round1_m390.png](review/round1_m390.png) | ① 視角掣疊喺公仔對腳上面，一行塞唔落要橫碌，「重設／截圖」被切走；② 公仔底座貼住掣；③ 頁尾版權斷行 | ① 手機版控制列移出 3D 區，放喺下面自然換行（改後圖）；② 3D 區 56vh，公仔有留白；③ 接受（頁尾細字斷行唔影響閱讀） |
| 768 | [round1_w768.png](review/round1_w768.png) | ① 同 390 一樣用單欄，3D 佔大半屏 OK；② 進步獎章分段掣同標題同一行，密 | ① 跟手機版控制列；② 接受 |
| 1440 | [round1_w1440.png](review/round1_w1440.png) | ① 右邊清單下面留大片空白；② 掣列置中喺 3D 底，OK；③ 公仔頭大身細（卡通比例） | ① 接受（撳徽章後資料卡會填返）；③ ADR 0001 記低取捨 |

另外驗過：[聚焦進步獎章](review/round1_prog.png)、[旅章資料卡](review/round1_troop.png)、[學校運動上衣](review/round1_school.png)、[女孩](review/round1_girl.png)、[English](review/round1_en.png)。

### §4 六條 critique

1. **1 秒**：答到「一個着住小童軍服嘅公仔」。5 秒：標題 + 黃色「依手冊整理・待領袖核對」講到係乜同狀態。✅
2. **Squint**：3 嚿 —— 公仔、右欄清單、頁尾。✅
3. **遮 logo**：橙色活動服 + 旅巾 + 徽章清單，換名都知係童軍制服工具。✅
4. **Edges**：左邊對齊位 2 個（3D 區、清單）。✅
5. **Phone**：改後第一屏係公仔 + 控制列，冇遮擋、冇橫碌。✅（改前 ❌）
6. **Substance**：7 種徽章、位置、頁碼、唔可以戴嘅嘢、免責聲明全部喺度。主要動作（轉、撳徽章）喺第一屏。✅

### 評分（自評，未有第二個人睇）

設計 7 ／ 易用 8 ／ 創意 7 ／ 內容 8。

### 未做

- 真手機實機（iOS Safari、Android Chrome）觸控、雙指縮放未試；只喺 headless 模擬。
- 螢幕閱讀器讀音未試。
