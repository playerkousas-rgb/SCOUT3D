// SCOUT3D 主介面 — v1.0 · © SCOUT SYSTEM
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLang, LangToggle, bi, pick } from './i18n.jsx';
import { SECTIONS, SECTION_IDS, DISTRICTS, PATROLS, RULE_ERRORS, badgeById, sourceLines } from './data/rules.js';
import { garmentsFor, variantOf } from './data/validate.js';
import { NECKER, WOGGLE, PLAIN } from './palette.js';
import { shownReason } from './three/badgeLayout.js';
import { resolveArt, meritYearOk, findDistrict, findPatrol } from './lib/picks.js';
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
  neckerMain: '#2e7d4f',
  neckerBorder: '#2e7d4f',
  woggle: '#1f4e9c',
};

const DEFAULT_OUTFITS = { grasshopper: DEFAULT_OUTFIT, cub: CUB_OUTFIT, scout: SCOUT_OUTFIT };
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

// 用戶自選：所屬區（決定區章、地域章圖案）、優異旅團章年份、童軍小隊
const DEFAULT_PICKS = { districtId: '', meritYear: new Date().getFullYear(), patrolId: '' };

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
const DEFAULT_BADGE_STATES = { grasshopper: DEFAULT_BADGES, cub: CUB_BADGES, scout: SCOUT_BADGES };

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
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({ label, value, options, onChange }) {
  const { lang } = useLang();
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
      </div>
    </div>
  );
}

function Switch({ label, checked, onChange, disabled, note }) {
  return (
    <div className={`switchrow${disabled ? ' is-disabled' : ''}`}>
      <label className="switch">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch__track" aria-hidden="true" />
        <span className="switch__label">{label}</span>
      </label>
      {note && <p className="note">{note}</p>}
    </div>
  );
}

function StatusChip({ status }) {
  const { t } = useLang();
  return <span className={`chip chip--${status}`}>{t(`status.${status}`)}</span>;
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
      {t(art.example ? 'info.artExample' : 'info.artOfficial')}
      {lang === 'en' ? ': ' : '：'}
      {src ? bi(lang, src.zh, src.en) : art.ref}
      {lang === 'en' ? ', ' : '，'}
      {t('info.page')} {art.page}
    </span>
  );
}

