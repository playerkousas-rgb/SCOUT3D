// SCOUT3D 主介面 — v1.0 · © SCOUT SYSTEM
import { Suspense, forwardRef, lazy, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { guideFor } from './rulesGuide.js';
import { useLang, LangToggle, bi, pick } from './i18n.jsx';
import { SECTIONS, SECTION_IDS, DISTRICTS, PATROLS, RULE_ERRORS, badgeById, sourceLines } from './data/rules.js';
import { garmentsFor, variantOf } from './data/validate.js';
import { NECKER, WOGGLE, PLAIN } from './palette.js';
import { shownReason } from './three/badgeLayout.js';
import { resolveArt, meritYearOk, findDistrict, findPatrol, ranksFor, fixRank, rankRowOf, leaderNeckwear, messCapOf, troopNumber, ordinalSuffix } from './lib/picks.js';
import { NECKER_THIRD } from './lib/necker.js';
import { leaderUniform, isDress } from './three/body.js';
import { APP_VERSION } from './version.js';

const Scene = lazy(() => import('./three/Scene.jsx'));

const DEFAULT_OUTFIT = {
  gender: 'boy',
  finish: 'painted',
  invested: true,
  // 服裝（手冊 P.23–24）：預設同手冊 P.25 附圖一樣 — 橙色活動服、短袖、灰色長褲
  top: 'orange',
  topColour: '#ffffff',
  sleeves: 'short',
  school: false,
  schoolLayout: 'uh',
  legwear: 'trousers',
  legColour: '#8a9099',
  socks: 'short',
  sockColour: '#ffffff',
  hat: 'none',
  hatColour: '#1f2f4f',
  vest: false,
  vestColour: '#1f2f4f',
  neckerMain: '#e9b425',
  neckerBorder: '#5b3fa0',
  woggle: '#1f4e9c',
};

// 幼童軍（手冊 P.28–29）：制服固定，只揀人物、帽、旅巾顏色
const CUB_OUTFIT = {
  gender: 'boy',
  finish: 'painted',
  invested: true,
  hat: true,
  sweater: false, // 制服毛衣（手冊 P.121–122）
  neckerMain: '#2e7d4f',
  neckerBorder: '#2e7d4f',
  woggle: '#1f4e9c',
};

// 童軍（手冊 P.30–35）：揀款式（童軍／海童軍／空童軍），其餘制服固定；巾圈係啡色皮巾圈（唔使揀顏色）
const SCOUT_OUTFIT = {
  variant: 'land',
  gender: 'boy',
  finish: 'painted',
  invested: true,
  hat: true,
  sweater: false, // 制服毛衣（手冊 P.121–122）
  neckerMain: '#2e7d4f',
  neckerBorder: '#2e7d4f',
  woggle: '#1f4e9c',
};

// 深資童軍（手冊 P.36–41）：同童軍一樣揀款式；女團員可以揀半截裙／長褲（綱要 P.15）
// neckwear：旅巾／領帶（領帶制服，手冊 P.48、P.113）
const VENTURE_OUTFIT = { ...SCOUT_OUTFIT, ventureLegwear: 'skirt', neckwear: 'necker', neckerMain: '#8b2231', neckerBorder: '#8b2231' };

// 樂行童軍（手冊 P.42–47）：同深資童軍一樣嘅揀法（款式、半截裙／長褲、旅巾／領帶）
const ROVER_OUTFIT = { ...VENTURE_OUTFIT, neckerMain: '#2e7d4f', neckerBorder: '#2e7d4f' };

// 成年成員（手冊 P.52–81）：款式（陸上／海／空）、制服編號 3–6、帽（女：硬帽／軟帽；深資童軍領袖棗紅色軟帽）、
// 領巾（旅巾／會巾／基維爾領巾）、木章訓練進度（決定基維爾巾圈、木章可唔可以揀）
const LEADER_OUTFIT = {
  variant: 'land',
  gender: 'boy',
  finish: 'painted',
  invested: true,
  hat: true,
  sweater: false,
  uniform: 'u3',
  hatStyle: 'hardHat',
  ventureLeader: false,
  leaderNecker: 'unit',
  leaderWoggle: 'scout',
  training: 'none',
  woodBadge: false,
  season: 'winter', // 晚禮服：summer = 白上衣、winter = 黑上衣（手冊 P.60）
  neckerMain: '#2e7d4f',
  neckerBorder: '#e9b425',
  woggle: '#1f4e9c',
};

const DEFAULT_OUTFITS = { grasshopper: DEFAULT_OUTFIT, cub: CUB_OUTFIT, scout: SCOUT_OUTFIT, venture: VENTURE_OUTFIT, rover: ROVER_OUTFIT, leader: LEADER_OUTFIT };
/** 深資／樂行童軍：肩帶、肩章、長褲／半截裙、領帶 */
const SENIOR = new Set(['venture', 'rover']);
/** 各支部共用嘅設定（轉支部時保留） */
const SHARED_OUTFIT_KEYS = ['gender', 'finish', 'invested'];

// 幼童軍預設：基本徽章全開（手冊 P.26：世界童軍會員章、香港章、地域章、區章、旅章）
const CUB_BADGES = {
  membership: true,
  hongKong: true,
  troop: true,
  region: true,
  district: true,
  meritorious: false,
};

// 童軍預設：制服頁列明嘅基本徽章全開（手冊 P.30：世界童軍會員章、香港章、地域章、區章、旅章、小隊章）
const SCOUT_BADGES = { ...CUB_BADGES, patrol: true };

// 深資童軍預設：基本徽章全開（手冊 P.36）；深資童軍肩章（有選項）用規則 JSON 嘅 default
const VENTURE_BADGES = { ...CUB_BADGES, epaulette: SECTIONS.venture.badges.find((b) => b.id === 'epaulette')?.default ?? 'none' };
// 樂行童軍預設：基本徽章全開（手冊 P.42）；樂行童軍肩章（有選項）用規則 JSON 嘅 default
const ROVER_BADGES = { ...CUB_BADGES, epaulette: SECTIONS.rover.badges.find((b) => b.id === 'epaulette')?.default ?? 'none' };

// 成年成員預設：必備章全開（手冊 P.92–95、P.103–106）；香港肩章／旅章、總會總部章／地域章／區章跟單位層級自動揀
// 「R」字樣別針（退休）、優異旅團章係可選
// 禮服／晚禮服（v11）：金屬職級肩章必備；布質名牌、喪禮黑布、感謝章係開關；勳章、嘉許笛繩用規則 JSON 嘅 default（冇）
const LEADER_BADGES = {
  membership: true, hongKong: true, hkTitle: true, troop: true, ahq: true, region: true, district: true, epaulette: true, retiredPin: false, meritorious: false,
  metalEpaulette: true, nameTag: false, mourningBand: false, thanksBadge: false,
  ...Object.fromEntries(SECTIONS.leader.badges.filter((b) => b.choices).map((b) => [b.id, b.default])),
};

// 用戶自選：所屬區（決定區章、地域章圖案）、優異旅團章年份、童軍小隊；成年成員：單位層級、職級
// 布質名牌姓名（nameZh／nameEn）只喺瀏覽器入面用，唔會上載
const DEFAULT_PICKS = { districtId: '', regionId: '', troopNo: '', meritYear: new Date().getFullYear(), patrolId: '', level: 'group', rank: 'sectionLeader', nameZh: '', nameEn: '' };

// 預設：必須佩戴嘅章 + 旅章、區章（同手冊 P.25 附圖一樣）
const DEFAULT_BADGES = {
  membership: true,
  progress: 2,
  grasshopperAward: false,
  troop: true,
  district: true,
  meritorious: false,
  commemorative: false,
};
const DEFAULT_BADGE_STATES = { grasshopper: DEFAULT_BADGES, cub: CUB_BADGES, scout: SCOUT_BADGES, venture: VENTURE_BADGES, rover: ROVER_BADGES, leader: LEADER_BADGES };
/** 成年成員：單位層級（只喺 leader 用，其他支部唔篩） */
const levelOf = (section, picks) => (section === 'leader' ? picks.level : null);

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

/* ---------- 小元件 ---------- */
function Segmented({ label, value, options, onChange }) {
  return (
    <div className="field">
      <span className="field__label" id={`lbl-${label}`}>
        {label}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={`lbl-${label}`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`seg__btn${value === o.value ? ' is-on' : ''}`}
            disabled={!!o.disabled}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

function Swatches({ label, value, options, onChange }) {
  const { lang, t } = useLang();
  // 最後一格：用色盤自選顏色（用戶指示）
  const custom = !!value && !options.some((o) => o.id === value);
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="swatches">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`swatch${value === o.id ? ' is-on' : ''}`}
            style={{ background: o.id }}
            aria-label={bi(lang, o.zh, o.en)}
            aria-pressed={value === o.id}
            title={bi(lang, o.zh, o.en)}
            onClick={() => onChange(o.id)}
          />
        ))}
        <label className={`swatch swatch--custom${custom ? ' is-on' : ''}`} title={t('swatch.custom')} style={custom ? { background: value } : undefined}>
          <input type="color" value={HEX.test(value ?? '') ? value : '#888888'} onChange={(e) => onChange(e.target.value)} aria-label={`${label}${lang === 'en' ? ': ' : '：'}${t('swatch.custom')}`} />
        </label>
      </div>
    </div>
  );
}

