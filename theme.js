/* テーマ適用（<head>で同期実行してチラつきを防ぐ） */
(function () {
  function apply(m) {
    var light = m === 'light' || (m === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    var t = document.querySelector('meta[name=theme-color]');
    if (t) t.content = light ? '#ffffff' : '#000000';
  }
  window.applyTheme = apply;
  var m = 'dark';
  try { m = localStorage.getItem('ms-theme') || 'dark'; } catch (e) {}
  apply(m);
})();
