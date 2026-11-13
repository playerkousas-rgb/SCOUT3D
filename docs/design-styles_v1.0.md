# 🎨 House DESIGN Styles v1.0 — 自家風格起點（抄一頁做 DESIGN.md）

> 檔名版號：v1.0 · © SCOUT SYSTEM
> 點解有呢份：Refero 嗰種「2,000 個 DESIGN.md」好用，但嗰啲係人哋品牌（Stripe／Apple），唔抄得。我哋自己嗰套就係呢三套，由 SCOUT SYSTEM 既有 app 嘅用色同 docs/23 規矩沉澱出嚟；開新 repo 嗰陣揀一套，成份抄去嗰個 repo 嘅 `DESIGN.md` 再按需要改，唔好逐頁換風格（design-review 紅線）。
> 未實測：呢三套未喺真 app 落地過；用之前用 WebAIM 對比檢查器驗文字對比（AA 一般文字 ≥ 4.5:1），過到先寫入 DESIGN.md 當定案。

## 點揀

| 場景 | 揀邊套 |
|---|---|
| 戶外／活動／營地類 app、畀家長同領袖用 | A. Scout Field |
| 文件／通告／紀錄類、要印出嚟都好睇 | B. Scout Paper |
| 系統／後台／工具類、資料密、要耐看 | C. Scout Clean |

---

## A. Scout Field（戶外活動）

```css
:root{
  --bg:#f7f8f3;        /* 霧白 */
  --surface:#ffffff;
  --fg:#22302a;        /* 深林綠字 */
  --muted:#5c6b63;
  --accent:#2c5a3c;    /* 主綠：掣、連結、重點 */
  --accent-2:#e8822b;  /* 營火橙：只做一個主 CTA 同警示點綴 */
  --danger:#b3261e;
  --line:#d8e0da;
}
```

- 字體：標題同內文同一套 sans（system-ui／Noto Sans TC），唔好溝襯線。
- 形狀：圓角 10–12px、邊框用 `--line`、唔用陰影堆層次；卡片白底放喺 `--bg` 上面。
- 動態：入場 fade-up（scroll-triggered），只郁 `transform`／`opacity`；主 CTA 先有 hover 反應，其他掣唔好個個都彈。
- 唔好做：成版綠、橙色用超過兩個位、攞風景相做文字底（壓字要實測對比）。

## B. Scout Paper（文件檔案）

```css
:root{
  --bg:#faf7f0;        /* 紙米白 */
  --surface:#ffffff;
  --fg:#2b2b26;
  --muted:#6f6a5e;
  --accent:#7a4a21;    /* 皮革啡：標題、連結 */
  --accent-2:#2c5a3c;  /* 主綠：只做狀態同確認掣 */
  --danger:#b3261e;
  --line:#e5ddcb;
}
```

- 字體：標題可用襯線（Noto Serif TC）營造檔案感，內文仍然 sans；表格數字用等寬對齊。
- 形狀：圓角細（6px）、分 section 用橫線唔用卡片浮起；印出嚟（print CSS）要白底黑字冇底色。
- 動態：近乎唔郁，最多 fade；文件類唔好玩視差同大幅過場。
- 唔好做：成版米色搞到似舊紙發黃、啡色做內文字（對比唔夠，用 `--fg`）。

## C. Scout Clean（系統後台）

```css
:root{
  --bg:#f5f6f8;
  --surface:#ffffff;
  --fg:#1f2430;
  --muted:#5f6b7a;
  --accent:#2456c8;    /* 系統藍：掣、連結、focus */
  --accent-2:#2c5a3c;  /* 成功／完成狀態先用 */
  --danger:#b3261e;
  --line:#dde2ea;
}
```

- 字體：全 sans；label 細而密、數字等寬；一版唔超過三級字體大小差。
- 形狀：圓角 8px、表格同列表行高密、狀態用文字＋色一齊表達（唔好淨靠紅綠分錯誤，色盲都睇到）。
- 動態：只做即時回饋（掣按下、儲存成功一閃），唔做入場表演；管理畫面嘅動畫預算係零都得。
- 唔好做：漸層、發光、染色方框 icon、假數字充場面（design-review 反 slop 清單）。

---

## 用之前 checklist

- [ ] 揀一套，成份抄入新 repo `DESIGN.md`，寫明揀邊套同點解
- [ ] WebAIM 驗 `--fg` 對 `--bg`／`--surface`、白字對 `--accent` 嘅對比（≥ 4.5:1；大字 ≥ 3:1）
- [ ] 主題色同圖標主色一致（docs/33 §4 第 7 點）；favicon 用 Icon Maker 出
- [ ] 暗色模式要重新配對驗過，先好開；唔好用 CSS filter 反色扮暗色
- [ ] 改咗 tokens 就升呢份嘅版號，唔好喺個別 repo 靜靜改到同呢份唔同又唔記錄
