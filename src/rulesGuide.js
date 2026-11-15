// 「規定」分頁：各支部（同領袖）嘅佩戴規定，以列點顯示 — SCOUT3D v1.0 · © SCOUT SYSTEM
// 用戶指示（2026-11-13）：服裝、徽章分頁唔再顯示小備註，改喺呢度集中列出，方便查各支部同領袖規定。
// 每組 = { title: i18n key, items: [...] }；item = i18n key，或者 { k, v }（v = 只喺某個款式顯示：land / sea / air）。
// JSON 項目（{ json: 'levels' | 'uniforms' }）由規則資料讀；逐件規定、未宣誓、唔可以戴、文件之間嘅分別喺 RulesTab 自動加。

const SCOUT_BADGES = ['badge.why.sweater', 'pick.regionAuto'];

export const RULES_GUIDE = {
  grasshopper: [
    { title: 'rules.g.uniform', items: ['outfit.stepNote', 'outfit.vestNote'] },
    { title: 'rules.g.invest', items: ['outfit.investedNote'] },
    { title: 'rules.g.school', items: ['outfit.schoolNote', 'outfit.schoolUH', 'outfit.schoolGSG', 'badge.why.schoolUninvested'] },
    { title: 'rules.g.badges', items: ['badges.tip'] },
  ],
  cub: [
    { title: 'rules.g.uniform', items: ['outfit.cubNoteBoy', 'outfit.cubNoteGirl'] },
    { title: 'rules.g.invest', items: ['outfit.investedNoteCub'] },
    { title: 'rules.g.hat', items: ['outfit.cubHatNote'] },
    { title: 'rules.g.sweater', items: ['outfit.sweaterNoteGreen'] },
    { title: 'rules.g.badges', items: ['badges.tipCub', ...SCOUT_BADGES] },
  ],
  scout: [
    {
      title: 'rules.g.uniform',
      items: [
        { k: 'outfit.scoutNoteBoy', v: 'land' },
        { k: 'outfit.scoutNoteGirl', v: 'land' },
        { k: 'outfit.seaNoteBoy', v: 'sea' },
        { k: 'outfit.seaNoteGirl', v: 'sea' },
        { k: 'outfit.airNoteBoy', v: 'air' },
        { k: 'outfit.airNoteGirl', v: 'air' },
        'outfit.scoutVariants',
      ],
    },
    { title: 'rules.g.invest', items: ['outfit.investedNoteScout'] },
    {
      title: 'rules.g.hat',
      items: [
        { k: 'outfit.scoutHatNote', v: 'land' },
        { k: 'outfit.seaHatNote', v: 'sea' },
        { k: 'outfit.airHatNote', v: 'air' },
      ],
    },
    { title: 'rules.g.neck', items: ['outfit.scoutWoggle'] },
    {
      title: 'rules.g.sweater',
      items: [
        { k: 'outfit.sweaterNoteGreen', v: 'land' },
        { k: 'outfit.sweaterNoteNavy', v: ['sea', 'air'] },
      ],
    },
    { title: 'rules.g.badges', items: ['badges.tipScout', ...SCOUT_BADGES, 'badges.extraNoteScout'] },
  ],
  venture: [
    {
      title: 'rules.g.uniform',
      items: [
        { k: 'outfit.ventureNoteBoy', v: 'land' },
        { k: 'outfit.ventureNoteGirl', v: 'land' },
        { k: 'outfit.ventureSeaNoteBoy', v: 'sea' },
        { k: 'outfit.ventureSeaNoteGirl', v: 'sea' },
        { k: 'outfit.ventureAirNoteBoy', v: 'air' },
        { k: 'outfit.ventureAirNoteGirl', v: 'air' },
        'outfit.ventureLegwearNote',
        'outfit.ventureTrousersOn',
        'outfit.ventureVariants',
      ],
    },
    { title: 'rules.g.invest', items: ['outfit.investedNoteVenture'] },
    {
      title: 'rules.g.hat',
      items: [
        { k: 'outfit.ventureHatNote', v: 'land' },
        { k: 'outfit.ventureSeaHatNote', v: 'sea' },
        { k: 'outfit.ventureAirHatNote', v: 'air' },
      ],
    },
    { title: 'rules.g.neck', items: ['outfit.scoutWoggle', 'outfit.tieNote'] },
    { title: 'rules.g.sweater', items: ['outfit.sweaterNoteVenture'] },
    { title: 'rules.g.badges', items: ['badges.tipVenture', ...SCOUT_BADGES, 'badges.extraNoteVenture', 'badge.why.needsStage'] },
  ],
  rover: [
    {
      title: 'rules.g.uniform',
      items: [
        { k: 'outfit.roverNoteBoy', v: 'land' },
        { k: 'outfit.roverNoteGirl', v: 'land' },
        { k: 'outfit.roverSeaNoteBoy', v: 'sea' },
        { k: 'outfit.roverSeaNoteGirl', v: 'sea' },
        { k: 'outfit.roverAirNoteBoy', v: 'air' },
        { k: 'outfit.roverAirNoteGirl', v: 'air' },
        'outfit.roverLegwearNote',
        'outfit.roverTrousersOn',
        'outfit.roverVariants',
      ],
    },
    { title: 'rules.g.invest', items: ['outfit.investedNoteRover'] },
    {
      title: 'rules.g.hat',
      items: [
        { k: 'outfit.roverHatNote', v: 'land' },
        { k: 'outfit.roverSeaHatNote', v: 'sea' },
        { k: 'outfit.roverAirHatNote', v: 'air' },
      ],
    },
    { title: 'rules.g.neck', items: ['outfit.scoutWoggle', 'outfit.tieNoteRover'] },
    { title: 'rules.g.sweater', items: ['outfit.sweaterNoteRover'] },
    { title: 'rules.g.badges', items: ['badges.tipRover', ...SCOUT_BADGES, 'badges.extraNoteRover', 'badge.why.replaced_peace'] },
  ],
  leader: [
    { title: 'rules.g.levels', items: ['badges.tipLeader', { json: 'levels' }] },
    {
      title: 'rules.g.uniformNo',
      items: [
        { json: 'uniforms' },
        { k: 'outfit.leaderNote_land', v: 'land' },
        { k: 'outfit.leaderNote_sea', v: 'sea' },
        { k: 'outfit.leaderNote_air', v: 'air' },
        'outfit.dressNote_u1',
        'outfit.dressNote_u2',
        'outfit.dressOneStyle',
      ],
    },
    {
      title: 'rules.g.hat',
      items: [
        { k: 'outfit.leaderHatNote', v: 'land' },
        { k: 'outfit.leaderHardHatNote', v: 'land' },
        { k: 'outfit.ventureLeaderNote', v: 'land' },
        { k: 'outfit.instructorNoHardHat', v: 'land' },
        { k: 'outfit.leaderSeaHatNote', v: 'sea' },
        { k: 'outfit.leaderAirHatNote', v: 'air' },
        'outfit.leaderMessHatNote',
      ],
    },
    {
      title: 'rules.g.neck',
      items: [
        'outfit.neckerNote_unit',
        'outfit.neckerNote_association',
        'outfit.neckerNote_gilwell',
        'outfit.woggleNote',
        'outfit.woggleNoteTrainer',
        { k: 'outfit.leaderTieNote_land', v: 'land' },
        { k: 'outfit.leaderTieNote_sea', v: 'sea' },
        { k: 'outfit.leaderTieNote_air', v: 'air' },
        'outfit.dressTieNote',
        'outfit.eveningNeckNote',
      ],
    },
    { title: 'rules.g.wood', items: ['outfit.woodBadgeNote', 'outfit.woodBadgeEvening'] },
    { title: 'rules.g.sweater', items: ['outfit.sweaterNoteLeader'] },
    { title: 'rules.g.badges', items: ['badge.why.sweater', 'pick.nameNote', 'badges.extraNoteLeader', 'badge.why.replaced_commendation'] },
    { title: 'rules.g.awards', items: ['badges.awardsNote', 'badges.awardsMiniNote', 'badges.occasionFormalNote', 'badges.occasionGeneralNote'] },
  ],
};

/** 某個款式要唔要顯示呢項（冇 v = 全部款式都顯示） */
export function itemFor(item, variant) {
  if (typeof item === 'string') return item;
  if (item.json) return item;
  if (!item.v) return item.k;
  const vs = Array.isArray(item.v) ? item.v : [item.v];
  return vs.includes(variant) ? item.k : null;
}

/** 列出某支部、某款式嘅組同項目（已篩走唔關事嘅款式；空組唔顯示） */
export function guideFor(section, variant) {
  return (RULES_GUIDE[section] || [])
    .map((g) => ({ title: g.title, items: g.items.map((x) => itemFor(x, variant)).filter(Boolean) }))
    .filter((g) => g.items.length);
}

/** 全部用到嘅 i18n key（測試用：每個 key 中英都要有） */
export function guideKeys() {
  const keys = new Set();
  for (const groups of Object.values(RULES_GUIDE))
    for (const g of groups) {
      keys.add(g.title);
      for (const x of g.items) if (typeof x === 'string') keys.add(x);
      else if (x.k) keys.add(x.k);
    }
  return [...keys];
}
