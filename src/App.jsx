// SCOUT3D 主介面 — v1.0 · © SCOUT SYSTEM
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useLang, LangToggle, bi, pick } from './i18n.jsx';
import { RULES, RULE_ERRORS, sourceLines } from './data/rules.js';
import { NECKER, WOGGLE } from './palette.js';
import { APP_VERSION } from './version.js';

const Scene = lazy(() => import('./three/Scene.jsx'));

// 第 1 步：人物 + 最基本小童軍服裝（徽章第 3 步先加）
const DEFAULT_OUTFIT = {
  gender: 'boy',
  finish: 'painted',
  invested: true,
  neckerMain: '#e9b425',
  neckerBorder: '#5b3fa0',
  woggle: '#1f4e9c',
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

/* ---------- 徽章分頁（第 3 步先做） ---------- */
function BadgesTab() {
  const { lang, t } = useLang();
  return (
    <div className="tabbody">
      <p className="note note--strong">{t('badges.later')}</p>
      <ul className="plainlist">
        {RULES.badges.map((b) => (
          <li key={b.id}>
            <strong>{pick(lang, b, 'name')}</strong>
            <span className="muted">{pick(lang, b, 'place')}</span>
            <StatusChip status={b.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- 服裝分頁 ---------- */
function OutfitTab({ outfit, setOutfit }) {
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
      <div className="field">
        <span className="field__label">{t('outfit.wearing')}</span>
        <p className="note">{t('outfit.wearingDesc')}</p>
      </div>
      <Switch
        label={t('outfit.invested')}
        checked={outfit.invested}
        onChange={(v) => set('invested', v)}
        note={outfit.invested ? null : t('outfit.investedNote')}
      />
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
  const [tab, setTab] = useState('outfit');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const webgl = useMemo(hasWebGL, []);
  const scene = useRef();

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(id);
  }, [toast]);

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
              <Scene ref={scene} outfit={outfit} />
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
            {tab === 'badges' && <BadgesTab />}
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
