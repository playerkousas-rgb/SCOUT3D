# 02 — P1 相近產品同自己現有方案（2026-11-13 查）

> P1：研發前先查有冇人做過。以下係網上搜尋結果同自己 repo；**冇逐個實際試用**，只讀頁面。

## 外面

| 產品 | 係乜 | 同 SCOUT3D 比 | 來源 |
|---|---|---|---|
| Bundoora Scouts — Badge Placement | 澳洲童軍 3D 公仔，揀支部顏色，轉去唔同位置，配文字清單 | **最接近**；但只係澳洲制服、冇香港小童軍、冇逐項頁碼 | <https://bundoorascouts.org/scouting/badge-placement> |
| Scout Store UK — Badge placement | 英國童軍 2D 圖解 | 2D、唔轉得；英國規則 | <https://shop.scouts.org.uk/journal/2022/06/20/badge-placement-2> |
| 5th Dunstable Scouts — Badge placement | 英國分支 2D 位置圖，袖章喺袖外側中央 | 2D；英國規則；證實「袖外側中央」係常見畫法 | <https://www.5thdunstablescouts.org.uk/badge.php?Section=114> |
| Hero Forge | 自訂 3D 公仔（遊戲用） | 參考「底座公仔 + 轉嚟睇」嘅互動；唔係童軍工具 | 計劃書 [PLAN.md](PLAN.md) |

## 自己

| repo | 關係 |
|---|---|
| `playerkousas-rgb/upgrade` | 童軍準備指南（入團／升團制服清單 + 手冊厘米圖解，2D）。SCOUT3D 唔重複清單同價錢，只做 3D 位置；顏色 `--grasshopper` 參考咗佢 |
| `playerkousas-rgb/scoutdesign` | 設計相關；冇 3D 制服 |
| `playerkousas-rgb/MD` | 《儀容與制服手冊》全文 OCR + 《小童軍活動指引》第三版 —— 本工具規則嘅文字來源 |

## 結論

- 冇現成香港小童軍 3D 工具 → 值得做。
- 抄 Bundoora 嘅「轉去位置 + 文字清單」；加我哋自己嘅兩樣：**逐項頁碼**同**待確認標示**。
- 唔做 upgrade 已經有嘅清單／價錢（[SCOPE.md](../SCOPE.md)）。

## 未核實

- Bundoora 嘅 3D 用咩技術、資料點維護：未查。
- 英國兩個網站嘅規則冇對照香港，唔可以用嚟決定香港位置。
