// SCOUT3D 主介面 — v1.0 · © SCOUT SYSTEM
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLang, LangToggle, bi, pick } from './i18n.jsx';
import { RULES, RULE_ERRORS, badgeById, sourceLines } from './data/rules.js';
import { NECKER, WOGGLE, PLAIN } from './palette.js';
import { shownReason } from './three/badgeLayout.js';
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

function Sources({ list }) {
  const { lang, t } = useLang();
  return (
    <ul className="srclist">
      {sourceLines(lang, list).map((s) => (
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
function ArtLine({ art }) {
  const { lang, t } = useLang();
  const src = RULES.sources[art.ref];
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

/* ---------- 徽章資料卡 ---------- */
function InfoCard({ id, outfit, badges, onClose, onFocus }) {
  const { lang, t } = useLang();
  const b = badgeById(id);
  const arts = Array.isArray(b.art) ? b.art : [b.art];
  const reason = shownReason(RULES, outfit, badges, id);
  const shown = reason === null;
  const st = RULES.schoolTop;
  const onNecker = outfit.school && ['membership', 'progress', 'grasshopperAward'].includes(id);
  const sizeText = `${b.size.wCm} × ${b.size.hCm} cm（${t(b.size.measured ? 'info.sizeMeasured' : 'info.sizeGuess')}）`;
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
        {arts.map((a) => (
          <img key={a.file} src={a.file} alt={pick(lang, b, 'name')} className={b.size.shape === 'circle' ? 'is-round' : ''} />
        ))}
      </div>
      <ArtLine art={arts[0]} />
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
          <Sources list={b.sources} />
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
function BadgesTab({ outfit, badges, setBadges, selected, onPick }) {
  const { lang, t } = useLang();
  const set = (k, v) => setBadges((b) => ({ ...b, [k]: v }));
  return (
    <div className="tabbody">
      <p className="note note--strong">{t('badges.tip')}</p>
      {outfit.school && (
        <p className="note note--warn">
          {t('badges.schoolOn')}
          {t(outfit.schoolLayout === 'gsg' ? 'outfit.schoolGSG' : 'outfit.schoolUH')}
        </p>
      )}
      <ul className="badgelist">
        {RULES.badges.map((b) => {
          const disabled = b.id === 'membership' && !outfit.invested;
          const why = shownReason(RULES, outfit, badges, b.id);
          const whyNote = ['school', 'vest', 'schoolUninvested'].includes(why) ? t(`badge.why.${why}`) : null;
          const art = Array.isArray(b.art) ? b.art[Math.max(0, Math.min(3, (badges.progress || 1) - 1))] : b.art;
          return (
            <li key={b.id} className={`badgerow${selected === b.id ? ' is-sel' : ''}${disabled ? ' is-disabled' : ''}`}>
              <div className="badgerow__main">
                <img src={art.file} alt="" className={`badgerow__art${b.size.shape === 'circle' ? ' is-round' : ''}`} />
                <div>
                  <button type="button" className="badgerow__name" onClick={() => onPick(b.id)}>
                    {pick(lang, b, 'name')}
                  </button>
                  <div className="badgerow__meta">
                    <StatusChip status={b.status} />
                    <span className="chip chip--plain">{t(b.required ? 'info.required' : 'info.optional')}</span>
                    {art.example && <span className="chip chip--plain">{t('badge.example')}</span>}
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
              {disabled && <p className="note">{t('badge.needInvest')}</p>}
              {!disabled && whyNote && <p className="note">{whyNote}</p>}
            </li>
          );
        })}
      </ul>
      <p className="note">{bi(lang, RULES.artCredit.zh, RULES.artCredit.en)}</p>
    </div>
  );
}

/* ---------- 服裝分頁 ---------- */
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
            label={`${t('outfit.necker')}・${t('outfit.neckerMain')}`}
            value={outfit.neckerMain}
            options={NECKER}
            onChange={(v) => set('neckerMain', v)}
          />
          <Swatches
            label={`${t('outfit.necker')}・${t('outfit.neckerBorder')}`}
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

/* ---------- 來源分頁 ---------- */
function SourcesTab() {
  const { lang, t } = useLang();
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
      <dl className="facts facts--tight">
        <dt>{t('rules.version')}</dt>
        <dd>{RULES.fileVersion}</dd>
        <dt>{t('rules.compiled')}</dt>
        <dd>{rv.compiledOn}</dd>
        <dt>{t('rules.checked')}</dt>
        <dd>{rv.lastChecked ?? t('rules.notChecked')}</dd>
      </dl>
      <p className="note note--warn">{bi(lang, rv.note.zh, rv.note.en)}</p>

      <h3 className="h3">{t('src.rules')}</h3>
      <ul className="plainlist">
        {RULES.garments.map((g) => (
          <li key={g.id}>
            <strong>{pick(lang, g, 'name')}</strong>
            <span>{pick(lang, g, 'rule')}</span>
            {g.modelNote && <span className="muted">{bi(lang, g.modelNote.zh, g.modelNote.en)}</span>}
            <Sources list={g.sources} />
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
            <Sources list={n.sources} />
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
  const [outfit, setOutfit] = useState(DEFAULT_OUTFIT);
  const [badges, setBadges] = useState(DEFAULT_BADGES);
  const [selected, setSelected] = useState(null);
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
      const blob = await captureScreenshot(canvas, t('shot.caption'));
      downloadBlob(blob, `scout3d_grasshopper_${APP_VERSION}_${stamp()}.png`);
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
            <p className="brand__sub">{t('app.sub')}</p>
          </div>
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
              <Scene ref={scene} outfit={outfit} badges={badges} selected={selected} onSelect={onSceneSelect} />
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
              id={selected}
              outfit={outfit}
              badges={badges}
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
            {tab === 'badges' && <BadgesTab outfit={outfit} badges={badges} setBadges={setBadges} selected={selected} onPick={onPick} />}
            {tab === 'outfit' && <OutfitTab outfit={outfit} setOutfit={setOutfit} />}
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
