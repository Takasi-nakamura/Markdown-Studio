/* 軽量Markdownパーサー。コードの色付けはプレビューでhighlight.jsを使用。 */
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const safe = u => /^\s*(javascript|vbscript):/i.test(u) ? '#' : u;

function inline(s) {
  s = esc(s);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => '\u0000' + (codes.push(c) - 1) + '\u0000');
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img alt="${a}" src="${safe(u)}">`)
       .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${safe(u)}" target="_blank" rel="noopener">${t}</a>`)
       .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
       .replace(/~~(.+?)~~/g, '<del>$1</del>')
       .replace(/\*(.+?)\*/g, '<em>$1</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + codes[i] + '</code>');
}

function md(text) {
  const L = text.replace(/\r/g, '').split('\n'), o = [];
  const LI = /^\s*([-*+]|\d+\.)\s/;
  let i = 0;
  while (i < L.length) {
    const l = L[i]; let m;
    if (/^```/.test(l)) {
      const lang = l.slice(3).trim().split(/\s+/, 1)[0].toLowerCase().replace(/[^a-z0-9_+-]/g, '');
      const b = []; i++;
      while (i < L.length && !/^```/.test(L[i])) b.push(L[i++]);
      i++; o.push('<pre><code' + (lang ? ' class="language-' + lang + '"' : '') + '>' + esc(b.join('\n')) + '</code></pre>');
    } else if ((m = l.match(/^(#{1,6})\s+(.*)/))) {
      o.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++;
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) {
      o.push('<hr>'); i++;
    } else if (/^>/.test(l)) {
      const b = [];
      while (i < L.length && /^>/.test(L[i])) b.push(L[i++].replace(/^>\s?/, ''));
      o.push('<blockquote>' + md(b.join('\n')) + '</blockquote>');
    } else if (LI.test(l)) {
      const ord = /^\s*\d+\./.test(l), b = [];
      while (i < L.length && LI.test(L[i])) b.push(L[i++].replace(LI, ''));
      o.push((ord ? '<ol>' : '<ul>') + b.map(x => {
        const c = x.match(/^\[([ xX])\]\s(.*)/);
        return c ? `<li class="task"><input type="checkbox" disabled ${c[1] !== ' ' ? 'checked' : ''}> ${inline(c[2])}</li>` : '<li>' + inline(x) + '</li>';
      }).join('') + (ord ? '</ol>' : '</ul>'));
    } else if (/^\s*\|.*\|\s*$/.test(l) && /^\s*\|?\s*:?-{2,}:?\s*\|/.test(L[i + 1] || '')) {
      const row = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const h = row(l), b = []; i += 2;
      while (i < L.length && L[i].trim() && /\|/.test(L[i])) b.push(row(L[i++]));
      o.push('<div class="tw"><table><thead><tr>' + h.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
        b.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
    } else if (!l.trim()) {
      i++;
    } else {
      const b = [];
      while (i < L.length && L[i].trim() && !/^(```|#{1,6}\s|>)/.test(L[i]) && !LI.test(L[i])) b.push(L[i++]);
      if (!b.length) b.push(L[i++]);
      o.push('<p>' + b.map(inline).join('<br>') + '</p>');
    }
  }
  return o.join('\n');
}
