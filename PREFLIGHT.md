# PREFLIGHT — AGENT 開局前閘門

> **呢份取代咗「每次 push 跑一條 YML」**。CI 係**改咗、push 咗之後**先至話你知；你要嘅係 **AGENT 未設定／未 commit 之前，一條命令擋住**。
> 工具：[`scripts/preflight_v1.0.mjs`](https://github.com/playerkousas-rgb/readme/blob/main/scripts/preflight_v1.0.mjs)（零第三方依賴，只係 orchestrator，複用 `guard`／`final_check`／`repo_health`／`check_skills` 四支真理 script）。
> 完整理由：[docs/27 §2b](https://github.com/playerkousas-rgb/readme/blob/main/docs/27-repo-starter.md) · 三層檢查：[docs/30 L0](https://github.com/playerkousas-rgb/readme/blob/main/docs/30-repo-health-check.md)

## AGENT boot 第一步（寫入 [AGENTS.md](AGENTS.md)）

> **未讀 SCOPE、未抄檔、未 `git init` 之前**，先跑呢條。`ok: true` 先好開工；**exit 1 = 唔好郁個 repo**。

```bash
# ⓪ 驗「來源」：真理倉個起手包本身冇壞（未抄檔之前跑一次）
node /path/to/readme/scripts/preflight_v1.0.mjs /path/to/readme --allow-placeholders --json

# ① 驗「目標」：填完 placeholder、改好 LICENSE、未 commit 之前跑一次
cd /path/to/NEW_REPO
node scripts/preflight_v1.0.mjs . --json
```

`--allow-placeholders` **只准**用於驗真理倉／範本本身（範本本來就有 `{{...}}`）；驗目標 repo 唔可以加，否則會放過未填嘅 placeholder。

## 8 個 check（一條命令行晒）

| id | 查乜 | FAIL 代表 |
|---|---|---|
| `scripts` | `scripts/` 有冇抄齊 4 支真理 script | AGENT 「以為 set 好」但其實未抄 → 之後所有檢查都係假綠 |
| `placeholders` | 非模板檔仲有冇未填 placeholder | 會將 `{{ REPO_NAME }}` 呢類未填位交付畀人 |
| `utf8` | 文字檔有冇雙重編碼／壞字（U+FFFD 或 Latin-1 常見 mojibake） | 中文變亂碼、或 `é` 被存成兩碼 |
| `syntax` | 所有 `.mjs` `node --check` | 腳本一跑就 syntax error |
| `guard` | G10 連結／錨點、A1 secret、S 體積 | 壞連結、真 key、爆 5MB |
| `final_check` | 六角度交付檢查 | 交付前實測未過 |
| `repo_health` | 12 樣起手檔、LICENSE、`.env`、大檔、cron+commit | 有 `FAIL`（`WARN` 唔阻塞，入 backlog） |
| `check_skills` | 全倉 `SKILL.md` 驗 strict frontmatter **＋ 對 `skills/CATALOG.md` 目錄**（起手包 5 份：`repo-setup`／`design-review`／`web-motion`／`external/grilling`／`external/motion-prompt`） | agent harness 會靜靜 drop 成個 skill；**加咗 skill 無入目錄 = AGENT 搵唔到 = FAIL** |

**Gate 定義**：任何一項 FAIL → `exit 1`、`ok: false`。`WARN` 照舊入 backlog，唔阻塞交付（同 [docs/30](https://github.com/playerkousas-rgb/readme/blob/main/docs/30-repo-health-check.md) 一致）。

## 同 CI 嘅分別（點解唔用 YML 做呢件事）

| | CI workflow | **PREFLIGHT（呢份）** |
|---|---|---|
| 幾時 | push／PR **之後**，GitHub 機跑 | **設定 repo 之前**，AGENT 本機跑 |
| 邊個觸發 | Git event | AGENT 自己（寫入 boot） |
| 擋到未 | ❌ 已經 commit／push 咗 | ✅ 未寫檔就擋住 |
| 要唔要網絡／GitHub | 要 | 唔要，`node` 就得 |
| 每個 repo 多幾個檔 | 1 個 `.yml` + runner 配置 | 0 個（用返已抄嘅 `scripts/`） |
| 適合 | 改咗之後防 regress | **開局／交付前 gate** |

> 一句：**CI 管「之後唔好衰」，PREFLIGHT 管「未開工已經啱」**。兩者唔互斥，但開局呢一步唔應該靠 CI。

## 如果第日真係想加返 regression CI

用 [`templates/github/guard.yml`](https://github.com/playerkousas-rgb/readme/blob/main/templates/github/guard.yml)（12 樣第 11 項）就夠，佢已經包 `guard` + `node --test` + S7。想再輕：**`pull_request` + 每週 `schedule` + `workflow_dispatch`**，唔好 `push: ['**']`。開局 gate 仍然係 PREFLIGHT，唔好掉返轉。

## 未核實

- `preflight` 係**靜態檢查**：唔跑 app、唔實測 API／ToS／runtime（同 `repo_health` 一樣）。
- **唔會自動觸發** `skills/promoted/` 三份 SKILL.md；要靠 AGENT 主動讀 [`AGENTS.md`](AGENTS.md) 開工順序第 1 步。呢個 gate 只係驗 frontmatter／連結／UTF-8 **同埋每份有冇入 [`skills/CATALOG.md`](skills/CATALOG.md)**，唔係幫你執行 skill。
- **唔會出圖、唔會計設計分**：無瀏覽器／screenshots／Chrome inspector，`design-review` 嘅 390/768/1440 望圖同 40/30/20/10 係 AGENT 要自己寫低嘅人手紀錄（或老實寫「做唔到」），唔係 script 自動生。
- **唔會實測功能**：[`docs/system-basics.md`](docs/system-basics.md) 嘅忘記密碼／ADMIN 回報系統、`docs/31` 嘅收貨測試係 runtime 人手閘；`ROUND n` critique、兩軸 review 報告都要 AGENT 自己寫。
- **唔會做全倉矛盾審計**：嗰支係真理倉先用嘅 `scripts/consistency_v1.0.mjs`（[docs/32](https://github.com/playerkousas-rgb/readme/blob/main/docs/32-consistency-audit.md)），唔係新 repo 開局 gate。
- `--allow-placeholders` 會略過 `templates/`／`repo-starter/` 同 `LICENSE-MIT.txt`；唔好用佢嚟驗一個準備交付嘅 repo。
