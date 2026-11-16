/* Markdown Studio — エディター / 予測変換 / スニペット / マジックキー / 保存 / テーマ
   core.js（元のUI）の関数を後から拡張します */
const $ = id => document.getElementById(id);
const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  raw: k => { try { return localStorage.getItem(k); } catch { return null; } },
  put: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: k => { try { localStorage.removeItem(k); } catch {} }
};
const src = $('src'), pv = $('pv'), bar = $('predict'), appEl = document.querySelector('.app');
const wide = () => matchMedia('(min-width:768px)').matches;

/* ---------- プロジェクト保存 ---------- */
const saved = ls.get('ms-projects', null);
if (Array.isArray(saved)) { projects.length = 0; projects.push(...saved); }
nextId = Math.max(0, ...projects.map(p => p.id)) + 1;

const _render = renderProjects;
renderProjects = function (s) { ls.set('ms-projects', projects); _render(s); };
const _confirmDelete = confirmDelete;
confirmDelete = function () { const id = deletingId; _confirmDelete(); if (id != null) ls.del('ms-doc-' + id); };

const _showPage = showPage;
showPage = function (p) {
  _showPage(p);
  if (p === 'create') return;
  const ed = p === 'editor';
  appEl.classList.toggle('wide', ed);
  snip.hidden = !(ed && snipOn);
  if (p === 'projects') renderProjects($('searchInput').value);
  if (ed) place(pos.x, pos.y);
};

const _openEditor = openEditor;
openEditor = function (id) {
  const p = projects.find(x => x.id === id); if (!p) return;
  let t = ls.raw('ms-doc-' + id);
  if (t == null) t = '# ' + p.name + '\n\nここから書き始めましょう。\n';
  src.value = t;
  setTab('edit'); render(); predict();
  _openEditor(id);
  src.scrollTop = 0;
};
$('editorTitle').onclick = () => currentProjectId != null && openRenameModal(currentProjectId);

let saveT;
function autosave() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    if (currentProjectId == null) return;
    ls.put('ms-doc-' + currentProjectId, src.value);
    const p = projects.find(x => x.id === currentProjectId);
    if (p) { p.date = formatDate(); ls.set('ms-projects', projects); }
  }, 400);
}

