# 系統基本功能驗收 — SCOUT3D

> **SCOUT3D 唔適用（2026-11-13 INTAKE 定案）**：純前端工具，無登入、無帳號、無後端、無回報系統，所以下面 A–C 全部唔使做；檔案留低只為保持起手包連結完整，同埋將來真係加身份系統時有表可跟。
>
> **第 14 項（有身份系統先加）**：工具／知識倉／資料管道／無登入 App 唔使抄呢份。
> 完整理由 + 規則對照：[docs/31](https://github.com/playerkousas-rgb/readme/blob/main/docs/31-system-basics.md)（通用底線）· 邊界：[SCOPE.md](../SCOPE.md) · 版號：[CHANGELOG.md](../CHANGELOG.md)
> **靜態檢查驗唔到**：`preflight_v1.0.mjs`／`guard.mjs` 過綠 **唔代表**呢啲功能已寫好，要人手 + runtime 實測。

## A. 帳號生命週期（8 格）

```
[ ] 1  開戶／邀請：白名單或邀請 ticket，公開自助開唔到管理員（A6/A8/A18）
[ ] 2  首次登入：臨時碼 + mustChangePw，期間只放行改密碼 API（A5）
[ ] 3  登入／登出：HttpOnly Secure SameSite=Lax、exp ≤30min、jti、pv；登出 server 廢 session（A4）
[ ] 4  失敗鎖定：5 次失敗鎖 15 分鐘，server-side 計，解鎖留 reason（A5）
[ ] 5  改密碼：自己驗舊改新；改／重設 → pv+1 踢走所有舊 session（A3/A5）
[ ] 6  忘記密碼：一次性連結 + 時限 + 用一次即廢；回應／時序統一防枚舉（A17）
[ ] 7  上級／SUPER 重設：只可重設唔可讀舊，mustChangePw + pv+1 + AUDIT_LOG（A14/A13）
[ ] 8  停用／離任：撤權、ownership 轉名、rotate key、按 A12 purge（A2/A12/A15）
```

**密碼**：PBKDF2-SHA256 ≥100k + per-user salt + timing-safe compare，hash 只存 server（A3）。
**唔使加**：OAuth／MFA／SMS／CAPTCHA／密碼強度計 —— 要加先做 P1 比較 + 零特權評估。

## B. ADMIN 回報系統（8 格，通用）

```
[ ] 1  回報入口：類別 + 補充（≤300 字）+ source_page／版號（A11）
[ ] 2  ADMIN 收件箱：列表／查看／刪除，只有 admin 睇到（A6/A10）
[ ] 3  狀態機：new → triaged → resolved → closed，每次轉變記 actor + ts（A13）
[ ] 4  限流：每人／每 IP／每日上限（例 20 則），爆額回應統一（A8/VL7/A17）
[ ] 5  保留期 + 清理：例 90 日；原子鎖每日一次，唔好每筆跑（A12/S）
[ ] 6  私隱：寫明收集乜／同意／保留期；log 同 AUDIT_LOG 只記 metadata（A12/A13）
[ ] 7  通知／升級：新回報通知 admin；大量同類升級做 incident
[ ] 8  唔逐筆燒 serverless：DB／RPC 直連 + 按日聚合，避免 VL7 爆額（VL7/S）
```

**最小欄位**：`id`（冪等去重）· `created_at` · `category`（固定 enum）· `body` · `status` · `source_page`／`app_version` · `actor_hash`（唔存明文）· `retained_until`。
**唔好收**：密碼、身份證、token；前端要提示。

## C. 收貨實測（PREFLIGHT 驗唔到）

```
[ ] 匿名 / 登入用戶各提交一次 → admin 見到，一般用戶見唔到
[ ] 同一人第 21 則 → 被限流，回應同正常一致（A17）
[ ] 提交「<script>」／超長字 → 被消毒或拒，無 XSS（A11）
[ ] admin 改狀態 → AUDIT_LOG 有 actor + ts + prev_hash
[ ] 一筆改做 91 日前 → 每日清一次清走，89 日嗰筆留低
[ ] 同時兩筆寫入 → 清理只執行一次（原子鎖），無重複
[ ] 回報內容無出現喺 log／AUDIT_LOG／告警（A12）
```

## D. 寫低自己嘅數值（唔好照抄例子）

| 項目 | 本 repo 定咗 | 日期／出處 |
|---|---|---|
| 補充字數上限 | 不適用（無身份系統） | 2026-11-13 INTAKE |
| 每日回報上限 | 不適用（無身份系統） | 2026-11-13 INTAKE |
| 保留期 | 不適用（無身份系統） | 2026-11-13 INTAKE |
| Session 時限 | 不適用（無身份系統） | 2026-11-13 INTAKE |

> 300 字／20 則／90 日／5 次 15 分鐘／30 分鐘全部係既有案例或規則嘅數，**唔係通用標準**；改完要同步 `SCOPE.md` 同 [CHANGELOG.md](../CHANGELOG.md)。
