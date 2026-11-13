---
name: design-review
description: >-
  Use when a new repo has a UI or must produce a screen, before delivering a
  frontend page or app screen, or when the user asks about 設計, 畫面, 望圖,
  anti-slop, look-and-fix, 390/768/1440 or 「靚唔靚」. Covers house rules,
  page versus app screen, three-width look, six critique passes and a
  40/30/20/10 rubric. Read this before a UI PR, not after.
---

# Design Review — 出畫面之前嘅 AGENT 入口

> **Model-invoked**（`description` 有 rich trigger）。借自 [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) 嘅 `SKILL.md`（39.5KB）／`references/critique.md`（14 passes、40/30/20/10、caps）／`tests/frontmatter.mjs`（**2026-11-02 讀原文**）。
> 呢份係**濃縮可執行版**，唔係複製品：無 247 站 library、無 Chrome `inspect.mjs`、無 39KB prompt、無 `npm install`（S 瘦身）。
> 長文 house rules 放 [`docs/design-review.md`](../../../docs/design-review.md)；收納見 [`docs/skills/README.md`](../../../docs/skills/README.md)。

## What

一句：喺「交付一個畫面」之前，用望圖（唔係望自己寫過嘅 code）捉到 slop 同內容唔齊。**唔做**：唔自己發明美術風格、唔用 emoji／漸層／假數字、唔喺無 screenshots 嘅情況下報視覺分數。

### 望圖步驟（照次序，最多 3 輪）

1. **分清楚頁面定 app 屏幕**：頁面 = 一個主張、編輯式排版；app 屏幕 = dashboard／admin／收件箱／列表＋filter，要密集資料同安靜邊框。兩者唔可以互換（[`docs/design-review.md`](../../../docs/design-review.md) §1）。
2. **寫低個 idea 一句 + live thing 一句**：如果換咗公司名／名詞呢頁都成立，即係無 idea，返去改方向，唔好執 detail。
3. **Inventory 8–12 件**，每段要 **claim + proof**；假數字／灰條 dashboard 一律當 FAIL。
4. **House rules 快速掃**（原文 19 條，濃縮 8 條）：標題 ≤2 行、第一屏有清楚 `h1`、左右邊距相等、無 eyebrow／無 monospace label／無 01 02 03 編號／無漸層／無靜態陰影／無 icon-topped 卡片陣。**版面原則（2026-11-12 加）**：*Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.* 唔好加唔必要嘅次級標籤同說明——用版面（留白、字級層次、分組）自己講嘢。長文版見 [`docs/design-review.md`](../../../docs/design-review.md) §2。
5. **三寬度望圖 390 / 768 / 1440**：每個寬度睇第一屏、標題孤字、段落 >75 字符、有冇嘢疊住標題或飛出電話畫面。**冇瀏覽器／screenshots 就要老實講「做唔到」，唔好扮做咗**（taste-skill `SKILL.md` §10）。
6. **6 條 critique passes**：Squint／Edges／Space and frame／Type／Sameness／Substance。每條獨立做，唔好撈埋。
7. **評分 40/30/20/10**（design／usability／creativity／content）＋ caps；用 `ROUND n` 固定格式寫低 **top 3 問題 + 各自喺邊張圖 + 點改**。
8. **改次序**：idea → hierarchy → composition → typography → imagery → colour → detail → motion。改完再望，最多 3 輪；第 3 輪仍低過 7.5 就照實報，唔好四捨五入。

## When

- 開新 repo 有 UI／要出畫面（`repo-setup` 第 4 步會明確叫呢份 skill）。
- 交付 landing page、dashboard、admin、設定頁、收件箱之前。
- 用戶問設計／畫面／望圖／反 slop／「靚唔靚」／390/768/1440。
- 見到漸層、glow、彩虹 icon、假數字、一排一模一樣嘅卡片。

## Common questions

- **Q：呢個環境冇 Chrome inspector，點算？** A：跑到嘅淨係 house rules + inventory + 人手望圖；`lint.mjs`／`inspect.mjs`／`scenes.mjs` 同 14 passes 入面 13 條視覺 pass **標 N/A**，喺報告寫明「do not claim a check you did not run」。
- **Q：可唔可以就咁畀個 9 分自己？** A：唔好。原文講明「if your first score for your own work is 9, score it again as the juror who did not build it」；無圖就**唔計** design／usability／creativity。
- **Q：同 `docs/design-review.md` 有乜分別？** A：嗰份係長文規則同 rubric；呢份係**幾時用 + 次序 + 收貨條件**。兩份都要，唔好二合一。
- **Q：點樣被呼叫？** A：`repo-setup` 會明確講「讀 `design-review` 嘅 `SKILL.md` 並跟住做」；唔好靠 `../design-review/SKILL.md` 深連結。

## It's working if

- [ ] `ROUND n` 批評寫咗落檔（idea／live thing／layout words／分數或「不計」／caps／top 3 + fix）。
- [ ] 三個寬度都有**實際望過**嘅紀錄，或者有一行寫明做唔到同點解。
- [ ] 每個 section 有 `h1`–`h6` 標題；冇 eyebrow／漸層／假數字／孤字標題。
- [ ] `node scripts/check_skills_v1.0.mjs .` 對呢份 frontmatter PASS；正文無 `{{...}}`。
- [ ] 冇報任何一個無跑過嘅 check（尤其 browser inspector／screenshots／motion）。
