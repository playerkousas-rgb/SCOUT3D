---
name: web-motion
description: >-
  當用戶想為網頁／單一 HTML／Gemini Canvas／靜態站加動畫或動效、提到
  「動畫」「動效」「視差」「parallax」「scroll 效果」「GSAP」「過場」
  「入場動畫」，或問「點樣叫 AI 郁得出我要嘅效果」時：先用 Motion Prompt
  編號同 scroll 術語講精確需求，再按本地規則寫 GSAP／CSS 動效。唔出片、
  唔生圖；輸出要過 60fps、390/768/1440 同 prefers-reduced-motion。
---

# Web Motion

## What
幫我哋啲 app 加**有編號、可驗收**嘅網頁動態。先分清條線（2026-11-07 普查，見真理倉 docs/38 §2.1）：**React／Next 線**（26＋9 個 repo）沿用各 repo 已在用嘅 framer-motion；**靜態 HTML/JS／Canvas 線**（32 個 repo）用 GSAP／CSS。唔出片（HTML→MP4 去 docs/35 §3 問題先揀路線）、唔生圖、唔改商業邏輯。

## When
- 要加：卡片入場、scroll 故事區、menu 吸頂、視差、按鈕 hover／flip、頁首過場。
- 講需求**一定要用編號／術語**，例：「hero 用 Motion Prompt `motion #005`（fade-up 類）；menu 用 Sticky；卡片用 Scroll-triggered；sticky 區塊視差用 Parallax」——取代「有質感啲／郁流暢啲」呢類無法驗收嘅講法。
- **唔好用**：要出 MP4 片（HyperFrames／Remotion 路線，見真理倉 docs/35 §3）；要 logo 動態 intro 先睇 docs/35 §3.3 Pixel2Motion；純商業邏輯互動先讀 `repo-setup`／`design-review`；聲音／TTS 唔關本 skill 事。

**施工要點（按次序）**：

1. **先講編號，再郁手**：編號庫係外部原文 [`skills/external/motion-prompt/SKILL.md`](../../external/motion-prompt/SKILL.md)（showheyohtaki/motion-prompt **MIT**，commit `7819d38`，192 個編號；繁中 packs 係上游 [`packs/`](https://github.com/showheyohtaki/motion-prompt/tree/main/packs)）。明確叫 `motion-prompt` skill；agent 直接用隨附 CLI（要網絡＋磁碟 cache）：
   - `node <skill-dir>/scripts/motion-prompt.mjs search <詞>`（例如 `search 文字 登場`）
   - `node <skill-dir>/scripts/motion-prompt.mjs get 005 012` ／ `prompt 005`
   - 或者直接指名「Motion Prompt `#012`」，請 agent 自己去 `get`。
   - **唔好 fork／改編號**；離線就開上游繁中 packs 人手指名。
2. **按線揀引擎，唔好成套換**：
   - **React／Next 線**：沿用該 repo 已裝嘅 **framer-motion**（我哋 React repo 現行路線，唔好為咗新工具搬去 GSAP 或者 Animate UI／shadcn——嗰個要成套 UI 底層先跑到，見真理倉 docs/38 §2）。寫法跟返該 repo 既有 pattern：`motion` component＋`AnimatePresence` 做進出、`whileInView` 做 scroll-triggered；進場用 ease-out／spring、離場快過進場；全局節奏要改就收埋做一組 transition token，唔好逐個 component 散寫數字。
   - **靜態／Canvas 線**：**GSAP 100% 免費**（Webflow 收購後，SplitText／MorphSVG 等全部 plugin 免費商用；公開 npm `gsap`，無 Club token）：AI 寫 GSAP 前先對官方 [greensock/gsap-skills](https://github.com/greensock/gsap-skills)（MIT）——唔好估舊 Club API、唔好教人加 `.npmrc`。
3. **scroll 術語速查**（直接攞用）：

   | 術語 | 意思 | 典型用法 |
   |---|---|---|
   | Scroll-triggered | 入 viewport 觸發一次 | 卡片 fade-up 入場 |
   | Scroll-linked | 綁定滾動位置（scrub） | 進度條、scroll 進度動畫 |
   | Parallax（視差） | 背景／前景唔同速度 | hero 背景慢移 |
   | Sticky | 吸頂／吸住 | Menu 吸頂 |
   | Scroll Snap | 分頁式吸附 | 全屏 section 逐頁 |
   | Horizontal Scroll | 橫向滾動 | 橫向作品集 |
4. **我哋棧紅線**：單一 HTML／Canvas 守 C13-g ≤5MB（GSAP 經 CDN 引入 OK）；靜態站守 S 瘦身（dist＜5MB／bundle＜2MB）；動畫只郁 `transform`／`opacity`（唔郁 `width`／`top`／`left`）；唔可以破壞內容可讀性同埋互動。
5. **驗收**：`prefers-reduced-motion: reduce` 一定要有 static fallback；60fps；390／768／1440 三寬無 layout shift；改前後 `guard`，有 UI 行 `design-review`。

## Common questions
- Q: 要喺邊個 repo 做？ A: 喺目標 app repo 做（`npm i gsap` 或 CDN），**唔好喺真理倉改模板當交付**；本 skill 淨係入口同規矩。
- Q: Motion Prompt CLI 要網絡？ A: 要（`showheyohtaki.github.io`／`raw.githubusercontent.com`，磁碟 cache）；離線改用上游繁中 packs 人手指名編號。
- Q: 冇瀏覽器，望唔到效果？ A: 照實寫「做唔到」，改用 spec 核對（easing／duration／編號／循環），逐項 tick，唔好自稱「已測順」。
- Q: 用咗上游嘢，版權點算？ A: 該 repo `CREDITS.md` 記 `showheyohtaki/motion-prompt`（MIT）、`greensock/gsap-skills`（MIT）、GSAP（Webflow，MIT 性質免費授權）＋commit；唔將人哋示例圖當自家素材（W8）。

## It's working if
- [ ] 施工單入面嘅動態需求**全部有編號或術語**；搵唔到「有質感啲／郁流暢啲」式形容詞
- [ ] `prefers-reduced-motion` fallback 有；只郁 `transform`／`opacity`；三寬無 layout shift
- [ ] 引擎跟返條線：React 線用返已裝 framer-motion、靜態線 GSAP 經 npm／CDN 一份，無新增多餘依賴；Canvas／單一 HTML ≤5MB
- [ ] `node scripts/check_skills_v1.0.mjs .` PASS；有 UI 再跑 `design-review` 留 `ROUND n` 紀錄
- [ ] 上游來源（motion-prompt／gsap-skills／GSAP 本體）寫入該 repo `CREDITS.md`（W8）
