// Traducción de Digibonk.
// Los textos del juego se escriben en español dentro de index.html. Este script los traduce en pantalla:
// observa el DOM y sustituye cada texto (y los atributos title, aria-label, placeholder, alt y data-label) por su
// traducción en i18n/<idioma>.js. Si falta una traducción, el texto se queda en español.
// Las claves pueden llevar huecos {0}, {1}... para textos con números o nombres: "Nivel {0}" -> "Level {0}".
(function(){
  'use strict';
  const KEY = 'digibonk3d-lang';
  const LANGS = [
    {code:'es', name:'Español'}, {code:'en', name:'English'}, {code:'pt', name:'Português'},
    {code:'fr', name:'Français'}, {code:'de', name:'Deutsch'}, {code:'it', name:'Italiano'},
    {code:'pl', name:'Polski'}, {code:'tr', name:'Türkçe'}, {code:'ru', name:'Русский'},
    {code:'ja', name:'日本語'}, {code:'ko', name:'한국어'}, {code:'zh', name:'中文'}
  ];
  const CODES = LANGS.map(l => l.code);
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt', 'data-label'];
  const LETTER = /[A-Za-zÀ-ÿ]/;

  function detect(){
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved && CODES.includes(saved)) return saved;
    const list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
    for (const l of list){
      const base = String(l).toLowerCase().split(/[-_]/)[0];
      if (CODES.includes(base)) return base;
    }
    return 'en';   // idioma no disponible: inglés es lo más entendible
  }

  const dicts = {};   // code -> {exact: Map, patterns: [{re, out}]}
  const I18N = window.I18N = {
    langs: LANGS,
    lang: detect(),
    missing: window.__i18nMissing || null,    // pon I18N.missing = new Set() en la consola para apuntar los textos sin traducir
    add(code, obj){
      const d = dicts[code] || (dicts[code] = {exact: new Map(), patterns: []});
      for (const [k, v] of Object.entries(obj)){
        const key = norm(k);
        if (/\{\d+\}/.test(key)){
          const lit = key.replace(/\{\d+\}/g, '');
          if (!LETTER.test(lit)) continue;
          const order = [];
          const src = key.split(/(\{\d+\})/).map(p => {
            const m = p.match(/^\{(\d+)\}$/);
            if (m){ order.push(+m[1]); return '(.+?)'; }
            return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          }).join('');
          d.patterns.push({re: new RegExp('^' + src + '$'), order, out: v, weight: lit.length});
        } else d.exact.set(key, v);
      }
      d.patterns.sort((a, b) => b.weight - a.weight);
      cache.clear();
    },
    tr, apply, setLang, openPicker
  };

  function norm(s){ return String(s).replace(/\s+/g, ' ').trim(); }
  const cache = new Map();
  function tr(s){
    if (I18N.lang === 'es' || s == null) return s;
    s = String(s);
    if (!LETTER.test(s)) return s;
    let hit = cache.get(s);
    if (hit !== undefined) return hit;
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core = trCore(norm(m[2]), 0);
    hit = core == null ? s : m[1] + core + m[3];
    if (core == null && I18N.missing) I18N.missing.add(norm(m[2]));
    if (cache.size > 4000) cache.clear();
    cache.set(s, hit);
    return hit;
  }
  function trCore(core, depth){
    const d = dicts[I18N.lang];
    if (!d) return null;
    const v = d.exact.get(core);
    if (v !== undefined) return v;
    if (depth > 2) return null;
    for (const p of d.patterns){
      const m = p.re.exec(core);
      if (!m) continue;
      const vals = {};
      p.order.forEach((n, i) => { const g = m[i + 1]; vals[n] = LETTER.test(g) ? (trCore(g, depth + 1) ?? g) : g; });
      return p.out.replace(/\{(\d+)\}/g, (_, n) => vals[n] ?? '');
    }
    // Sin clave exacta: separa por " · ", " → " o ": " y traduce cada parte ("Navidad · Reno", "Sin mejorar → +4%")
    const parts = core.split(/( · | → |: )/);
    if (parts.length > 1){
      let any = false;
      const out = parts.map((x, i) => {
        if (i % 2) return x;
        if (!LETTER.test(x)) return x;
        const r = trCore(x, depth + 1);
        if (r != null){ any = true; return r; }
        return x;
      }).join('');
      return any ? out : null;
    }
    // Signos de apertura del español: fuera en los demás idiomas ("¡ETEMON!" -> "ETEMON!")
    if (/^[¡¿]/.test(core)){ const rest = core.slice(1); const r = trCore(rest, depth + 1); return r != null ? r : (LETTER.test(rest) && !/[a-zà-ÿ]/.test(rest) ? rest : null); }
    // Prefijo de números o símbolos ("49 días", "✚ Vacuna", "×1,25 daño")
    const pre = core.match(/^([^A-Za-zÀ-ÿ¿¡]+)(.+)$/);
    if (pre){ const r = trCore(pre[2], depth + 1); if (r != null) return pre[1] + r; }
    // Sufijo de signos ("Espiral Galáctica!")
    const suf = core.match(/^(.+?)([^A-Za-zÀ-ÿ]+)$/);
    if (suf){ const r = trCore(suf[1], depth + 1); if (r != null) return r + suf[2]; }
    return null;
  }

  // ---------- DOM ----------
  const textSrc = new WeakMap();   // nodo de texto -> {src, out}
  const attrSrc = new WeakMap();   // elemento -> {attr: {src, out}}
  function doText(n){
    const rec = textSrc.get(n);
    const cur = n.data;
    let src = cur;
    if (rec && cur === rec.out) src = rec.src;     // ya traducido por nosotros
    const out = tr(src);
    if (out !== cur) n.data = out;
    if (out !== src || rec) textSrc.set(n, {src, out});
  }
  function doAttrs(el){
    if (!el.hasAttribute) return;
    for (const a of ATTRS){
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      let recs = attrSrc.get(el);
      const rec = recs && recs[a];
      let src = cur;
      if (rec && cur === rec.out) src = rec.src;
      const out = tr(src);
      if (out !== cur) el.setAttribute(a, out);
      if (out !== src || rec){ if (!recs) attrSrc.set(el, recs = {}); recs[a] = {src, out}; }
    }
  }
  function walk(root){
    if (!root) return;
    if (root.nodeType === 3){ doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1){
      const tag = root.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || root.hasAttribute('data-no-i18n')) return;
      doAttrs(root);
    }
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(n){
        if (n.nodeType === 1){
          if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.hasAttribute('data-no-i18n')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = it.nextNode())){ if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function apply(root){ walk(root || document.body); }

  let obs = null;
  function startObserver(){
    if (obs || !document.body) return;
    obs = new MutationObserver(list => {
      if (I18N.lang === 'es') return;
      for (const m of list){
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doAttrs(m.target);
        else for (const n of m.addedNodes) walk(n);
      }
    });
    obs.observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS});
  }

  // Vuelve a poner los textos originales en español (para cambiar de idioma sin recargar)
  function restore(root){
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = it.nextNode())){
      if (n.nodeType === 3){ const r = textSrc.get(n); if (r && n.data === r.out) n.data = r.src; textSrc.delete(n); }
      else { const recs = attrSrc.get(n); if (recs){ for (const a in recs){ if (n.getAttribute(a) === recs[a].out) n.setAttribute(a, recs[a].src); } attrSrc.delete(n); } }
    }
  }

  function load(code){
    if (code === 'es' || dicts[code]) return Promise.resolve();
    return new Promise(res => {
      const s = document.createElement('script');
      s.src = 'i18n/' + code + '.js';
      s.onload = s.onerror = () => res();
      document.head.appendChild(s);
    });
  }

  function setLang(code){
    if (!CODES.includes(code)) code = 'en';
    try { localStorage.setItem(KEY, code); } catch (e) {}
    return load(code).then(() => {
      restore(document.body);
      I18N.lang = code;
      cache.clear();
      document.documentElement.lang = code;
      apply(document.body);
      window.dispatchEvent(new CustomEvent('i18n:change', {detail: code}));
    });
  }

  // ---------- Selector de idioma ----------
  function openPicker(onPick){
    const old = document.getElementById('i18nPick');
    if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'i18nPick';
    wrap.setAttribute('data-no-i18n', '');
    wrap.innerHTML = `<style>
      #i18nPick{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(0,0,0,.45);font-family:'Nunito',system-ui,sans-serif}
      #i18nPick .ip-box{width:min(420px,92vw);max-height:86vh;overflow:auto;padding:16px;border-radius:18px;background:var(--m-card,#fff);color:var(--m-text,#1d2230);border:1px solid var(--m-cardline,rgba(0,0,0,.1));box-shadow:0 18px 50px rgba(0,0,0,.35)}
      #i18nPick h3{margin:2px 4px 12px;font:900 18px/1.2 'Nunito',system-ui,sans-serif}
      #i18nPick .ip-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #i18nPick button{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:999px;border:1px solid var(--m-line,rgba(0,0,0,.12));background:var(--m-sunk,#f3f4f7);color:inherit;font:800 14px/1 'Nunito',system-ui,sans-serif;cursor:pointer;text-align:left}
      #i18nPick button small{font-weight:900;font-size:11px;opacity:.55;min-width:22px}
      #i18nPick button.on{background:#f08a24;border-color:#f08a24;color:#fff}
      #i18nPick button:hover{filter:brightness(1.05)}
      #i18nPick .ip-auto{margin-top:10px;width:100%;justify-content:center}
    </style><div class="ip-box" role="dialog" aria-modal="true" aria-label="Language">
      <h3>🌐 Idioma · Language</h3>
      <div class="ip-grid">${LANGS.map(l => `<button type="button" data-code="${l.code}" class="${l.code === I18N.lang ? 'on' : ''}"><small>${l.code.toUpperCase()}</small>${l.name}</button>`).join('')}</div>
      <button type="button" class="ip-auto" data-code="auto">Auto · ${(navigator.language || '').toUpperCase()}</button>
    </div>`;
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = e => { if (e.key === 'Escape'){ e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    wrap.addEventListener('click', e => {
      const b = e.target.closest('button[data-code]');
      if (!b){ if (e.target === wrap) close(); return; }
      let code = b.dataset.code;
      if (code === 'auto'){ try { localStorage.removeItem(KEY); } catch (err) {} code = detect(); }
      close();
      setLang(code).then(() => { if (b.dataset.code === 'auto'){ try { localStorage.removeItem(KEY); } catch (err) {} } if (onPick) onPick(code); });
    });
    document.body.appendChild(wrap);
  }

  // ---------- Arranque ----------
  document.documentElement.lang = I18N.lang;
  if (I18N.lang !== 'es'){
    // Carga síncrona del diccionario para que la primera pantalla ya salga traducida
    document.write('<script src="i18n/' + I18N.lang + '.js"><\/script>');
  }
  const boot = () => { startObserver(); if (I18N.lang !== 'es') apply(document.body); };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
