# CONTRIBUTING — SCOUT3D

> 改嘢之前先讀 [SCOPE.md](SCOPE.md)；所有 issue 都按嗰條 bar 判斷。

## 去邊

| 你有 | 去 |
|---|---|
| Bug | Issue template：`bug`（寫重現步驟） |
| 改現有功能 | Issue template：`idea`（寫清楚現況 vs 預期） |
| 「點用／點解」 | Discussions: Q&A |
| 新功能提議 | Discussions: Ideas，先讀 [SCOPE.md](SCOPE.md) 同 `docs/out-of-scope/` |
| 想直接改 | PR；每個 PR 只做一件事，附檢查輸出 |

## AI 幫手寫 issue 可以，但要

- **一個 issue 一個問題**；同一個 session 搵到 5 個問題就開 5 個。
- **短**；一屏睇唔完就砍。
- **重現行先行**，分析放後面。
- **唔好貼成份 spec／成個改寫檔**；講問題，解法留返畀維護者設計。
- **唔好將自己 project 嘅 spec 貼去人哋 repo**。

## PR 最低要求

```
[ ] node scripts/guard.mjs 全綠
[ ] node scripts/final_check_v1.0.mjs --json -> ok: true
[ ] CHANGELOG.md 加咗一行
[ ] 難逆轉決定有 ADR（docs/adr/）
[ ] 無真 key / .env / 大檔入 Git
```

## 授權

第三方素材要標來源（W8）。本 repo **保留所有權利**（見 [`LICENSE`](LICENSE)），唔接受未經同意嘅轉載／改作。手冊內容版權屬香港童軍總會，只可摘要並列明出處。

## 改徽章位置

一定要附文件名同頁碼；唔肯定就標 `pending`。由專案負責人（領袖）核對後先可以改做 `verified`。
