# ADR 0000 — 範本（第一次用請複製成 0001-xxx.md）

> 借自 [mattpocock/skills 嘅 ADR-FORMAT.md](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/ADR-FORMAT.md)：ADR 可以得一段，價值係記低「做過決定 + 點解」，唔係填表格。

## 格式

```md
# NNNN — 決定嘅短標題

{1–3 句：當時咩處境、決定咗乜、點解。}
```

## 選填（有價值先加）

- `Status`: proposed / accepted / deprecated / superseded by ADR-NNNN
- `Considered Options`: 被否決但值得記住嘅替代方案
- `Consequences`: 唔明顯嘅下游影響

## 編號

掃 `docs/adr/` 最大號 +1；`docs/adr/` 有需要先建立，唔好預先開空目錄。

## 幾時先寫（三條全中）

1. **難逆轉**：改主意成本唔低。
2. **無上下文會覺得奇怪**：第日有人望住 code 會問「點解咁做」。
3. **真係有取捨**：有過其他選項，你揀咗其中一個。

容易逆轉／無人會奇怪／無替代方案 → 唔寫。

## 例子（呢個 repo 適用）

- 揀 `data` 分支單一快照而唔係每日 commit JSON。
- 揀官方 API 而唔劫持私有 API，並記低當時查過咩。
- 揀某個授權條款（見 repo 根 `LICENSE`）。
