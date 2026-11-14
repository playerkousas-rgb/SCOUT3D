// SCOUT3D 雙語（docs/44）— v1.0 · © SCOUT SYSTEM
// 一次一種語言；預設中文；唔用 navigator.language；缺譯 fall back 中文。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const LANG_KEY = 'scout3d.lang';

const STRINGS = {
  zh: {
    'app.title': 'SCOUT3D 小童軍服裝預覽',
    'app.short': 'SCOUT3D',
    'app.sub': '香港童軍總會・小童軍',
    'lang.aria': '切換到英文',
    'lang.title': 'Switch to English',
    'tab.badges': '徽章',
    'tab.outfit': '服裝',
    'tab.sources': '來源',
    'view.front': '正面',
    'view.back': '背面',
    'view.left': '左側（穿著者）',
    'view.right': '右側（穿著者）',
    'view.reset': '重設',
    'view.shot': '截圖',
    'view.group': '視角',
    'hint.drag': '拖曳旋轉・滾輪或雙指縮放',
    'pending.all': '依手冊整理・待領袖核對',
    'status.documented': '依文件整理・待核對',
    'status.pending': '待確認',
    'status.verified': '已核對',
    'disclaimer': '實際穿著請以所屬童軍組織及單位最新指引為準。',
    'unofficial': '非官方工具；位置屬示意，徽章圖案為簡化示意圖，唔係官方圖樣。',
    'lr.note': '左／右一律以穿著者本人角度描述。',
    'rules.version': '規則資料版本',
    'rules.compiled': '整理日期',
    'rules.checked': '核對日期',
    'rules.notChecked': '未核對',
    'info.place': '佩戴位置',
    'info.quote': '原文',
    'info.conditions': '佩戴條件',
    'info.source': '來源',
    'info.page': '頁',
    'info.size': '尺寸',
    'info.sizeMeasured': '文件列明',
    'info.sizeGuess': '文件未列明，模型示意',
    'info.why': '點解待確認',
    'info.focus': '聚焦',
    'info.close': '關閉',
    'info.required': '必須',
    'info.optional': '非必須',
    'info.hidden': '而家冇顯示，開咗先睇到。',
    'badge.show': '顯示',
    'badge.steps': '已完成步數',
    'badge.none': '未有',
    'badge.notInSchool': '學校運動上衣模式只示範團員章同進步章。',
    'badge.needInvest': '要宣誓後先可以佩戴。',
    'badge.schoolPending': '第三版指引冇寫佢喺旅巾上嘅位置，所以呢個模式唔顯示。',
    'outfit.finish': '外觀',
    'outfit.painted': '上色',
    'outfit.unpainted': '未上色（灰模）',
    'outfit.wearing': '而家著緊',
    'outfit.wearingDesc': '橙色活動服（白領、白袖邊）、灰色運動褲、白波鞋。',
    'outfit.stepNote': '第 1 步：先做好人物同基本制服。身形滑桿、姿勢同徽章會喺之後幾步加入。',
    'badges.later': '徽章會喺人物同制服做好之後先加返（第 3 步）。以下係已整理嘅佩戴位置：',
    'outfit.figure': '人物',
    'outfit.boy': '男孩',
    'outfit.girl': '女孩',
    'outfit.skin': '膚色',
    'outfit.top': '上衣',
    'outfit.orange': '橙色活動服',
    'outfit.polo': '單色有領',
    'outfit.tee': '單色圓領',
    'outfit.topColour': '上衣顏色',
    'outfit.sleeves': '袖長',
    'outfit.short': '短袖',
    'outfit.long': '長袖',
    'outfit.legs': '褲',
    'outfit.shorts': '短褲',
    'outfit.trousers': '長褲',
    'outfit.legColour': '褲顏色',
    'outfit.hat': '帽（非必需）',
    'outfit.noHat': '無',
    'outfit.bucket': '漁夫帽',
    'outfit.cap': '鴨咀帽',
    'outfit.hatColour': '帽顏色',
    'outfit.vest': '背心（非必需）',
    'outfit.socks': '襪',
    'outfit.shortSocks': '短襪',
    'outfit.longSocks': '長襪',
    'outfit.invested': '已宣誓',
    'outfit.investedNote': '未宣誓可穿全套服裝，但團員章同旅巾要宣誓後先戴。',
    'outfit.school': '學校運動上衣（未能縫章）',
    'outfit.schoolNote': '團員章改戴喺旅巾尖，進步章戴喺巾尾。',
    'outfit.necker': '旅巾顏色',
    'outfit.neckerMain': '主色',
    'outfit.neckerBorder': '花邊',
    'outfit.woggle': '顏色巾圈',
    'outfit.on': '開',
    'outfit.off': '關',
    'src.title': '資料來源',
    'src.rules': '小童軍服裝規則（摘要）',
    'src.notAllowed': '唔可以',
    'src.conflicts': '文件之間嘅分別',
    'src.uninvested': '未宣誓',
    'src.handbookCopy': '手冊內容版權屬香港童軍總會，本工具只作摘要引用並列明出處。',
    'src.open': '開啟',
    'shot.done': '已下載截圖',
    'shot.fail': '截圖失敗，請再試',
    'shot.caption': '小童軍服裝預覽・依手冊整理・待領袖核對',
    'footer.copy': '© SCOUT SYSTEM · COPYRIGHT SCOUT SYSTEM · SCOUT3D v1.0',
    'loading': '載入緊 3D 模型…',
    'nowebgl': '呢部裝置或者瀏覽器開唔到「WebGL」，3D 模型顯示唔到。下面嘅文字資料照樣可以睇。',
  },
  en: {
    'app.title': 'SCOUT3D Grasshopper Dress Preview',
    'app.short': 'SCOUT3D',
    'app.sub': 'Scout Association of Hong Kong · Grasshopper Scouts',
    'lang.aria': 'Switch to Chinese',
    'lang.title': '切換到中文',
    'tab.badges': 'Badges',
    'tab.outfit': 'Outfit',
    'tab.sources': 'Sources',
    'view.front': 'Front',
    'view.back': 'Back',
    'view.left': "Wearer's left",
    'view.right': "Wearer's right",
    'view.reset': 'Reset',
    'view.shot': 'Screenshot',
    'view.group': 'Views',
    'hint.drag': 'Drag to rotate · scroll or pinch to zoom',
    'pending.all': 'Compiled from the handbook · awaiting leader review',
    'status.documented': 'From the documents · awaiting review',
    'status.pending': 'Unconfirmed',
    'status.verified': 'Reviewed',
    'disclaimer': "Always follow your Scout organisation's and unit's latest guidance on what to wear.",
    'unofficial': 'Unofficial tool. Positions are illustrative and badge artwork is simplified, not the official design.',
    'lr.note': "Left and right always mean the wearer's own left and right.",
    'rules.version': 'Rules data version',
    'rules.compiled': 'Compiled',
    'rules.checked': 'Reviewed',
    'rules.notChecked': 'Not yet reviewed',
    'info.place': 'Position',
    'info.quote': 'Source text (paraphrased)',
    'info.conditions': 'When to wear',
    'info.source': 'Source',
    'info.page': 'p.',
    'info.size': 'Size',
    'info.sizeMeasured': 'stated in the documents',
    'info.sizeGuess': 'not stated; model estimate',
    'info.why': 'Why unconfirmed',
    'info.focus': 'Focus',
    'info.close': 'Close',
    'info.required': 'Required',
    'info.optional': 'Optional',
    'info.hidden': 'Currently hidden. Turn it on to see it.',
    'badge.show': 'Show',
    'badge.steps': 'Steps completed',
    'badge.none': 'None',
    'badge.notInSchool': 'School sports top mode shows only the Membership Badge and Progress Awards.',
    'badge.needInvest': 'Worn only after investiture.',
    'badge.schoolPending': 'The 3rd-edition guide gives no position on the neckerchief, so it is not shown in this mode.',
    'outfit.finish': 'Finish',
    'outfit.painted': 'Painted',
    'outfit.unpainted': 'Unpainted (grey)',
    'outfit.wearing': 'Wearing now',
    'outfit.wearingDesc': 'Orange activity shirt (white collar and cuffs), grey track pants, white sneakers.',
    'outfit.stepNote': 'Step 1: the figure and the basic uniform. Body sliders, poses and badges come in later steps.',
    'badges.later': 'Badges return after the figure and uniform are done (step 3). Positions compiled so far:',
    'outfit.figure': 'Figure',
    'outfit.boy': 'Boy',
    'outfit.girl': 'Girl',
    'outfit.skin': 'Skin tone',
    'outfit.top': 'Top',
    'outfit.orange': 'Orange activity shirt',
    'outfit.polo': 'Plain collared',
    'outfit.tee': 'Plain round-neck',
    'outfit.topColour': 'Top colour',
    'outfit.sleeves': 'Sleeves',
    'outfit.short': 'Short',
    'outfit.long': 'Long',
    'outfit.legs': 'Trousers',
    'outfit.shorts': 'Shorts',
    'outfit.trousers': 'Long trousers',
    'outfit.legColour': 'Trouser colour',
    'outfit.hat': 'Hat (optional)',
    'outfit.noHat': 'None',
    'outfit.bucket': 'Bucket hat',
    'outfit.cap': 'Baseball cap',
    'outfit.hatColour': 'Hat colour',
    'outfit.vest': 'Vest (optional)',
    'outfit.socks': 'Socks',
    'outfit.shortSocks': 'Short',
    'outfit.longSocks': 'Long',
    'outfit.invested': 'Invested',
    'outfit.investedNote': 'Uninvested members may wear the full dress, but the Membership Badge and neckerchief come only after investiture.',
    'outfit.school': 'School sports top (badges cannot be sewn on)',
    'outfit.schoolNote': 'The Membership Badge moves to the neckerchief point and the Progress Awards to the tails.',
    'outfit.necker': 'Neckerchief colours',
    'outfit.neckerMain': 'Main',
    'outfit.neckerBorder': 'Border',
    'outfit.woggle': 'Colour woggle',
    'outfit.on': 'On',
    'outfit.off': 'Off',
    'src.title': 'Sources',
    'src.rules': 'Grasshopper dress rules (summary)',
    'src.notAllowed': 'Not allowed',
    'src.conflicts': 'Differences between documents',
    'src.uninvested': 'Before investiture',
    'src.handbookCopy': 'Handbook content is copyright of the Scout Association of Hong Kong; this tool only summarises it, with sources cited.',
    'src.open': 'Open',
    'shot.done': 'Screenshot downloaded',
    'shot.fail': 'Screenshot failed, please try again',
    'shot.caption': 'Grasshopper dress preview · compiled from the handbook · awaiting leader review',
    'footer.copy': '© SCOUT SYSTEM · COPYRIGHT SCOUT SYSTEM · SCOUT3D v1.0',
    'loading': 'Loading the 3D model…',
    'nowebgl': 'WebGL is not available on this device or browser, so the 3D model cannot be shown. The text information below still works.',
  },
};

