# 新 Repo 起手包（START）

> **唔好直接喺 `readme/templates/repo-starter/` 改**；成個資料夾抄去新 repo 再改 `{{...}}`。
> 完整理由、統計同決策表：[docs/27](https://github.com/playerkousas-rgb/readme/blob/main/docs/27-repo-starter.md) · 分章索引：[docs/README](https://github.com/playerkousas-rgb/readme/blob/main/docs/README.md)

## 10 分鐘開局

```bash
# ⓪ AGENT 第 0 步（**最緊要，喺任何 cp 之前**）：主動問用戶，問到共同理解
#    一輪問晒 frontier、每條俾建議答案、fact 自己查、用戶確認先好郁手
#    方法原文實體檔：skills/external/grilling/SKILL.md（MIT，見 skills/CATALOG.md）
cat INTAKE.md

# ⓪b 未抄檔之前，先驗真理倉個起手包冇壞（PREFLIGHT gate）
node /path/to/readme/scripts/preflight_v1.0.mjs /path/to/readme --allow-placeholders --json

cp -r templates/repo-starter/. /path/to/NEW_REPO/
cd /path/to/NEW_REPO
# ① 改晒 {{...}}（grep 一次確保無剩）
#    注意：`skills/external/` 係外部原文 verbatim（例如 motion-prompt 嘅 JSX `style={{`）——佢哋唔係佔位，唔好「修正」
grep -rn '{{' . | grep -v 'skills/external/' || echo 'OK: 無未填 placeholder'
# ② 由唯一真理倉抄現成模板（唔好喺起手包複製第二份）
cp /path/to/readme/templates/git/gitignore        .gitignore
cp /path/to/readme/templates/github/guard.yml     /tmp/guard.yml   # 放入 .github/workflows/ 先
mkdir -p .github/workflows && cp /tmp/guard.yml .github/workflows/guard.yml
cp /path/to/readme/templates/vercel/env.example  .env.example      # 有後端先要
cp /path/to/readme/templates/vercel/vercelignore .vercelignore      # guard S2 要
# PREFLIGHT gate 要用到呢五支（由真理倉抄，唔好喺起手包複製第二份）
mkdir -p scripts
cp /path/to/readme/scripts/{guard.mjs,final_check_v1.0.mjs,check_skills_v1.0.mjs,repo_health_v1.0.mjs,preflight_v1.0.mjs} scripts/
# ③ LICENSE：揀好授權先至改名（見 docs/27 §3）
cp LICENSE-MIT.txt LICENSE && rm LICENSE-MIT.txt
# ④ 初始化 + 交付前 PREFLIGHT（exit 1 = 唔好 commit）
git init && git add -A
node scripts/preflight_v1.0.mjs . --json
# ⑤ 交畀 AGENT：核對第 0 步答案已寫入 SCOPE.md，再行 AGENTS.md 開工順序（主動讀 skill）
```

### 開新 repo 之後，實際會／唔會發生乜（2026-11-02 實測）

| | 會 | 唔會（要人手／AGENT 自己寫） |
|---|---|---|
| **問需求（第 0 步）** | AGENT 跟 [`INTAKE.md`](INTAKE.md) **主動問用戶** 7 條（形式／UI／身份／後台／Gemini／授權／定位），一輪問晒 + 每條建議答案 + **用戶確認先郁手**；答案寫入 `SCOPE.md` | ❌ 唔會自己估、唔會代用戶揀授權；**fact 自己查**（形式名／模板檔／P1），唔好問用戶 |
| **開局** | AGENT 讀 [`AGENTS.md`](AGENTS.md) → 第 0 步 PREFLIGHT 8 個 check 全過 → 第 1 步讀 `repo-setup` 跟住做 12 樣 + 按形式揀 13／14 項 | ❌ 唔會「一 `git init` 就自動彈個 skill 出嚟」；無 Skill tool／plugin harness，要 AGENT 主動讀 |
| **版面靚 D** | 有 UI 時 `repo-setup` 明確叫 `design-review`：house rules、inventory 8–12、claim+proof、6 條 critique、40/30/20/10 rubric、`ROUND n` 格式、最多 3 輪 look-and-fix | ❌ 唔會自動出圖／截图／計分：無瀏覽器、無 Chrome inspector、無 247 站 library。望圖 390/768/1440 要人手，冇就要寫「做唔到」（[PREFLIGHT 未核實](PREFLIGHT.md)） |
| **設計流程** | 兩份 `SKILL.md` 寫低 What／When／開局步驟／It's working if；`docs/design-review.md` 係長文 rubric；交付前兩軸 review（Standards／Spec 分開） | ❌ 唔會自動產生 review 報告、`ROUND n` critique、ADR；要 AGENT 自己寫低 |
| **審計** | PREFLIGHT 8 check（scripts 齊／placeholder／UTF-8／syntax／guard／final_check／repo_health／check_skills）+ `guard` G10 + `final_check` 六角度 | ❌ 唔驗設計質素、唔跑 app／API／ToS、唔實測忘記密碼／ADMIN 回報（[docs/system-basics.md](docs/system-basics.md)）、唔做全倉矛盾審計（嗰支係真理倉 `consistency_v1.0.mjs`） |

> 一句：**佢唔係「自動識」，係「AGENT 一開工就有明確指示 + 一道閘門」**。冇 AGENT 去讀 `AGENTS.md`，或者係純人手 `cp -r` 之後直接寫 code，呢兩份 skill 就唔會被執行。

## 12 樣必加（打勾先至開工）

| # | 檔 | 起手包 | 點解 |
|:--:|---|:--:|---|
| 1 | `README.md` | ✅ | 5 分鐘入口：一句定位、點跑、去邊搵嘢 |
| 2 | `AGENTS.md` | ✅ | Agent 開工順序、可改／不可改邊界 |
| 3 | `LICENSE` | ✅ 範本 | 無 LICENSE = 公開 repo 預設「版權保留」，人哋唔知可唔可以用 |
| 4 | `.gitignore` | 抄現成 | secret／`node_modules`／大檔／注入版唔入 Git |
| 5 | `SCOPE.md` | ✅ | 呢個 repo **做乜／唔做乜**；拒絕過嘅嘢去 `docs/out-of-scope/` |
| 6 | `GLOSSARY.md` | ✅ | 共用語言，Agent 唔好用 20 個字講 1 個概念 |
| 7 | `CONTRIBUTING.md` | ✅ | issue 去邊、PR 規矩、AI 寫 issue 嘅底線 |
| 8 | `CHANGELOG.md` | ✅ | 每次改版一行，配合 V 雙版號 |
| 9 | `docs/quickcard.md` | ✅ | 一頁紙；`docs/` 之後按 `NN-kebab-case.md` 加 |
| 10 | `docs/adr/0000-template.md` | ✅ | 難逆轉嘅決定先寫 ADR，一段就夠 |
| 11 | `.github/workflows/guard.yml` | 抄現成 | 每週自動掃 secret／連結／體積 |
| 12 | `scripts/guard.mjs` + `final_check` | 抄現成 | 交付前一條命令六角度實測 |

> **加減**：純工具（stateless）可省 `SCOPE.md`／`CHANGELOG.md` 以外嘅系統級要求；
> **系統**（多層／有身份）額外要設定層、隱藏超管、registry、審計鏈，**再加第 14 項基本功能驗收**（含忘記密碼 + ADMIN 回報系統）—— 見 [PLAYBOOK §0](https://github.com/playerkousas-rgb/readme/blob/main/PLAYBOOK.md) 同 [docs/31](https://github.com/playerkousas-rgb/readme/blob/main/docs/31-system-basics.md)。

## 第 13 項（13a–13c 按形式加、13d PREFLIGHT 必跑，2026-11-02 補）

> 由 [mattpocock/skills](https://github.com/mattpocock/skills) ＋ [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) 借；**唔係 12 樣核心**，純工具／知識倉／資料管道唔使加。理由同「唔抄乜」見 [docs/27 §2b](https://github.com/playerkousas-rgb/readme/blob/main/docs/27-repo-starter.md)。

| # | 檔 | 幾時加 |
|:--:|---|---|
| 13a | [`docs/design-review.md`](docs/design-review.md) | **有 UI／要出畫面**：反 slop、頁面 vs app 屏幕、三寬度望圖自檢 |
| 13b | [`docs/skills/README.md`](docs/skills/README.md) ＋ **`skills/CATALOG.md`**（唯一目錄）＋ `skills/promoted/` 兩份、`skills/external/grilling` 一份 | **所有新 repo 開局**：AGENT 讀 `repo-setup` 跟住做；有 UI 再讀 `design-review`。有 `SKILL.md`／RAG 知識包就留低 `skills/` |
| 13c | [`docs/skills/0000-template.md`](docs/skills/0000-template.md) | 寫新 skill：frontmatter 規格 + 四段式正文 |
| 13d | [`PREFLIGHT.md`](PREFLIGHT.md) ＋ `scripts/preflight_v1.0.mjs`（抄現成） | **必跑（所有新 repo）**：AGENT 設定／commit **之前**一條命令擋住（8 個 check），唔係每次 push 跑 YML |

## 第 14 項（有身份／有登入系統先加，2026-11-02 補）

> 正常系統會有嘅基本功能，之前散喺 `BUILD.md`／`docs/03`；**ADMIN 回報系統完全無記錄**。兩份而家收埋喺 [docs/31](https://github.com/playerkousas-rgb/readme/blob/main/docs/31-system-basics.md)，呢度只放可抄驗收表。

| 檔 | 查乜 | 幾時加 |
|---|---|---|
| [`docs/system-basics.md`](docs/system-basics.md) | A 帳號生命週期 8 樣（含**忘記密碼**）／B **ADMIN 回報系統** 8 樣／C 收貨實測／D 自己嘅數值 | **系統（多層／有身份）**硬性；工具／知識倉／無登入 App 唔使 |

> ⚠️ `preflight_v1.0.mjs`／`guard.mjs` 係**靜態檢查，驗唔到功能有冇寫、能唔能跑**；呢份係人手 + runtime 實測。`GEMINI` 個回報系統數值只係例子，未實測，唔好照抄當標準。

**兩層設計**：`mattpocock` 管「repo 嘅知識結構」，`taste-skill` 管「個畫面靚唔靚」。而家兩層都落成**真正嘅 `SKILL.md`**（`repo-setup`／`design-review`），由 `AGENTS.md` 明確指名畀 AGENT 開局時讀，唔係只得份 checklist。全部零依賴 MD／一支 `.mjs`，無引入 39KB prompt、247 站 library、Chrome inspector、plugin manifest，亦**無新增 CI workflow**。

## 檔名對照

| 起手包入面 | 去到新 repo 叫 |
|---|---|
| `LICENSE-MIT.txt` | `LICENSE`（**先揀授權**，見 [docs/27 §3](https://github.com/playerkousas-rgb/readme/blob/main/docs/27-repo-starter.md)） |
| `docs/quickcard.md` | `docs/00-quickcard.md`（統一兩位數前綴） |
| `docs/adr/0000-template.md` | 留做範本；第一份 ADR 叫 `docs/adr/0001-xxx.md` |
| `docs/skills/0000-template.md` | 複製成 `skills/<bucket>/<name>/SKILL.md`（13c） |
| `skills/promoted/repo-setup/SKILL.md` | **留低**，寫入 `AGENTS.md` 開工順序第 1 步（13b） |
| `skills/promoted/design-review/SKILL.md` | **留低**；有 UI 先由 `repo-setup` 明確叫（13b） |
| `PREFLIGHT.md` | 留低，並寫入 `AGENTS.md` 開工順序第 0 步（13d） |
| `INTAKE.md` | **留低**：第 0 步問卷；答案寫入 `SCOPE.md`，唔好只留喺對話 |
| `skills/CATALOG.md` | **留低**：所有 SKILL.md 嘅唯一目錄；**以後加 skill 必入**，`check_skills` 會自動對 |
| `skills/external/grilling/SKILL.md` | **留低**：第 0 步方法嘅 MIT 原文（只作溯源，唔改唔執行） |
| `docs/system-basics.md` | 留低做驗收表（第 14 項，有身份系統先加）；填入自己嘅數值 |
| `github/guard.yml`（如有） | `.github/workflows/guard.yml`（12 樣第 11 項，抄現成） |

## 檢查

```bash
node scripts/preflight_v1.0.mjs . --json      # AGENT 開局 gate（8 個 check 一次過）
node scripts/repo_health_v1.0.mjs .           # 單獨體檢（backlog 用）
node scripts/check_skills_v1.0.mjs .          # 單獨驗 SKILL.md frontmatter
```

**PREFLIGHT 係開局／交付前 gate**，唔係 CI：由 AGENT 本機跑、未 commit 就擋；詳見 [PREFLIGHT.md](PREFLIGHT.md)。三層檢查（L0 開局／L1 每次 commit／L2 每季全倉）見 [docs/30](https://github.com/playerkousas-rgb/readme/blob/main/docs/30-repo-health-check.md)。