function Switch({ label, checked, onChange, disabled }) {
  return (
    <div className={`switchrow${disabled ? ' is-disabled' : ''}`}>
      <label className="switch">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch__track" aria-hidden="true" />
        <span className="switch__label">{label}</span>
      </label>
    </div>
  );
}

function Sources({ rules, list }) {
  const { lang, t } = useLang();
  return (
    <ul className="srclist">
      {sourceLines(rules, lang, list).map((s) => (
        <li key={`${s.ref}-${s.page}`}>
          {s.name}
          {lang === 'en' ? ', ' : '，'}
          {t('info.page')} {s.page}
        </li>
      ))}
    </ul>
  );
}

/* ---------- 徽章圖案 ---------- */
function ArtLine({ rules, art }) {
  const { lang, t } = useLang();
  const src = rules.sources[art.ref];
  return (
    <span className="muted">
      {t(art.user ? 'info.artUser' : art.example ? 'info.artExample' : 'info.artOfficial')}
      {lang === 'en' ? ': ' : '：'}
      {src ? bi(lang, src.zh, src.en) : art.ref}
      {!art.user && (
        <>
          {lang === 'en' ? ', ' : '，'}
          {t('info.page')} {art.page}
        </>
      )}
    </span>
  );
}

/* ---------- 自選圖案（區章、地域章、優異旅團章） ---------- */
/** 某個章而家嘅圖案（resolveArt 結果）；優異旅團章要即場畫年份，所以有 src 狀態 */
function useArtSrc(art) {
  const [src, setSrc] = useState(art?.kind === 'image' ? art.file : null);
  const key = art ? (art.kind === 'merit' ? `m-${art.colour}-${art.year}` : art.kind === 'nameTag' ? `n-${art.zh}-${art.en}` : art.kind === 'troopTape' ? `t-${art.no}` : art.file) : '';
  useEffect(() => {
    let alive = true;
    if (!art) setSrc(null);
    else if (art.kind === 'image') setSrc(art.file);
    else if (art.kind === 'nameTag')
      import('./lib/nameTagCanvas.js')
        .then((m) => alive && setSrc(m.nameTagCanvas(art, 48).toDataURL('image/png')))
        .catch(() => alive && setSrc(null));
    else if (art.kind === 'troopTape')
      import('./lib/troopTapeCanvas.js')
        .then((m) => alive && setSrc(m.troopTapeCanvas(art, 60).toDataURL('image/png')))
        .catch(() => alive && setSrc(null));
    else
      import('./lib/meritCanvas.js')
        .then((m) => m.meritDataUrl(art))
        .then((u) => alive && setSrc(u))
        .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return src;
}

function ArtImg({ art, alt, className }) {
  const src = useArtSrc(art);
  if (!src) return <span className={`${className} artimg--empty`} aria-hidden="true" />;
  return <img src={src} alt={alt} className={className} />;
}

const MERIT_NAME = { red: { zh: '紅色', en: 'red' }, purple: { zh: '紫色', en: 'purple' }, blue: { zh: '粉藍色', en: 'light blue' } };

/** 揀區：一個選單，按地域分組；地域章跟住自動轉 */
function DistrictPicker({ picks, setPicks, id }) {
  const { lang, t } = useLang();
  const hit = picks.districtId ? findDistrict(DISTRICTS, picks.districtId) : null;
  return (
    <div className="picker">
      <label className="field__label" htmlFor={id}>
        {t('pick.district')}
      </label>
      <select id={id} className="select" value={picks.districtId} onChange={(e) => setPicks((p) => ({ ...p, districtId: e.target.value }))}>
        <option value="">{t('pick.none')}</option>
        {DISTRICTS.regions.map((r) => (
          <optgroup key={r.id} label={bi(lang, r.zh, r.en)}>
            {r.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {bi(lang, d.zh, d.en)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {hit && (
        <p className="muted">
          {t('pick.region')}
          {lang === 'en' ? ': ' : '：'}
          {bi(lang, hit.region.zh, hit.region.en)}
          {!hit.region.badge && ` — ${t('pick.noRegionBadge')}`}
        </p>
      )}
    </div>
  );
}

/** 成年成員地域層級：直接揀地域（只戴地域章，手冊 P.94–95） */
function RegionPicker({ picks, setPicks, id }) {
  const { lang, t } = useLang();
  return (
    <div className="picker">
      <label className="field__label" htmlFor={id}>
        {t('pick.regionPick')}
      </label>
      <select id={id} className="select" value={picks.regionId ?? ''} onChange={(e) => setPicks((p) => ({ ...p, regionId: e.target.value }))}>
        <option value="">{t('pick.none')}</option>
        {DISTRICTS.regions
          .filter((r) => r.badge)
          .map((r) => (
            <option key={r.id} value={r.id}>
              {bi(lang, r.zh, r.en)}
            </option>
          ))}
      </select>
    </div>
  );
}

/** 旅條：輸入旅號，英文序數自動轉（1ST、22ND、33RD、44TH） */
function TroopPicker({ picks, setPicks, id }) {
  const { t } = useLang();
  const no = troopNumber(picks.troopNo);
  return (
    <div className="picker">
      <label className="field__label" htmlFor={id}>
        {t('pick.troopNo')}
      </label>
      <input
        id={id}
        className="select"
        type="text"
        inputMode="numeric"
        maxLength={8}
        value={picks.troopNo ?? ''}
        placeholder="22"
        onChange={(e) => setPicks((p) => ({ ...p, troopNo: e.target.value }))}
      />
      {no && <p className="muted">{`${no}${ordinalSuffix(no)} HONG KONG GROUP · SCOUT ASSOCIATION OF HK`}</p>}
    </div>
  );
}

/** 揀小隊（綱要 P.199–202：32 隊，隊名同隊色） */
function PatrolPicker({ picks, setPicks, id }) {
  const { lang, t } = useLang();
  const hit = picks.patrolId ? findPatrol(PATROLS, picks.patrolId) : null;
  return (
    <div className="picker">
      <label className="field__label" htmlFor={id}>
        {t('pick.patrol')}
      </label>
      <select id={id} className="select" value={picks.patrolId} onChange={(e) => setPicks((p) => ({ ...p, patrolId: e.target.value }))}>
        <option value="">{t('pick.patrolNone')}</option>
        {PATROLS.patrols.map((p) => (
          <option key={p.id} value={p.id}>
            {lang === 'en' ? `${p.en} (${p.colours.en})` : `${p.zh} ${p.en}（${p.colours.zh}）`}
          </option>
        ))}
      </select>
      {hit && (
        <p className="muted">
          {t('pick.patrolColours')}
          {lang === 'en' ? ': ' : '：'}
          {bi(lang, hit.colours.zh, hit.colours.en)}
        </p>
      )}
    </div>
  );
}

/** 優異旅團章年份：顏色每 3 年輪一次 */
function YearPicker({ picks, setPicks, id }) {
  const { lang, t } = useLang();
  const [text, setText] = useState(String(picks.meritYear));
  useEffect(() => setText(String(picks.meritYear)), [picks.meritYear]);
  const ok = meritYearOk(text);
  const art = resolveArt({ dynamic: 'meritorious', art: { file: '' } }, { meritYear: picks.meritYear }, DISTRICTS);
  return (
    <div className="picker">
      <label className="field__label" htmlFor={id}>
        {t('pick.year')}
      </label>
      <div className="picker__row">
        <input
          id={id}
          className="input"
          type="number"
          inputMode="numeric"
          min="1999"
          max={new Date().getFullYear() + 1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (meritYearOk(e.target.value)) setPicks((p) => ({ ...p, meritYear: Number(e.target.value) }));
          }}
          aria-invalid={!ok}
        />
        {art && (
          <span className={`chip chip--merit chip--${art.colour}`}>{bi(lang, MERIT_NAME[art.colour].zh, MERIT_NAME[art.colour].en)}</span>
        )}
      </div>
      <p className={ok ? 'muted' : 'note note--warn'}>{ok ? t('pick.yearCycle') : t('pick.yearBad')}</p>
    </div>
  );
}

/* ---------- 徽章資料卡 ---------- */
function InfoCard({ rules, id, outfit, badges, picks, unavailable, onClose, onFocus }) {
  const { lang, t } = useLang();
  const b = badgeById(rules, id);
  const arts = Array.isArray(b.art) ? b.art : [b.art];
  const now = b.dynamic ? resolveArt(b, picks, DISTRICTS, PATROLS) : null;
  const reason = shownReason(rules, outfit, badges, id, { unavailable, level: levelOf(rules.section.id, picks) });
  const shown = reason === null;
  const st = rules.schoolTop;
  const onNecker = st && outfit.school && ['membership', 'progress', 'grasshopperAward'].includes(id);
  const sizeText = `${b.size.wCm} × ${b.size.hCm} cm（${t(b.size.measured ? 'info.sizeMeasured' : 'info.sizeGuess')}）`;
  const picked = now?.district ?? now?.region;
  return (
    <section className="card" aria-live="polite">
      <header className="card__head">
        <h2 className="card__title">{pick(lang, b, 'name')}</h2>
        <button type="button" className="iconbtn" onClick={onClose} aria-label={t('info.close')} title={t('info.close')}>
          ×
        </button>
      </header>
      <div className="card__chips">
        <span className="chip chip--plain">{t(b.required ? 'info.required' : 'info.optional')}</span>
      </div>
      <div className="card__art">
        {b.dynamic ? (
          <ArtImg art={now} alt={pick(lang, b, 'name')} className="" />
        ) : b.choices && b.choices.some((c) => c.id === badges[b.id] && c.art) ? (
          <img src={b.choices.find((c) => c.id === badges[b.id]).art.file} alt={pick(lang, b, 'name')} />
        ) : (
          arts.map((a) => <img key={a.file} src={a.file} alt={pick(lang, b, 'name')} className={b.size.shape === 'circle' ? 'is-round' : ''} />)
        )}
      </div>
      {b.dynamic === 'troop' && now?.kind === 'troopTape' ? (
        <span className="muted">
          {t('pick.troopNo')}
          {lang === 'en' ? ': ' : '：'}
          {`${now.no}${now.suffix} HONG KONG GROUP`}
        </span>
      ) : b.dynamic === 'patrol' && now?.patrol ? (
        <span className="muted">
          {t('pick.artPatrol')}
          {lang === 'en' ? ': ' : '：'}
          {bi(lang, `${now.patrol.zh}（${now.patrol.colours.zh}）`, `${now.patrol.en} (${now.patrol.colours.en})`)}
        </span>
      ) : b.dynamic && picked ? (
        <span className="muted">
          {t('pick.artWeb')}
          {lang === 'en' ? ': ' : '：'}
          {b.dynamic === 'region' ? bi(lang, now.region.zh, now.region.en) : bi(lang, picked.zh, picked.en)}
        </span>
      ) : b.dynamic === 'rank' && now?.row ? (
        <RankLine rules={rules} row={now.row} picks={picks} />
      ) : b.dynamic === 'metalRank' && now?.row ? (
        <MetalRankLine rules={rules} row={now.row} picks={picks} />
      ) : b.dynamic === 'meritorious' && now ? (
        <span className="muted">
          {t('pick.artMerit')} {now.year}・{bi(lang, MERIT_NAME[now.colour].zh, MERIT_NAME[now.colour].en)}
        </span>
      ) : (
        <ArtLine rules={rules} art={arts[0]} />
      )}
      {!shown && <p className="note">{t(reason === 'off' ? 'info.hidden' : `badge.why.${reason}`)}</p>}
      {onNecker && (
        <div className="note note--warn">
          <strong>{pick(lang, st, 'name')}</strong>
          <p>{pick(lang, st, 'place')}</p>
          <p className="muted">{t(outfit.schoolLayout === 'gsg' ? 'outfit.schoolGSG' : 'outfit.schoolUH')}</p>
        </div>
      )}
      <dl className="facts">
        <dt>{t('info.place')}</dt>
        <dd>{pick(lang, b, 'place')}</dd>
        <dt>{t('info.quote')}</dt>
        <dd>
          <blockquote>{pick(lang, b, 'quote')}</blockquote>
        </dd>
        <dt>{t('info.conditions')}</dt>
        <dd>{pick(lang, b, 'conditions')}</dd>
        <dt>{t('info.size')}</dt>
        <dd>{sizeText}</dd>
        {b.modelNote && (
          <>
            <dt>{t('info.model')}</dt>
            <dd>{bi(lang, b.modelNote.zh, b.modelNote.en)}</dd>
          </>
        )}
        <dt>{t('info.source')}</dt>
        <dd>
          <Sources rules={rules} list={b.sources} />
        </dd>
      </dl>
      <button type="button" className="btn btn--ghost" onClick={onFocus} disabled={!shown}>
        {t('info.focus')}
      </button>
    </section>
  );
}

/* ---------- 徽章分頁 ---------- */
function BadgeRowArt({ b, badges, picks }) {
  const chosen = b.choices ? b.choices.find((c) => c.id === badges[b.id]) : null;
  if (chosen && !chosen.art) return <span className="badgerow__art badgerow__art--none" aria-hidden="true" />;
  const art = chosen
    ? { kind: 'image', file: chosen.art.file }
    : b.dynamic
    ? resolveArt(b, picks, DISTRICTS, PATROLS)
    : { kind: 'image', file: (Array.isArray(b.art) ? b.art[Math.max(0, Math.min(3, (badges.progress || 1) - 1))] : b.art).file };
  return <ArtImg art={art} alt="" className={`badgerow__art${b.size.shape === 'circle' ? ' is-round' : ''}`} />;
}

/** 成年成員：單位層級 → 職級（職級清單跟層級篩選，手冊 P.94–95、P.103–104） */
function LevelRankPicker({ rules, picks, setPicks }) {
  const { lang, t } = useLang();
  const level = picks.level ?? 'group';
  const rank = fixRank(rules, level, picks.rank);
  return (
    <div className="picker picker--leader">
      <Segmented
        label={t('pick.level')}
        value={level}
        onChange={(v) => setPicks((p) => ({ ...p, level: v, rank: fixRank(rules, v, p.rank) }))}
        options={rules.levels.map((x) => ({ value: x.id, label: pick(lang, x, 'name') }))}
      />
      <label className="field__label" htmlFor="pick-rank">
        {t('pick.rank')}
      </label>
      <select id="pick-rank" className="select" value={rank ?? ''} onChange={(e) => setPicks((p) => ({ ...p, rank: e.target.value }))}>
        {ranksFor(rules, level).map((r) => (
          <option key={r.id} value={r.id}>
            {pick(lang, r, 'name')}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 揀咗嘅職級：帽章顏色、肩章樣式（手冊 P.103–104 表格） */
function RankLine({ rules, row, picks }) {
  const { lang, t } = useLang();
  const r = (rules.ranks || []).find((x) => x.id === picks.rank);
  return (
    <div className="rankline">
      <img src={row.cap.file} alt="" className="rankline__cap" />
      <span className="muted">
        {r ? `${pick(lang, r, 'name')}${lang === 'en' ? ': ' : '：'}` : ''}
        {t('pick.capColour')} {bi(lang, row.cap.zh, row.cap.en)}
        {lang === 'en' ? ' · ' : '・'}
        {t('pick.epaulette')} {bi(lang, row.zh.epaulette, row.en.epaulette)}
        {lang === 'en' ? ' (Handbook pp.103–104)' : '（手冊 P.103–104）'}
      </span>
    </div>
  );
}

/** 徽章清單一行 */
function BadgeRow({ b, rules, section, outfit, badges, set, picks, setPicks, unavailable, selected, onPick }) {
  const { lang, t } = useLang();
  const disabled = b.needsInvestiture && !outfit.invested;
  const example = b.dynamic ? resolveArt(b, picks, DISTRICTS, PATROLS)?.example : (Array.isArray(b.art) ? b.art[0] : b.art).example;
  return (
    <li className={`badgerow${selected === b.id ? ' is-sel' : ''}${disabled ? ' is-disabled' : ''}`}>
      <div className="badgerow__main">
        <BadgeRowArt b={b} badges={badges} picks={picks} />
        <div>
          <button type="button" className="badgerow__name" onClick={() => onPick(b.id)}>
            {pick(lang, b, 'name')}
          </button>
          <div className="badgerow__meta">
            <span className="chip chip--plain">{t(b.required ? 'info.required' : 'info.optional')}</span>
            {example && <span className="chip chip--plain">{t('badge.example')}</span>}
          </div>
        </div>
      </div>
      {b.choices ? (
        <div className="steps steps--choices" role="radiogroup" aria-label={`${t('badge.choice')}：${pick(lang, b, 'name')}`}>
          {b.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={badges[b.id] === c.id}
              disabled={disabled && !!c.art}
              className={`steps__btn steps__btn--wide${badges[b.id] === c.id ? ' is-on' : ''}`}
              onClick={() => set(b.id, c.id)}
            >
              {pick(lang, c, 'name')}
            </button>
          ))}
        </div>
      ) : b.id === 'progress' ? (
        <div className="steps" role="radiogroup" aria-label={t('badge.steps')}>
          {[0, 1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={badges.progress === n}
              className={`steps__btn${badges.progress === n ? ' is-on' : ''}`}
              onClick={() => set('progress', n)}
              title={n === 0 ? t('badge.none') : `${t('badge.steps')} ${n}`}
            >
              {n === 0 ? t('badge.none') : n}
            </button>
          ))}
        </div>
      ) : (
        <label className="switch switch--compact">
          <input
            type="checkbox"
            checked={!!badges[b.id] && !disabled}
            disabled={disabled}
            onChange={(e) => set(b.id, e.target.checked)}
            aria-label={`${t('badge.show')}：${pick(lang, b, 'name')}`}
          />
          <span className="switch__track" aria-hidden="true" />
        </label>
      )}
      {b.dynamic === 'district' && <DistrictPicker picks={picks} setPicks={setPicks} id={`pick-district-${section}`} />}
      {b.dynamic === 'region' && picks.level === 'region' && <RegionPicker picks={picks} setPicks={setPicks} id={`pick-region-${section}`} />}
      {b.dynamic === 'troop' && <TroopPicker picks={picks} setPicks={setPicks} id={`pick-troop-${section}`} />}
      {b.dynamic === 'meritorious' && <YearPicker picks={picks} setPicks={setPicks} id={`pick-year-${section}`} />}
      {b.dynamic === 'patrol' && <PatrolPicker picks={picks} setPicks={setPicks} id={`pick-patrol-${section}`} />}
      {b.dynamic === 'rank' && rankRowOf(b, picks.rank) && <RankLine rules={rules} row={rankRowOf(b, picks.rank)} picks={picks} />}
      {b.dynamic === 'metalRank' && rankRowOf(b, picks.rank) && <MetalRankLine rules={rules} row={rankRowOf(b, picks.rank)} picks={picks} />}
      {b.dynamic === 'nameTag' && <NamePicker picks={picks} setPicks={setPicks} />}
    </li>
  );
}

/** 晚禮服金屬職級肩章 + 黑色硬帽編號（手冊 P.206–211） */
function MetalRankLine({ rules, row, picks }) {
  const { lang, t } = useLang();
  const r = (rules.ranks || []).find((x) => x.id === picks.rank);
  const cap = messCapOf(rules, picks.rank, picks.gender);
  return (
    <span className="muted">
      {r ? `${pick(lang, r, 'name')}${lang === 'en' ? ': ' : '：'}` : ''}
      {t(picks.season === 'summer' ? 'pick.metalSummer' : 'pick.metalWinter')} {bi(lang, row.zh.epaulette, row.en.epaulette)}
      {cap && (
        <>
          {lang === 'en' ? ' · ' : '・'}
          {t('pick.messCap')} {cap.code}
          {lang === 'en' ? ` (${cap.en})` : `（${cap.zh}）`}
        </>
      )}
      {lang === 'en' ? ' (Handbook pp.206–211)' : '（手冊 P.206–211）'}
    </span>
  );
}

/** 布質名牌姓名（手冊 P.128）：只喺瀏覽器入面畫，唔會上載 */
function NamePicker({ picks, setPicks }) {
  const { t } = useLang();
  return (
    <div className="picker">
      <label className="field__label" htmlFor="pick-name-zh">
        {t('pick.nameZh')}
      </label>
      <input id="pick-name-zh" className="select" type="text" maxLength={8} value={picks.nameZh ?? ''} placeholder="童君好" onChange={(e) => setPicks((p) => ({ ...p, nameZh: e.target.value }))} />
      <label className="field__label" htmlFor="pick-name-en">
        {t('pick.nameEn')}
      </label>
      <input id="pick-name-en" className="select" type="text" maxLength={24} value={picks.nameEn ?? ''} placeholder="KH TUNG" onChange={(e) => setPicks((p) => ({ ...p, nameEn: e.target.value }))} />
    </div>
  );
}

function BadgesTab({ rules, section, outfit, badges, setBadges, picks, setPicks, unavailable, selected, onPick }) {
  const { t } = useLang();
  const set = (k, v) => setBadges((b) => ({ ...b, [k]: v }));
  // 成年成員：只列呢套制服戴嘅章（手冊 P.57、P.60：禮服／晚禮服只戴指定嘅章）；勳章及獎勵另外一組（編號 1–6 都戴得，用戶 2026-11-15）
  const uid = section === 'leader' ? leaderUniform(outfit.gender, outfit.uniform) : null;
  // 唔適用（呢套制服唔戴、呢個層級唔戴）嘅章直接唔列出（用戶指示：唔應該出現就冇開關）
  const level = levelOf(section, picks);
  const applies = (b) => (!uid || !b.uniforms || b.uniforms.includes(uid)) && (!level || !b.levels || b.levels.includes(level));
  const list = rules.badges.filter((b) => applies(b) && b.group !== 'awards');
  const awards = rules.badges.filter((b) => applies(b) && b.group === 'awards');
  const row = (b) => <BadgeRow key={b.id} b={b} rules={rules} section={section} outfit={outfit} badges={badges} set={set} picks={picks} setPicks={setPicks} unavailable={unavailable} selected={selected} onPick={onPick} />;
  return (
    <div className="tabbody">
      {rules.levels && <LevelRankPicker rules={rules} picks={picks} setPicks={setPicks} />}
      <ul className="badgelist">{list.map(row)}</ul>
      {awards.length > 0 && (
        <details className="awards" open={awards.some((b) => badges[b.id] && badges[b.id] !== 'none')}>
          <summary className="h3">{t(uid === 'u2' ? 'badges.awardsMini' : 'badges.awards')}</summary>
          <ul className="badgelist">{awards.map(row)}</ul>
        </details>
      )}
    </div>
  );
}

/* ---------- 3D 舞台：上下移動、匯出 ---------- */
/** 上下移動人物（望住點高度）：拉近之後可以睇唔同高度嘅章 */
const HeightBar = forwardRef(function HeightBar({ scene }, ref) {
  const { t } = useLang();
  const [v, setV] = useState(0.85);
  useImperativeHandle(ref, () => ({ set: (y) => setV(Math.round(y * 100) / 100) }), []);
  const go = (y) => {
    const ny = Math.max(0.1, Math.min(1.7, y));
    setV(ny);
    scene.current?.setHeight(ny);
  };
  return (
    <div className="heightbar" role="group" aria-label={t('view.height')}>
      <button type="button" className="heightbar__btn" onClick={() => go(v + 0.08)} aria-label={t('view.up')} title={t('view.up')}>
        ▲
      </button>
      <div className="heightbar__track">
        <input type="range" min={0.1} max={1.7} step={0.01} value={v} aria-label={t('view.height')} title={t('view.height')} onChange={(e) => go(Number(e.target.value))} />
      </div>
      <button type="button" className="heightbar__btn" onClick={() => go(v - 0.08)} aria-label={t('view.down')} title={t('view.down')}>
        ▼
      </button>
    </div>
  );
});

const PNG_SCALES = [0, 2, 4];

/** 匯出：PNG 所有人用得；GLB／STL 要密碼（伺服器環境變數 EXPORT_PIN，經 /api/export-pin 驗） */
function ExportPanel({ scene, variantTag, onClose, toast }) {
  const { t } = useLang();
  const [scale, setScale] = useState(2);
  const [transparent, setTransparent] = useState(false);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [PIN, setPinEnabled] = useState(false); // 伺服器有冇設定密碼
  useEffect(() => {
    let live = true;
    import('./lib/export3d.js')
      .then(({ pinStatus }) => pinStatus())
      .then((on) => live && setPinEnabled(on));
    return () => {
      live = false;
    };
  }, []);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      toast(t('export.done'));
    } catch {
      toast(t('export.fail'));
    } finally {
      setBusy(false);
    }
  };
  const png = () =>
    run(async () => {
      const c = scene.current?.renderImage({ scale, transparent });
      if (!c) throw new Error('no canvas');
      const { captureScreenshot, downloadBlob, stamp } = await import('./lib/screenshot.js');
      const blob = await captureScreenshot(c, t(`shot.caption.${variantTag}`));
      downloadBlob(blob, `scout3d_${variantTag}_${scale || 'screen'}x_${APP_VERSION}_${stamp()}${transparent ? '_transparent' : ''}.png`);
    });
  const model = (kind) =>
    run(async () => {
      const obj = scene.current?.figure();
      if (!obj || !unlocked) throw new Error('locked');
      const [{ exportGlb, exportStl }, { downloadBlob, stamp }] = await Promise.all([import('./lib/export3d.js'), import('./lib/screenshot.js')]);
      const blob = kind === 'glb' ? await exportGlb(obj) : await exportStl(obj);
      downloadBlob(blob, `scout3d_${variantTag}_${APP_VERSION}_${stamp()}.${kind}`);
    });
  const unlock = async (e) => {
    e.preventDefault();
    if (locked || !PIN || checking) return;
    setChecking(true);
    try {
      const { verifyPin } = await import('./lib/export3d.js');
      const r = await verifyPin(pin);
      setPin('');
      if (r.ok) setUnlocked(true);
      else if (r.locked) setLocked(true);
      else toast(t(r.error ? 'export.netFail' : 'export.wrongPin'));
    } finally {
      setChecking(false);
    }
  };
  return (
    <section className="exportpanel" aria-label={t('export.title')}>
      <header className="exportpanel__head">
        <strong>{t('export.title')}</strong>
        <button type="button" className="iconbtn" onClick={onClose} aria-label={t('info.close')} title={t('info.close')}>
          ×
        </button>
      </header>
      <Segmented
        label={t('export.scale')}
        value={scale}
        onChange={setScale}
        options={PNG_SCALES.map((k) => ({ value: k, label: k ? `${k}×` : t('export.scaleScreen') }))}
      />
      <Switch label={t('export.transparent')} checked={transparent} onChange={setTransparent} />
      <button type="button" className="btn" onClick={png} disabled={busy}>
        {t('export.png')}
      </button>
      {PIN && (
        <div className="exportpanel__3d">
          <span className="field__label">{t('export.model')}</span>
          {unlocked ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => model('glb')} disabled={busy}>
                {t('export.glb')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => model('stl')} disabled={busy}>
                {t('export.stl')}
              </button>
              <p className="muted">{t('export.modelNote')}</p>
            </>
          ) : (
            <form className="exportpanel__pin" onSubmit={unlock}>
              <input
                className="select"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                disabled={locked}
                placeholder="••••"
                aria-label={t('export.pin')}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
              <button type="submit" className="btn btn--ghost" disabled={locked || checking || pin.length !== 4}>
                {t('export.unlock')}
              </button>
              {locked && <p className="muted">{t('export.lockedOut')}</p>}
            </form>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- 服裝分頁 ---------- */
/** 旅巾顏色：素色＋花邊／斜紋（2／3 色）、左右唔同顏色、每格都可以自選顏色（用戶指示） */
function NeckerColours({ outfit, setOutfit }) {
  const { t } = useLang();
  const set = (k, v) => setOutfit((o) => ({ ...o, [k]: v }));
  const stripe = outfit.neckerPattern === 'stripe';
  const n = outfit.neckerStripes === 2 ? 2 : 3;
  const split = !!outfit.neckerSplit;
  const side = (right) => {
    const key = (b) => (right ? `neckerR${b}` : `necker${b}`);
    const val = (b) => outfit[key(b)] ?? outfit[`necker${b}`] ?? (b === 'Third' ? NECKER_THIRD : undefined);
    const pre = split ? t(right ? 'outfit.neckerRightPre' : 'outfit.neckerLeftPre') : '';
    const parts = stripe
      ? ['Main', 'Border', 'Third'].slice(0, n).map((b, i) => [b, t('outfit.neckerStripeN').replace('{n}', String(i + 1))])
      : [
          ['Main', t('outfit.neckerMain')],
          ['Border', t('outfit.neckerBorder')],
        ];
    return parts.map(([b, lbl]) => (
      <Swatches key={key(b)} label={t('outfit.neckerPart').replace('{a}', t('outfit.necker')).replace('{b}', `${pre}${lbl}`)} value={val(b)} options={NECKER} onChange={(v) => set(key(b), v)} />
    ));
  };
  return (
    <>
      <Segmented
        label={t('outfit.neckerPattern')}
        value={stripe ? 'stripe' : 'plain'}
        onChange={(v) => set('neckerPattern', v)}
        options={[
          { value: 'plain', label: t('outfit.neckerPlain') },
          { value: 'stripe', label: t('outfit.neckerStripe') },
        ]}
      />
      {stripe && (
        <Segmented
          label={t('outfit.neckerStripes')}
          value={n}
          onChange={(v) => set('neckerStripes', v)}
          options={[
            { value: 2, label: t('outfit.stripes2') },
            { value: 3, label: t('outfit.stripes3') },
          ]}
        />
      )}
      <Switch
        label={t('outfit.neckerSplit')}
        checked={split}
        onChange={(x) =>
          setOutfit((o) => ({
            ...o,
            neckerSplit: x,
            // 第一次開：右邊預設主色、花邊對調，一開就見到分別
            ...(x && !o.neckerRMain ? { neckerRMain: o.neckerBorder, neckerRBorder: o.neckerMain, neckerRThird: o.neckerThird ?? NECKER_THIRD } : {}),
          }))
        }
      />
      {side(false)}
      {split && side(true)}
    </>
  );
}

function OutfitTab({ outfit, setOutfit }) {
  const { t } = useLang();
  const set = (k, v) => setOutfit((o) => ({ ...o, [k]: v }));
  // 學校運動上衣唔係橙色活動服：開學校運動上衣就轉做單色有領；揀返橙色活動服就閂咗佢
  const setTop = (v) => setOutfit((o) => ({ ...o, top: v, school: v === 'orange' ? false : o.school }));
  const setSchool = (v) => setOutfit((o) => ({ ...o, school: v, top: v && o.top === 'orange' ? 'polo' : o.top }));
  return (
    <div className="tabbody">
      <Segmented
        label={t('outfit.figure')}
        value={outfit.gender}
        onChange={(v) => set('gender', v)}
        options={[
          { value: 'boy', label: t('outfit.boy') },
          { value: 'girl', label: t('outfit.girl') },
        ]}
      />
      <Segmented
        label={t('outfit.finish')}
        value={outfit.finish}
        onChange={(v) => set('finish', v)}
        options={[
          { value: 'painted', label: t('outfit.painted') },
          { value: 'unpainted', label: t('outfit.unpainted') },
        ]}
      />
      <Switch
        label={t('outfit.invested')}
        checked={outfit.invested}
        onChange={(v) => set('invested', v)}
      />
      <Segmented
        label={t('outfit.top')}
        value={outfit.top}
        onChange={setTop}
        options={[
          { value: 'orange', label: t('outfit.orange') },
          { value: 'polo', label: t('outfit.polo') },
          { value: 'tee', label: t('outfit.tee') },
        ]}
      />
      {outfit.top !== 'orange' && (
        <Swatches label={t('outfit.topColour')} value={outfit.topColour} options={PLAIN} onChange={(v) => set('topColour', v)} />
      )}
      <Segmented
        label={t('outfit.sleeves')}
        value={outfit.sleeves}
        onChange={(v) => set('sleeves', v)}
        options={[
          { value: 'short', label: t('outfit.short') },
          { value: 'long', label: t('outfit.long') },
        ]}
      />
      <Switch
        label={t('outfit.school')}
        checked={outfit.school}
        onChange={setSchool}
      />
      {outfit.school && (
        <Segmented
          label={t('outfit.schoolLayout')}
          value={outfit.schoolLayout}
          onChange={(v) => set('schoolLayout', v)}
          options={[
            { value: 'uh', label: t('outfit.schoolUHShort') },
            { value: 'gsg', label: t('outfit.schoolGSGShort') },
          ]}
        />
      )}
      <Segmented
        label={t('outfit.legs')}
        value={outfit.legwear}
        onChange={(v) => set('legwear', v)}
        options={[
          { value: 'shorts', label: t('outfit.shorts') },
          { value: 'trousers', label: t('outfit.trousers') },
        ]}
      />
      <Swatches label={t('outfit.legColour')} value={outfit.legColour} options={PLAIN} onChange={(v) => set('legColour', v)} />
      <Segmented
        label={t('outfit.socks')}
        value={outfit.socks}
        onChange={(v) => set('socks', v)}
        options={[
          { value: 'short', label: t('outfit.shortSocks') },
          { value: 'long', label: t('outfit.longSocks') },
        ]}
      />
      <Segmented
        label={t('outfit.hat')}
        value={outfit.hat}
        onChange={(v) => set('hat', v)}
        options={[
          { value: 'none', label: t('outfit.noHat') },
          { value: 'bucket', label: t('outfit.bucket') },
          { value: 'cap', label: t('outfit.cap') },
        ]}
      />
      {outfit.hat !== 'none' && (
        <Swatches label={t('outfit.hatColour')} value={outfit.hatColour} options={PLAIN} onChange={(v) => set('hatColour', v)} />
      )}
      <Switch label={t('outfit.vest')} checked={outfit.vest} onChange={(v) => set('vest', v)} />
      {outfit.vest && <Swatches label={t('outfit.vestColour')} value={outfit.vestColour} options={PLAIN} onChange={(v) => set('vestColour', v)} />}
      {outfit.invested && (
        <>
          <NeckerColours outfit={outfit} setOutfit={setOutfit} />
          <Swatches label={t('outfit.woggle')} value={outfit.woggle} options={WOGGLE} onChange={(v) => set('woggle', v)} />
        </>
      )}
    </div>
  );
}

/** 幼童軍：制服固定（手冊 P.28–29），只揀人物、帽、旅巾顏色 */
function CubOutfitTab({ outfit, setOutfit }) {
  const { t } = useLang();
  const set = (k, v) => setOutfit((o) => ({ ...o, [k]: v }));
  return (
    <div className="tabbody">
      <Segmented
        label={t('outfit.figure')}
        value={outfit.gender}
        onChange={(v) => set('gender', v)}
        options={[
          { value: 'boy', label: t('outfit.boy') },
          { value: 'girl', label: t('outfit.girl') },
        ]}
      />
      <Segmented
        label={t('outfit.finish')}
        value={outfit.finish}
        onChange={(v) => set('finish', v)}
        options={[
          { value: 'painted', label: t('outfit.painted') },
          { value: 'unpainted', label: t('outfit.unpainted') },
        ]}
      />
      <Switch
        label={t('outfit.invested')}
        checked={outfit.invested}
        onChange={(v) => set('invested', v)}
      />
      <Switch
        label={t(outfit.gender === 'girl' ? 'outfit.cubHatGirl' : 'outfit.cubHatBoy')}
        checked={outfit.hat}
        disabled={!outfit.invested}
        onChange={(v) => set('hat', v)}
      />
      <Switch label={t('outfit.sweater')} checked={!!outfit.sweater} onChange={(v) => set('sweater', v)} />
      {outfit.invested && (
        <>
          <NeckerColours outfit={outfit} setOutfit={setOutfit} />
          <Swatches label={t('outfit.woggle')} value={outfit.woggle} options={WOGGLE} onChange={(v) => set('woggle', v)} />
        </>
      )}
    </div>
  );
}

/** 童軍：揀款式（童軍／海童軍／空童軍，手冊 P.30–35），制服跟款式固定；只揀人物、帽、旅巾顏色；巾圈固定係皮巾圈 */
const HAT_KEY = {
  scout: { land: 'scoutHat', sea: 'seaHat', air: 'airHat' },
  venture: { land: 'ventureHat', sea: 'ventureSeaHat', air: 'ventureAirHat' },
  rover: { land: 'roverHat', sea: 'roverSeaHat', air: 'roverAirHat' },
};
/** 童軍同深資童軍共用（深資童軍：手冊 P.36–41；女團員可揀半截裙／長褲，綱要 P.15） */
function ScoutOutfitTab({ section = 'scout', outfit, setOutfit }) {
  const { lang, t } = useLang();
  const set = (k, v) => setOutfit((o) => ({ ...o, [k]: v }));
  const R = SECTIONS[section];
  const variants = R.variants ?? [];
  const v = variantOf(R, outfit.variant)?.id ?? 'land';
  const venture = SENIOR.has(section);
  const hatKey = HAT_KEY[section][v];
  const tie = venture && outfit.neckwear === 'tie';
  return (
    <div className="tabbody">
      <Segmented
        label={t('outfit.scoutVariant')}
        value={v}
        onChange={(x) => set('variant', x)}
        options={variants.map((x) => ({ value: x.id, label: pick(lang, x, 'name') }))}
      />
      <Segmented
        label={t('outfit.figure')}
        value={outfit.gender}
        onChange={(v) => set('gender', v)}
        options={[
          { value: 'boy', label: t('outfit.boy') },
          { value: 'girl', label: t('outfit.girl') },
        ]}
      />
      <Segmented
        label={t('outfit.finish')}
        value={outfit.finish}
        onChange={(v) => set('finish', v)}
        options={[
          { value: 'painted', label: t('outfit.painted') },
          { value: 'unpainted', label: t('outfit.unpainted') },
        ]}
      />
      <Switch
        label={t('outfit.invested')}
        checked={outfit.invested}
        onChange={(v) => set('invested', v)}
      />
      <Switch label={t(`outfit.${hatKey}`)} checked={outfit.hat} disabled={!outfit.invested} onChange={(x) => set('hat', x)} />
      <Switch
        label={t('outfit.sweater')}
        checked={!!outfit.sweater}
        onChange={(x) => set('sweater', x)}
      />
      {venture && outfit.gender === 'girl' && (
        <>
          <Segmented
            label={t('outfit.ventureLegwear')}
            value={outfit.ventureLegwear === 'trousers' ? 'trousers' : 'skirt'}
            onChange={(x) => set('ventureLegwear', x)}
            options={[
              { value: 'skirt', label: t('outfit.skirt') },
              { value: 'trousers', label: t('outfit.trousers') },
            ]}
          />
        </>
      )}
      {outfit.invested && venture && (
        <>
          <Segmented
            label={t('outfit.neckwear')}
            value={tie ? 'tie' : 'necker'}
            onChange={(x) => set('neckwear', x)}
            options={[
              { value: 'necker', label: t('outfit.neckwearNecker') },
              { value: 'tie', label: t('outfit.neckwearTie') },
            ]}
          />
        </>
      )}
      {outfit.invested && !tie && (
        <>
          <NeckerColours outfit={outfit} setOutfit={setOutfit} />
        </>
      )}
    </div>
  );
}

/* ---------- 成年成員服裝分頁 ---------- */
/** 成年成員（手冊 P.52–81、P.97–117）：款式、人物、制服編號、帽、領巾／巾圈／木章 */
function LeaderOutfitTab({ outfit, setOutfit, picks }) {
  const { lang, t } = useLang();
  const set = (k, v) => setOutfit((o) => ({ ...o, [k]: v }));
  const R = SECTIONS.leader;
  const picked = variantOf(R, outfit.variant)?.id ?? 'land';
  const girl = outfit.gender === 'girl';
  const uid = leaderUniform(outfit.gender, outfit.uniform);
  const dress = isDress(uid); // 禮服／晚禮服：童軍只有一款，海／空童軍領袖都一樣（手冊 P.57–62，用戶確認）
  const evening = uid === 'u2';
  const v = dress ? 'land' : picked;
  const skirt = girl && (uid === 'u1' || uid === 'u3' || uid === 'u4');
  const tie = uid === 'u4' || uid === 'u1';
  const LN = leaderNeckwear(R, { ...outfit, uniform: uid }, picks);
  const instructor = picks.rank === 'instructor';
  const hardHatOk = v === 'land' && skirt && !instructor; // 硬帽：女、陸上、編號 1／3／4、唔係教練員（手冊 P.58、P.100）
  const hatKey = evening ? 'leaderMessHat' : v === 'sea' ? 'leaderSeaHat' : v === 'air' ? 'leaderAirHat' : hardHatOk && outfit.hatStyle !== 'beret' ? 'leaderHardHat' : 'leaderHat';
  return (
    <div className="tabbody">
      <Segmented
        label={t('outfit.scoutVariant')}
        value={v}
        onChange={(x) => set('variant', x)}
        options={R.variants.map((x) => ({ value: x.id, label: pick(lang, x, 'name') }))}
      />
      <Segmented
        label={t('outfit.figure')}
        value={outfit.gender}
        onChange={(x) => set('gender', x)}
        options={[
          { value: 'boy', label: t('outfit.man') },
          { value: 'girl', label: t('outfit.woman') },
        ]}
      />
      <Segmented
        label={t('outfit.finish')}
        value={outfit.finish}
        onChange={(x) => set('finish', x)}
        options={[
          { value: 'painted', label: t('outfit.painted') },
          { value: 'unpainted', label: t('outfit.unpainted') },
        ]}
      />
      <Segmented
        label={t('outfit.uniformNo')}
        value={uid}
        onChange={(x) => set('uniform', x)}
        options={R.uniforms.filter((x) => x.genders.includes(girl ? 'girl' : 'boy')).map((x) => ({ value: x.id, label: pick(lang, x, 'name') }))}
      />
      {evening && (
        <Segmented
          label={t('outfit.season')}
          value={outfit.season === 'summer' ? 'summer' : 'winter'}
          onChange={(x) => set('season', x)}
          options={[
            { value: 'summer', label: t('outfit.summer') },
            { value: 'winter', label: t('outfit.winter') },
          ]}
        />
      )}
      <Switch
        label={t(`outfit.${hatKey}`)}
        checked={outfit.hat}
        onChange={(x) => set('hat', x)}
      />
      {hardHatOk && (
        <Segmented
          label={t('outfit.leaderHatStyle')}
          value={outfit.hatStyle === 'beret' ? 'beret' : 'hardHat'}
          onChange={(x) => set('hatStyle', x)}
          options={[
            { value: 'hardHat', label: t('outfit.hardHat') },
            { value: 'beret', label: t('outfit.beret') },
          ]}
        />
      )}
      {v === 'land' && !dress && (!hardHatOk || outfit.hatStyle === 'beret') && (
        <Switch label={t('outfit.ventureLeader')} checked={!!outfit.ventureLeader} onChange={(x) => set('ventureLeader', x)} />
      )}
      {!dress && <Switch label={t('outfit.sweater')} checked={!!outfit.sweater} onChange={(x) => set('sweater', x)} />}
      <Segmented
        label={t('outfit.training')}
        value={LN.training}
        onChange={(x) => set('training', x)}
        options={[
          { value: 'none', label: t('outfit.trainingNone') },
          { value: 'basic', label: t('outfit.trainingBasic') },
          { value: 'woodBadge', label: t('outfit.trainingWood') },
        ]}
      />
      {!evening && !tie && (
        <>
          <Segmented
            label={t('outfit.leaderNecker')}
            value={LN.necker}
            onChange={(x) => set('leaderNecker', x)}
            options={[
              { value: 'unit', label: t('outfit.neckerUnit') },
              { value: 'association', label: t('outfit.neckerAssoc'), disabled: !LN.allowed.association },
              { value: 'gilwell', label: t('outfit.neckerGilwell'), disabled: !LN.allowed.gilwell },
            ]}
          />
          {LN.necker === 'unit' && (
            <>
              <NeckerColours outfit={outfit} setOutfit={setOutfit} />
            </>
          )}
          <Segmented
            label={t('outfit.leaderWoggle')}
            value={LN.gilwellWoggle ? 'gilwell' : 'scout'}
            onChange={(x) => set('leaderWoggle', x)}
            options={[
              { value: 'scout', label: t('outfit.woggleScout'), disabled: LN.necker === 'gilwell' },
              { value: 'gilwell', label: t('outfit.woggleGilwell'), disabled: !LN.allowed.gilwellWoggle },
            ]}
          />
        </>
      )}
      <Switch
        label={t('outfit.woodBadge')}
        checked={LN.woodBadge}
        disabled={!LN.allowed.woodBadge || LN.necker === 'gilwell'}
        onChange={(x) => set('woodBadge', x)}
      />
    </div>
  );
}

/* ---------- 來源分頁：只列文件（用戶指示：制服手冊、小童軍活動指引、各支部訓練綱要） ---------- */
const DOCUMENTS = [
  ['UH', 'cub'],
  ['GSG', 'grasshopper'],
  ['CTS', 'cub'],
  ['STS', 'scout'],
  ['VTS', 'venture'],
  ['RTS', 'rover'],
].map(([k, sec]) => ({ k, ...SECTIONS[sec].sources[k] }));

function SourcesTab() {
  const { lang, t } = useLang();
  return (
    <div className="tabbody">
      <h3 className="h3">{t('src.title')}</h3>
      <ul className="plainlist">
        {DOCUMENTS.map((d) => (
          <li key={d.k}>
            <strong>{bi(lang, d.zh, d.en)}</strong>
            <span className="muted">{lang === 'en' ? d.edition.en.split(';')[0] : d.edition.zh.split('；')[0]}</span>
            {d.url && (
              <a href={d.url} target="_blank" rel="noopener noreferrer">
                {t('src.open')}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="muted">{t('src.handbookCopy')}</p>
    </div>
  );
}

/* ---------- 規定分頁：服裝、徽章嘅規定以列點顯示（src/rulesGuide.js + 規則資料） ---------- */
function RulesTab({ section, rules: RULES, variant }) {
  const { lang, t } = useLang();
  const variants = RULES.variants ?? [];
  const current = variantOf(RULES, variant)?.id ?? 'land';
  const [v, setV] = useState(current);
  useEffect(() => setV(current), [section, current]);
  const V = variantOf(RULES, v);
  const garments = garmentsFor(RULES, V?.id);
  const colon = lang === 'en' ? ': ' : '：';
  const named = (x) => (
    <li key={x.id}>
      <strong>{pick(lang, x, 'name')}</strong>
      {colon}
      {pick(lang, x, 'note')}
    </li>
  );
  const items = (item) => {
    if (typeof item === 'string') return <li key={item}>{t(item)}</li>;
    const list = item.json === 'levels' ? RULES.levels ?? [] : item.json === 'uniforms' ? RULES.uniforms ?? [] : [];
    return list.filter((x) => pick(lang, x, 'note')).map(named);
  };
  return (
    <div className="tabbody rules">
      <p className="rules__lead">{t('rules.lead').replace('{section}', bi(lang, RULES.section.zh, RULES.section.en))}</p>
      {variants.length > 1 && (
        <Segmented label={t('rules.variant')} value={v} onChange={setV} options={variants.map((x) => ({ value: x.id, label: pick(lang, x, 'name') }))} />
      )}
      {guideFor(section, v).map((g) => (
        <section key={g.title} className="rules__group">
          <h3 className="h3">{t(g.title)}</h3>
          <ul className="rules__list">{g.items.map(items)}</ul>
        </section>
      ))}
      <section className="rules__group">
        <h3 className="h3">{t('rules.g.garments')}</h3>
        <ul className="rules__list">
          {V && pick(lang, V, 'note') && named(V)}
          {garments.map((g) => (
            <li key={g.id}>
              <strong>{pick(lang, g, 'name')}</strong>
              {colon}
              {pick(lang, g, 'rule')}
              <Sources rules={RULES} list={g.sources} />
            </li>
          ))}
        </ul>
      </section>
      <section className="rules__group">
        <h3 className="h3">{t('src.uninvested')}</h3>
        <ul className="rules__list">
          <li>{bi(lang, RULES.uninvested.zh, RULES.uninvested.en)}</li>
        </ul>
      </section>
      <section className="rules__group">
        <h3 className="h3">{t('src.notAllowed')}</h3>
        <ul className="rules__list">
          {RULES.notAllowed.map((n) => (
            <li key={n.id}>
              {bi(lang, n.zh, n.en)}
              <Sources rules={RULES} list={n.sources} />
            </li>
          ))}
        </ul>
      </section>
      {RULES.conflicts.length > 0 && (
        <section className="rules__group">
          <h3 className="h3">{t('src.conflicts')}</h3>
          <ul className="rules__list">
            {RULES.conflicts.map((c) => (
              <li key={c.id}>{bi(lang, c.zh, c.en)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------- 主程式 ---------- */
export default function App() {
  const { lang, t } = useLang();
  const [section, setSection] = useState('grasshopper');
  const [outfits, setOutfits] = useState(DEFAULT_OUTFITS);
  const [badgeStates, setBadgeStates] = useState(DEFAULT_BADGE_STATES);
  const [picks, setPicks] = useState(DEFAULT_PICKS);
  const [selected, setSelected] = useState(null);
  const RULES = SECTIONS[section];
  // 成年成員一律已宣誓（冇未宣誓狀態）
  const outfit = section === 'leader' ? { ...outfits[section], invested: true } : outfits[section];
  // 童軍支部嘅款式（海童軍／空童軍）用自己嘅副標題、截圖說明同檔名
  // 成年成員禮服／晚禮服只有一款，海／空童軍領袖都一樣（手冊 P.57–62，用戶確認）
  const dressOn = section === 'leader' && isDress(leaderUniform(outfit.gender, outfit.uniform));
  const variantTag = (section === 'scout' || SENIOR.has(section) || section === 'leader') && !dressOn && outfit.variant && outfit.variant !== 'land' ? `${section}_${outfit.variant}` : section;
  const badges = badgeStates[section];
  // 圖案要知嘅外觀設定：晚禮服季節（金屬職級肩章白／黑）、人物（女裝硬帽編號 M 改 F）
  const artPicks = useMemo(() => (section === 'leader' ? { ...picks, season: outfit.season, gender: outfit.gender } : { ...picks, level: null }), [section, picks, outfit.season, outfit.gender]);
  // 人物、外觀、宣誓各支部共用
  const setOutfit = useCallback(
    (fn) =>
      setOutfits((all) => {
        const next = typeof fn === 'function' ? fn(all[section]) : fn;
        const shared = Object.fromEntries(SHARED_OUTFIT_KEYS.map((k) => [k, next[k]]));
        return Object.fromEntries(SECTION_IDS.map((id) => [id, id === section ? next : { ...all[id], ...shared }]));
      }),
    [section],
  );
  const setBadges = useCallback(
    (fn) => setBadgeStates((all) => ({ ...all, [section]: typeof fn === 'function' ? fn(all[section]) : fn })),
    [section],
  );
  const unavailable = useMemo(
    () => RULES.badges.filter((b) => b.dynamic && !resolveArt(b, artPicks, DISTRICTS, PATROLS)).map((b) => b.id),
    [RULES, artPicks],
  );
  const switchSection = (id) => {
    setSelected(null);
    setSection(id);
  };
  const [tab, setTab] = useState('badges');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const webgl = useMemo(hasWebGL, []);
  const scene = useRef();
  const heightBar = useRef();
  const onHeight = useCallback((y) => heightBar.current?.set(y), []);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const onPick = useCallback((id) => {
    setSelected(id);
    if (id) requestAnimationFrame(() => scene.current?.focus(id));
  }, []);
  const onSceneSelect = useCallback((id) => setSelected(id), []);

  const shot = async () => {
    const canvas = scene.current?.canvas();
    if (!canvas) return;
    setBusy(true);
    try {
      const { captureScreenshot, downloadBlob, stamp } = await import('./lib/screenshot.js');
      const blob = await captureScreenshot(canvas, t(`shot.caption.${variantTag}`));
      downloadBlob(blob, `scout3d_${variantTag}_${APP_VERSION}_${stamp()}.png`);
      setToast(t('shot.done'));
    } catch {
      setToast(t('shot.fail'));
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    ['outfit', t('tab.outfit')],
    ['badges', t('tab.badges')],
    ['rules', t('tab.rules')],
    ['sources', t('tab.sources')],
  ];

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img src="/icons/favicon-32.png" width="28" height="28" alt="" className="brand__icon" />
          <div>
            <h1 className="brand__title">{t('app.title')}</h1>
          </div>
        </div>
        <div className="sectionswitch seg" role="radiogroup" aria-label={t('section.label')}>
          {SECTION_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={section === id}
              className={`seg__btn${section === id ? ' is-on' : ''}`}
              onClick={() => switchSection(id)}
            >
              {bi(lang, SECTIONS[id].section.zh, SECTIONS[id].section.en)}
            </button>
          ))}
        </div>
        <LangToggle />
      </header>

      {RULE_ERRORS.length > 0 && (
        <div className="banner banner--error" role="alert">
          {RULE_ERRORS.join('；')}
        </div>
      )}

      <main className="main">
        <section className="stage" aria-label={t('app.title')}>
          {webgl ? (
            <Suspense fallback={<div className="stage__msg">{t('loading')}</div>}>
              <Scene ref={scene} section={section} outfit={outfit} badges={badges} picks={artPicks} selected={selected} onSelect={onSceneSelect} onHeight={onHeight} />
            </Suspense>
          ) : (
            <div className="stage__msg">{t('nowebgl')}</div>
          )}
          <p className="hint">{t('hint.drag')}</p>
          {webgl && <HeightBar ref={heightBar} scene={scene} />}
          {webgl && exportOpen && <ExportPanel scene={scene} variantTag={variantTag} onClose={() => setExportOpen(false)} toast={setToast} />}
          {webgl && (
            <div className="views" role="toolbar" aria-label={t('view.group')}>
              {['front', 'back', 'left', 'right'].map((v) => (
                <button key={v} type="button" className="chipbtn" onClick={() => scene.current?.view(v)}>
                  {t(`view.${v}`)}
                </button>
              ))}
              <button
                type="button"
                className="chipbtn"
                onClick={() => scene.current?.view('front')}
              >
                {t('view.reset')}
              </button>
              <button type="button" className="chipbtn chipbtn--accent" onClick={shot} disabled={busy}>
                {t('view.shot')}
              </button>
              <button type="button" className="chipbtn" aria-expanded={exportOpen} onClick={() => setExportOpen((x) => !x)}>
                {t('export.open')}
              </button>
            </div>
          )}
        </section>

        <aside className="panel">
          {selected && (
            <InfoCard
              key={`${section}-${selected}`}
              rules={RULES}
              id={selected}
              outfit={outfit}
              badges={badges}
              picks={artPicks}
              unavailable={unavailable}
              onClose={() => setSelected(null)}
              onFocus={() => scene.current?.focus(selected)}
            />
          )}
          <div className="tabs" role="tablist">
            {tabs.map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                id={`tab-${k}`}
                aria-selected={tab === k}
                aria-controls={`pane-${k}`}
                className={`tabs__btn${tab === k ? ' is-on' : ''}`}
                onClick={() => setTab(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`pane-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'badges' && (
              <BadgesTab
                rules={RULES}
                section={section}
                outfit={outfit}
                badges={badges}
                setBadges={setBadges}
                picks={artPicks}
                setPicks={setPicks}
                unavailable={unavailable}
                selected={selected}
                onPick={onPick}
              />
            )}
            {tab === 'outfit' &&
              (section === 'cub' ? (
                <CubOutfitTab outfit={outfit} setOutfit={setOutfit} />
              ) : section === 'leader' ? (
                <LeaderOutfitTab outfit={outfit} setOutfit={setOutfit} picks={picks} />
              ) : section === 'scout' || SENIOR.has(section) ? (
                <ScoutOutfitTab key={section} section={section} outfit={outfit} setOutfit={setOutfit} />
              ) : (
                <OutfitTab outfit={outfit} setOutfit={setOutfit} />
              ))}
            {tab === 'rules' && <RulesTab section={section} rules={RULES} variant={outfit.variant} />}
            {tab === 'sources' && <SourcesTab />}
          </div>
        </aside>
      </main>

      <footer className="foot">
        <p className="foot__disc">
          {t('disclaimer')} {t('unofficial')}
        </p>
        <p className="foot__meta">
          {t('rules.version')} {RULES.fileVersion}
          {lang === 'en' ? ' · ' : '・'}
          {t('rules.checked')}
          {lang === 'en' ? ': ' : '：'}
          {RULES.review.lastChecked ?? t('rules.notChecked')}
          {lang === 'en' ? ' · ' : '・'}
          {t('lr.note')}
        </p>
        <p className="foot__copy">{t('footer.copy')}</p>
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