function readLang() {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return v === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

function saveLang(lang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* 私隱模式：唔記得都照用 */
  }
}

/** 揀語言版本；英文缺就 fall back 中文 */
export function bi(lang, zh, en) {
  return lang === 'en' ? en || zh : zh;
}

/** 由規則資料 {zh:{...},en:{...}} 攞欄位 */
export function pick(lang, obj, key) {
  if (!obj) return '';
  const zhv = obj.zh && typeof obj.zh === 'object' ? obj.zh[key] : obj.zh;
  const env = obj.en && typeof obj.en === 'object' ? obj.en[key] : obj.en;
  return bi(lang, zhv ?? '', env ?? '');
}

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-lang', lang);
    el.setAttribute('lang', lang === 'en' ? 'en' : 'zh-Hant-HK');
    document.title = `${STRINGS[lang]['app.title'] ?? STRINGS.zh['app.title']} v1.0`;
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((cur) => {
      const next = cur === 'en' ? 'zh' : 'en';
      saveLang(next);
      return next;
    });
  }, []);

  const t = useCallback((key) => STRINGS[lang]?.[key] ?? STRINGS.zh[key] ?? key, [lang]);
  const value = useMemo(() => ({ lang, toggle, t }), [lang, toggle, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function LangToggle() {
  const { lang, toggle, t } = useLang();
  return (
    <button
      type="button"
      className="chipbtn chipbtn--lang"
      onClick={toggle}
      aria-label={t('lang.aria')}
      title={t('lang.title')}
    >
      {lang === 'en' ? '中文' : 'EN'}
    </button>
  );
}

export const _STRINGS_FOR_TEST = STRINGS;