/* ---------- 自選圖案（區章、地域章、優異旅團章） ---------- */
/** 某個章而家嘅圖案（resolveArt 結果）；優異旅團章要即場畫年份，所以有 src 狀態 */
function useArtSrc(art) {
  const [src, setSrc] = useState(art?.kind === 'image' ? art.file : null);
  const key = art ? (art.kind === 'merit' ? `m-${art.colour}-${art.year}` : art.file) : '';
  useEffect(() => {
    let alive = true;
    if (!art) setSrc(null);
    else if (art.kind === 'image') setSrc(art.file);
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
  const reason = shownReason(rules, outfit, badges, id, { unavailable });
  const shown = reason === null;
  const st = rules.schoolTop;
  const onNecker = st && outfit.school && ['membership', 'progress', 'grasshopperAward'].includes(id);
  const sizeText = `${b.size.wCm} × ${b.size.hCm} cm（${t(b.size.measured ? 'info.sizeMeasured' : 'info.sizeGuess')}）`;
  const picked = now?.district;
  return (
    <section className="card" aria-live="polite">
      <header className="card__head">
        <h2 className="card__title">{pick(lang, b, 'name')}</h2>
        <button type="button" className="iconbtn" onClick={onClose} aria-label={t('info.close')} title={t('info.close')}>
          ×
        </button>
      </header>
      <div className="card__chips">
        <StatusChip status={b.status} />
        <span className="chip chip--plain">{t(b.required ? 'info.required' : 'info.optional')}</span>
      </div>
      <div className="card__art">
        {b.dynamic ? (
          <ArtImg art={now} alt={pick(lang, b, 'name')} className="" />
        ) : (
          arts.map((a) => <img key={a.file} src={a.file} alt={pick(lang, b, 'name')} className={b.size.shape === 'circle' ? 'is-round' : ''} />)
        )}
      </div>
      {b.dynamic === 'patrol' && now?.patrol ? (
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
        {b.pendingReason && (
          <>
            <dt>{t('info.why')}</dt>
            <dd className="why">{bi(lang, b.pendingReason.zh, b.pendingReason.en)}</dd>
          </>
        )}
      </dl>
      <button type="button" className="btn btn--ghost" onClick={onFocus} disabled={!shown}>
        {t('info.focus')}
      </button>
    </section>
  );
}

/* ---------- 徽章分頁 ---------- */
function BadgeRowArt({ b, badges, picks }) {
  const art = b.dynamic
    ? resolveArt(b, picks, DISTRICTS, PATROLS)
    : { kind: 'image', file: (Array.isArray(b.art) ? b.art[Math.max(0, Math.min(3, (badges.progress || 1) - 1))] : b.art).file };
  return <ArtImg art={art} alt="" className={`badgerow__art${b.size.shape === 'circle' ? ' is-round' : ''}`} />;
}

function BadgesTab({ rules, section, outfit, badges, setBadges, picks, setPicks, unavailable, selected, onPick }) {
  const { lang, t } = useLang();
  const set = (k, v) => setBadges((b) => ({ ...b, [k]: v }));
  return (
    <div className="tabbody">
      <p className="note note--strong">{t({ cub: 'badges.tipCub', scout: 'badges.tipScout' }[section] ?? 'badges.tip')}</p>
      {outfit.school && (
        <p className="note note--warn">
          {t('badges.schoolOn')}
          {t(outfit.schoolLayout === 'gsg' ? 'outfit.schoolGSG' : 'outfit.schoolUH')}
        </p>
      )}
      <ul className="badgelist">
        {rules.badges.map((b) => {
          const disabled = b.needsInvestiture && !outfit.invested;
          const why = shownReason(rules, outfit, badges, b.id, { unavailable });
          const whyNote = ['school', 'vest', 'schoolUninvested', 'noArt'].includes(why) ? t(`badge.why.${why}`) : null;
          const example = b.dynamic ? resolveArt(b, picks, DISTRICTS, PATROLS)?.example : (Array.isArray(b.art) ? b.art[0] : b.art).example;
          return (
            <li key={b.id} className={`badgerow${selected === b.id ? ' is-sel' : ''}${disabled ? ' is-disabled' : ''}`}>
              <div className="badgerow__main">
                <BadgeRowArt b={b} badges={badges} picks={picks} />
                <div>
                  <button type="button" className="badgerow__name" onClick={() => onPick(b.id)}>
                    {pick(lang, b, 'name')}
                  </button>
                  <div className="badgerow__meta">
                    <StatusChip status={b.status} />
                    <span className="chip chip--plain">{t(b.required ? 'info.required' : 'info.optional')}</span>
                    {example && <span className="chip chip--plain">{t('badge.example')}</span>}
                  </div>
                </div>
              </div>
              {b.id === 'progress' ? (
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
              {b.dynamic === 'region' && <p className="note">{t('pick.regionAuto')}</p>}
              {b.dynamic === 'meritorious' && <YearPicker picks={picks} setPicks={setPicks} id={`pick-year-${section}`} />}
              {b.dynamic === 'patrol' && <PatrolPicker picks={picks} setPicks={setPicks} id={`pick-patrol-${section}`} />}
              {disabled && <p className="note">{t('badge.needInvest')}</p>}
              {!disabled && whyNote && <p className="note">{whyNote}</p>}
            </li>
          );
        })}
      </ul>
      <p className="note">{bi(lang, rules.artCredit.zh, rules.artCredit.en)}</p>
      <p className="note">{bi(lang, DISTRICTS.artCredit.zh, DISTRICTS.artCredit.en)}</p>
      {rules.badges.some((b) => b.dynamic === 'patrol') && <p className="note">{bi(lang, PATROLS.artCredit.zh, PATROLS.artCredit.en)}</p>}
    </div>
  );
}

/* ---------- 服裝分頁 ---------- */
/** 「旅巾・主色」／「Neckerchief: main colour」 */
function neckerLabel(t, key) {
  return t('outfit.neckerPart').replace('{a}', t('outfit.necker')).replace('{b}', t(key));
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
        note={outfit.invested ? null : t('outfit.investedNote')}
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
        note={outfit.school ? t('outfit.schoolNote') : null}
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
      {outfit.legwear === 'trousers' && <p className="note">{t('outfit.socksHidden')}</p>}
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
      <Switch label={t('outfit.vest')} checked={outfit.vest} onChange={(v) => set('vest', v)} note={outfit.vest ? t('outfit.vestNote') : null} />
      {outfit.vest && <Swatches label={t('outfit.vestColour')} value={outfit.vestColour} options={PLAIN} onChange={(v) => set('vestColour', v)} />}
      {outfit.invested && (
        <>
          <Swatches
            label={neckerLabel(t, 'outfit.neckerMain')}
            value={outfit.neckerMain}
            options={NECKER}
            onChange={(v) => set('neckerMain', v)}
          />
          <Swatches
            label={neckerLabel(t, 'outfit.neckerBorder')}
            value={outfit.neckerBorder}
            options={NECKER}
            onChange={(v) => set('neckerBorder', v)}
          />
          <Swatches label={t('outfit.woggle')} value={outfit.woggle} options={WOGGLE} onChange={(v) => set('woggle', v)} />
        </>
      )}
      <p className="note">{t('outfit.stepNote')}</p>
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
        note={outfit.invested ? null : t('outfit.investedNoteCub')}
      />
      <Switch
        label={t(outfit.gender === 'girl' ? 'outfit.cubHatGirl' : 'outfit.cubHatBoy')}
        checked={outfit.hat}
        disabled={!outfit.invested}
        onChange={(v) => set('hat', v)}
        note={t('outfit.cubHatNote')}
      />
      {outfit.invested && (
        <>
          <Swatches
            label={neckerLabel(t, 'outfit.neckerMain')}
            value={outfit.neckerMain}
            options={NECKER}
            onChange={(v) => set('neckerMain', v)}
          />
          <Swatches
            label={neckerLabel(t, 'outfit.neckerBorder')}
            value={outfit.neckerBorder}
            options={NECKER}
            onChange={(v) => set('neckerBorder', v)}
          />
          <Swatches label={t('outfit.woggle')} value={outfit.woggle} options={WOGGLE} onChange={(v) => set('woggle', v)} />
        </>
      )}
      <p className="note">{t(outfit.gender === 'girl' ? 'outfit.cubNoteGirl' : 'outfit.cubNoteBoy')}</p>
    </div>
  );
}

/** 童軍：揀款式（童軍／海童軍／空童軍，手冊 P.30–35），制服跟款式固定；只揀人物、帽、旅巾顏色；巾圈固定係皮巾圈 */
const SCOUT_HAT_KEY = { land: 'scoutHat', sea: 'seaHat', air: 'airHat' };
const SCOUT_NOTE_KEY = { land: 'scoutNote', sea: 'seaNote', air: 'airNote' };
function ScoutOutfitTab({ outfit, setOutfit }) {
  const { lang, t } = useLang();
  const set = (k, v) => setOutfit((o) => ({ ...o, [k]: v }));
  const variants = SECTIONS.scout.variants ?? [];
  const v = variantOf(SECTIONS.scout, outfit.variant)?.id ?? 'land';
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
        note={outfit.invested ? null : t('outfit.investedNoteScout')}
      />
      <Switch label={t(`outfit.${SCOUT_HAT_KEY[v]}`)} checked={outfit.hat} disabled={!outfit.invested} onChange={(x) => set('hat', x)} note={t(`outfit.${SCOUT_HAT_KEY[v]}Note`)} />
      {outfit.invested && (
        <>
          <Swatches label={neckerLabel(t, 'outfit.neckerMain')} value={outfit.neckerMain} options={NECKER} onChange={(v) => set('neckerMain', v)} />
          <Swatches label={neckerLabel(t, 'outfit.neckerBorder')} value={outfit.neckerBorder} options={NECKER} onChange={(v) => set('neckerBorder', v)} />
          <p className="note">{t('outfit.scoutWoggle')}</p>
        </>
      )}
      <p className="note">{t(`outfit.${SCOUT_NOTE_KEY[v]}${outfit.gender === 'girl' ? 'Girl' : 'Boy'}`)}</p>
      <p className="note">{t('outfit.scoutVariants')}</p>
    </div>
  );
}

/* ---------- 來源分頁 ---------- */
function SourcesTab({ rules: RULES, variant }) {
  const { lang, t } = useLang();
  const V = variantOf(RULES, variant);
  const garments = garmentsFor(RULES, V?.id);
  const rv = RULES.review;
  return (
    <div className="tabbody">
      <h3 className="h3">{t('src.title')}</h3>
      <ul className="plainlist">
        {Object.entries(RULES.sources).map(([k, s]) => (
          <li key={k}>
            <strong>{bi(lang, s.zh, s.en)}</strong>
            <span className="muted">{bi(lang, s.edition.zh, s.edition.en)}</span>
            {s.url && (
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {t('src.open')}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="note">{t('src.handbookCopy')}</p>
      <p className="note">{bi(lang, RULES.artCredit.zh, RULES.artCredit.en)}</p>
      <p className="note">
        {bi(lang, DISTRICTS.artCredit.zh, DISTRICTS.artCredit.en)}{' '}
        <a href={DISTRICTS.source.url} target="_blank" rel="noopener noreferrer">
          {t('src.open')}
        </a>
      </p>
      <dl className="facts facts--tight">
        <dt>{t('rules.version')}</dt>
        <dd>{RULES.fileVersion}</dd>
        <dt>{t('rules.compiled')}</dt>
        <dd>{rv.compiledOn}</dd>
        <dt>{t('rules.checked')}</dt>
        <dd>{rv.lastChecked ?? t('rules.notChecked')}</dd>
      </dl>
      <p className="note note--warn">{bi(lang, rv.note.zh, rv.note.en)}</p>

      <h3 className="h3">{t('src.rules').replace('{section}', V ? pick(lang, V, 'name') : bi(lang, RULES.section.zh, RULES.section.en))}</h3>
      {V && (
        <div className="note">
          {t('src.variant')}
          <strong>{pick(lang, V, 'name')}</strong> — {pick(lang, V, 'note')}
          <Sources rules={RULES} list={V.sources} />
        </div>
      )}
      <ul className="plainlist">
        {garments.map((g) => (
          <li key={g.id}>
            <strong>{pick(lang, g, 'name')}</strong>
            <span>{pick(lang, g, 'rule')}</span>
            {g.modelNote && <span className="muted">{bi(lang, g.modelNote.zh, g.modelNote.en)}</span>}
            <Sources rules={RULES} list={g.sources} />
          </li>
        ))}
      </ul>

      <h3 className="h3">{t('src.uninvested')}</h3>
      <p>{bi(lang, RULES.uninvested.zh, RULES.uninvested.en)}</p>

      <h3 className="h3">{t('src.notAllowed')}</h3>
      <ul className="plainlist">
        {RULES.notAllowed.map((n) => (
          <li key={n.id}>
            <span>{bi(lang, n.zh, n.en)}</span>
            <Sources rules={RULES} list={n.sources} />
          </li>
        ))}
      </ul>

      <h3 className="h3">{t('src.conflicts')}</h3>
      <ul className="plainlist">
        {RULES.conflicts.map((c) => (
          <li key={c.id}>{bi(lang, c.zh, c.en)}</li>
        ))}
      </ul>
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
  const outfit = outfits[section];
  // 童軍支部嘅款式（海童軍／空童軍）用自己嘅副標題、截圖說明同檔名
  const variantTag = section === 'scout' && outfit.variant && outfit.variant !== 'land' ? `${section}_${outfit.variant}` : section;
  const badges = badgeStates[section];
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
    () => RULES.badges.filter((b) => b.dynamic && !resolveArt(b, picks, DISTRICTS, PATROLS)).map((b) => b.id),
    [RULES, picks],
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
    ['sources', t('tab.sources')],
  ];

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img src="/icons/favicon-32.png" width="28" height="28" alt="" className="brand__icon" />
          <div>
            <h1 className="brand__title">{t('app.title')}</h1>
            <p className="brand__sub">{t(`app.sub.${variantTag}`)}</p>
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
              <Scene ref={scene} section={section} outfit={outfit} badges={badges} picks={picks} selected={selected} onSelect={onSceneSelect} />
            </Suspense>
          ) : (
            <div className="stage__msg">{t('nowebgl')}</div>
          )}
          <div className="pill" role="note">
            {t('pending.all')}
          </div>
          <p className="hint">{t('hint.drag')}</p>
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
              picks={picks}
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
                picks={picks}
                setPicks={setPicks}
                unavailable={unavailable}
                selected={selected}
                onPick={onPick}
              />
            )}
            {tab === 'outfit' &&
              (section === 'cub' ? (
                <CubOutfitTab outfit={outfit} setOutfit={setOutfit} />
              ) : section === 'scout' ? (
                <ScoutOutfitTab outfit={outfit} setOutfit={setOutfit} />
              ) : (
                <OutfitTab outfit={outfit} setOutfit={setOutfit} />
              ))}
            {tab === 'sources' && <SourcesTab rules={RULES} variant={outfit.variant} />}
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
