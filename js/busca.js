/* =========================================================
   BUSCA, TAGS E PÁGINAS DE EDITORIA
   busca?q=texto · busca?tag=6x1 · busca?categoria=Política%20Nacional
   ========================================================= */
(function () {
  'use strict';
  var R = window.Render, cfg = window.PORTAL_CONFIG || {};
  R.cdn = !!cfg.cdn;
  var CATS = ['Política Nacional', 'Economia & Trabalho', 'Geopolítica & Sul Global', 'Mercados & Ações', 'Meio Ambiente & Clima', 'Colunas & Opinião'];
  var SELOS = ['Reportagem', 'Análise', 'Opinião', 'Explicador'];
  var p = new URLSearchParams(location.search);
  var estado = { q: p.get('q') || '', tag: p.get('tag') || '', cat: p.get('categoria') || '', selo: '' };
  var todas = [];
  function $(id) { return document.getElementById(id); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  function chips(alvo, lista, chave, rotuloTodos) {
    $(alvo).innerHTML = ['<button type="button" class="chip" data-v="" aria-pressed="' + !estado[chave] + '">' + rotuloTodos + '</button>']
      .concat(lista.map(function (v) { return '<button type="button" class="chip" data-v="' + R.esc(v) + '" aria-pressed="' + (estado[chave] === v) + '">' + R.esc(v) + '</button>'; })).join('');
    $(alvo).onclick = function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      estado[chave] = b.getAttribute('data-v'); if (chave === 'cat') estado.tag = '';
      chips(alvo, lista, chave, rotuloTodos); desenhar();
    };
  }

  function destacar(txt, termos) {
    var h = R.esc(txt);
    termos.forEach(function (t) {
      if (t.length < 3) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      h = h.replace(re, '<mark>$1</mark>');
    });
    return h;
  }

  function desenhar() {
    var termos = norm(estado.q).split(/\s+/).filter(Boolean);
    var r = todas.filter(function (n) {
      if (estado.cat && n.categoria !== estado.cat) return false;
      if (estado.selo && n.selo !== estado.selo) return false;
      if (estado.tag && !(n.tags || []).some(function (t) { return norm(t) === norm(estado.tag); })) return false;
      if (termos.length) {
        var alvo = norm([n.titulo, n.linha_fina, (n.tags || []).join(' '), n.categoria, (n.corpoHtml || '').replace(/<[^>]+>/g, ' '), (n.fatosHtml || '').replace(/<[^>]+>/g, ' ')].join(' '));
        return termos.every(function (t) { return alvo.indexOf(t) !== -1; });
      }
      return true;
    });
    $('busca-eyebrow').textContent = estado.tag ? 'Tema' : estado.cat ? 'Editoria' : 'Busca';
    $('busca-titulo').textContent = estado.tag ? '#' + estado.tag : estado.cat || 'Encontre uma notícia';
    document.title = ($('busca-titulo').textContent) + ' — PRAXIS';
    $('contagem').textContent = r.length + (r.length === 1 ? ' notícia' : ' notícias');
    var termosOrig = estado.q.split(/\s+/).filter(Boolean);
    $('resultados').innerHTML = r.map(function (n) {
      var img = n.imagem ? R.img(n.imagem, n.titulo, 320, 214, n.posicao_foto) : '<span class="res__vazia" aria-hidden="true"></span>';
      return '<article class="res"><a href="' + R.esc(n.url) + '" tabindex="-1" aria-hidden="true">' + img + '</a><div>' +
        '<div class="rotulo" style="display:flex;gap:8px;align-items:center;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--bordo)"><span class="selo ' + R.seloClasse(n.selo) + '">' + R.esc(n.selo) + '</span>' + R.esc(n.categoria) + '</div>' +
        '<h2><a href="' + R.esc(n.url) + '">' + destacar(n.titulo, termosOrig) + '</a></h2>' +
        '<p>' + destacar(n.linha_fina || '', termosOrig) + '</p><p style="margin-top:4px">' + R.dataBR(n.data) + ' · ' + n.tempo + ' min</p></div></article>';
    }).join('') || '<p>Nada encontrado. Tente outra palavra.</p>';
    var q = new URLSearchParams();
    if (estado.q) q.set('q', estado.q); if (estado.tag) q.set('tag', estado.tag); if (estado.cat) q.set('categoria', estado.cat);
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
  }

  function nuvem() {
    var cont = {};
    todas.forEach(function (n) { (n.tags || []).forEach(function (t) { cont[t] = (cont[t] || 0) + 1; }); });
    $('nuvem').innerHTML = Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; }).slice(0, 20).map(function (t) {
      return '<a href="busca?tag=' + encodeURIComponent(t) + '">#' + R.esc(t) + ' <small>(' + cont[t] + ')</small></a>';
    }).join('');
  }

  $('q').value = estado.q;
  var timer;
  $('q').addEventListener('input', function (e) { clearTimeout(timer); timer = setTimeout(function () { estado.q = e.target.value; desenhar(); }, 150); });
  chips('chips-cat', CATS, 'cat', 'Todas as editorias');
  chips('chips-selo', SELOS, 'selo', 'Todos os tipos');

  fetch('data/noticias.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (l) {
    var agora = Date.now();
    todas = l.filter(function (n) { return new Date(n.data).getTime() <= agora; });
    nuvem(); desenhar();
  }).catch(function () { $('resultados').innerHTML = '<div class="erro">Não foi possível carregar as notícias.</div>'; });
})();