/* ---------- タブ / プレビュー ---------- */
function setTab(t) {
  $('ws').dataset.tab = t;
  document.querySelectorAll('#edTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  if (t === 'preview') render();
}
document.querySelectorAll('#edTabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
let renderT;
function render() { clearTimeout(renderT); renderT = setTimeout(() => { pv.innerHTML = md(src.value); }, 100); }

/* ---------- 挿入 ---------- */
function insert(tpl, from, to) {
  const i = tpl.indexOf('$0'), t = tpl.replace('$0', '');
  src.focus();
  src.setRangeText(t, from, to, 'end');
  if (i >= 0) src.setSelectionRange(from + i, from + i);
  src.dispatchEvent(new Event('input'));
}

/* ---------- 予測変換 ---------- */
const TPL = [
  ['見出し1', '# $0', 'h1 見出し #'], ['見出し2', '## $0', 'h2 見出し ##'], ['見出し3', '### $0', 'h3 見出し ###'],
  ['太字', '**$0**', 'bold 太字 b'], ['斜体', '*$0*', 'italic 斜体 i'], ['取り消し線', '~~$0~~', 'strike 取り消し'],
  ['インラインコード', '`$0`', 'code コード'], ['コードブロック', '```\n$0\n```', 'codeblock コード'],
  ['リンク', '[$0](https://)', 'link リンク url'], ['画像', '![$0](https://)', 'image 画像 img'],
  ['箇条書き', '- $0', 'list 箇条書き リスト ul'], ['番号リスト', '1. $0', 'number 番号 ol'], ['ToDo', '- [ ] $0', 'todo タスク チェック'],
  ['引用', '> $0', 'quote 引用'], ['区切り線', '\n---\n', 'hr 区切り 線'],
  ['表', '| 項目 | 項目 |\n| --- | --- |\n| $0 | |', 'table 表 テーブル'],
  ['今日の日付', () => new Date().toLocaleDateString('sv'), 'date 日付 today'],
  ['現在時刻', () => new Date().toLocaleTimeString('ja', { hour: '2-digit', minute: '2-digit' }), 'time 時刻']
].map(([l, t, k]) => ({ l, t, k: (l + ' ' + k).toLowerCase().split(' '), g: '記法' }));

let SN = ls.get('ms-snips', [
  { n: 'ToDoリスト', t: '- [ ] $0\n- [ ] \n- [ ] ' },
  { n: '日報', t: '# 日報 $0\n\n## やったこと\n- \n\n## 明日やること\n- ' },
  { n: 'コード(JS)', t: '```js\n$0\n```' }
]);
const all = () => TPL.concat(SN.map(s => ({ l: s.n, t: s.t, k: [s.n.toLowerCase()], g: 'スニペット' })));
const WORD = /[\w\u3040-\u30ff\u3400-\u9fff]{3,24}/g;

function words(q, tok, max = 8) {
  const seen = new Set(), out = [];
  for (const w of (src.value.match(WORD) || [])) {
    const lw = w.toLowerCase();
    if (seen.has(lw) || lw === q) continue; seen.add(lw);
    if (!q || lw.startsWith(q)) out.push({ l: w, t: w, k: [lw], g: '文書内の単語', w: 1 });
    if (out.length >= max) break;
  }
  return out;
}
function tokenAt() {
  const p = src.selectionStart, m = src.value.slice(Math.max(0, p - 30), p).match(/[\w#\u3040-\u30ff\u3400-\u9fff]+$/);
  return m ? { w: m[0], s: p - m[0].length, e: p } : null;
}
function chip(i, tok, showG) {
  const b = document.createElement('button');
  b.className = 'chip'; b.textContent = i.l;
  if (showG) { const s = document.createElement('small'); s.textContent = i.g; b.append(s); }
  b.onclick = () => use(i, tok);
  return b;
}
function use(i, tok) {
  const txt = typeof i.t === 'function' ? i.t() : i.t;
  if (tok) insert(txt, tok.s, tok.e); else insert(txt, src.selectionStart, src.selectionEnd);
}
function predict() {
  const tok = tokenAt(), q = tok ? tok.w.toLowerCase() : '';
  const list = (q ? all().filter(i => i.k.some(k => k.startsWith(q))).concat(words(q, tok)) : all().slice(0, 8)).slice(0, 14);
  bar.replaceChildren(...list.map(i => chip(i, tok, !!q)));
}
/* ボタンを押してもエディターのフォーカス（キーボード）を外さない */
['pointerdown', 'mousedown'].forEach(ev => document.addEventListener(ev, e => {
  if (e.target.closest('.predict,.snip-body,.snip-head button')) e.preventDefault();
}));
let rafP; document.addEventListener('selectionchange', () => {
  if (document.activeElement !== src) return;
  cancelAnimationFrame(rafP); rafP = requestAnimationFrame(predict);
});

/* ---------- マジックキー「!」 ---------- */
const sheet = $('sheet'), sBack = $('sheetBack'), sQ = $('sheetQ'), sBody = $('sheetBody');
let at = [0, 0];
function openSheet() {
  at = [src.selectionStart, src.selectionEnd]; sQ.value = ''; fill('');
  sBack.classList.add('show'); sheet.classList.add('show');
}
function closeSheet() { sBack.classList.remove('show'); sheet.classList.remove('show'); }
function fill(q) {
  q = q.toLowerCase().trim();
  const g = {};
  all().concat(words('', null, 24)).filter(i => !q || i.k.some(k => k.includes(q)) || i.l.toLowerCase().includes(q))
    .forEach(i => (g[i.g] = g[i.g] || []).push(i));
  sBody.replaceChildren(...Object.entries(g).flatMap(([n, a]) => {
    const h = document.createElement('h4'); h.textContent = n;
    const d = document.createElement('div'); d.className = 'grid';
    a.forEach(i => { const c = chip(i, null); c.onclick = () => { closeSheet(); const t = typeof i.t === 'function' ? i.t() : i.t; insert(t, at[0], at[1]); }; d.append(c); });
    return [h, d];
  }));
}
sQ.oninput = () => fill(sQ.value);
sBack.onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
function magicCheck() {
  const p = src.selectionStart;
  if (p > 0 && /[!！]/.test(src.value[p - 1])) { src.setRangeText('', p - 1, p, 'end'); render(); openSheet(); return true; }
  return false;
}
src.addEventListener('input', e => {
  if (e.data && /^[!！]$/.test(e.data) && !e.isComposing && e.inputType === 'insertText' && magicCheck()) return;
  render(); autosave(); predict();
});
src.addEventListener('compositionend', e => { if (/[!！]$/.test(e.data || '')) setTimeout(magicCheck, 0); });
src.addEventListener('focus', predict);

/* ---------- スニペット（ドラッグ・折り畳み） ---------- */
const snip = $('snip'), head = $('snipHead');
let snipOn = ls.get('ms-snip-on', true), pos = ls.get('ms-snip-pos', null) || { x: Math.max(8, innerWidth - 246), y: 150 };
function place(x, y) {
  const w = snip.offsetWidth || 230, h = snip.offsetHeight || 60;
  x = Math.min(Math.max(8, x), Math.max(8, innerWidth - w - 8));
  y = Math.min(Math.max(8, y), Math.max(8, innerHeight - h - 8));
  snip.style.left = x + 'px'; snip.style.top = y + 'px'; pos = { x, y };
}
let drag = null;
head.addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;
  const r = snip.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
  head.setPointerCapture(e.pointerId);
});
head.addEventListener('pointermove', e => { if (drag) place(e.clientX - drag.dx, e.clientY - drag.dy); });
['pointerup', 'pointercancel'].forEach(ev => head.addEventListener(ev, () => { if (drag) { drag = null; ls.set('ms-snip-pos', pos); } }));
addEventListener('resize', () => place(pos.x, pos.y));
$('snipFold').onclick = () => { snip.classList.toggle('fold'); ls.set('ms-snip-fold', snip.classList.contains('fold')); place(pos.x, pos.y); };
snip.classList.toggle('fold', ls.get('ms-snip-fold', false));
$('snipToggle').onclick = () => {
  snipOn = !snipOn; ls.set('ms-snip-on', snipOn);
  snip.hidden = !snipOn; $('snipToggle').classList.toggle('on', snipOn); if (snipOn) place(pos.x, pos.y);
};
$('snipToggle').classList.toggle('on', snipOn);

function drawSnips() {
  const list = $('snipList'); list.replaceChildren();
  SN.forEach((s, idx) => {
    const r = document.createElement('div'); r.className = 'snip-row';
    const u = document.createElement('button'); u.className = 'use'; u.textContent = s.n; u.title = s.t;
    u.onclick = () => insert(s.t, src.selectionStart, src.selectionEnd);
    const d = document.createElement('button'); d.className = 'del'; d.setAttribute('aria-label', '削除'); d.innerHTML = '<i data-lucide="x" width="14" height="14"></i>';
    d.onclick = () => { SN.splice(idx, 1); ls.set('ms-snips', SN); drawSnips(); predict(); };
    r.append(u, d); list.append(r);
  });
  refreshIcons();
}
$('snipAdd').onclick = () => { $('snName').value = ''; $('snBody').value = ''; $('snipModal').classList.add('show'); setTimeout(() => $('snName').focus(), 100); };
const closeSnM = () => $('snipModal').classList.remove('show');
$('snCancel').onclick = closeSnM;
$('snipModal').onclick = e => { if (e.target === e.currentTarget) closeSnM(); };
$('snSave').onclick = () => {
  const n = $('snName').value.trim(), t = $('snBody').value;
  if (!n || !t) { (n ? $('snBody') : $('snName')).focus(); return; }
  SN.push({ n, t }); ls.set('ms-snips', SN); closeSnM(); drawSnips(); predict();
};

/* ---------- ダウンロード / PDF印刷 ---------- */
function curName() { const p = projects.find(x => x.id === currentProjectId); return p ? p.name : 'document'; }
$('dlBtn').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([src.value], { type: 'text/markdown;charset=utf-8' }));
  a.download = curName().replace(/[\\/:*?"<>|]/g, '_') + '.md';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
let oldTitle = document.title;
$('pdfBtn').onclick = () => {
  $('printRoot').innerHTML = md(src.value);
  oldTitle = document.title; document.title = curName();
  setTimeout(() => print(), 50);
};
addEventListener('afterprint', () => { document.title = oldTitle; });

/* ---------- テーマ ---------- */
function setTheme(m) {
  ls.put('ms-theme', m); applyTheme(m);
  document.querySelectorAll('#themeSeg button').forEach(b => b.classList.toggle('active', b.dataset.t === m));
}
document.querySelectorAll('#themeSeg button').forEach(b => b.onclick = () => setTheme(b.dataset.t));
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (ls.raw('ms-theme') === 'system') applyTheme('system'); });
setTheme(ls.raw('ms-theme') || 'dark');

/* ---------- 起動 ---------- */
drawSnips(); renderProjects(); place(pos.x, pos.y); snip.hidden = true;
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
