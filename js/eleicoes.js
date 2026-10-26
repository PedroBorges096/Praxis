/* =========================================================
   ELEIÇÕES 2026 — dados em data/eleicoes.json e data/autoridades.json
   (editáveis no painel: "Eleições" e "Quem Governa")
   ========================================================= */
(function () {
  'use strict';
  var MAPA = { RR: [2, 0], AP: [4, 0], AM: [1, 1], PA: [3, 1], MA: [5, 1], CE: [6, 1], RN: [7, 1], AC: [0, 2], RO: [1, 2], MT: [2, 2], TO: [3, 2], PI: [5, 2], PB: [7, 2],
    GO: [3, 3], DF: [4, 3], BA: [5, 3], PE: [6, 3], AL: [7, 3], MS: [2, 4], MG: [4, 4], ES: [5, 4], SE: [6, 4], SP: [3, 5], RJ: [4, 5], PR: [3, 6], SC: [3, 7], RS: [2, 8] };
  var NOMES = { AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins' };
  var CORES = { PT: '#B3202E', PL: '#1F4E8C', PSD: '#8A6200', PP: '#5B3F99', Republicanos: '#2F7D5B', MDB: '#C2410C', PSDB: '#0E7490', Podemos: '#7A3B69', 'União': '#334155', PSB: '#B91C5C', Novo: '#9A3412', Rede: '#0F766E', PDT: '#9F1239' };
  var EXTRA = ['#4F46E5', '#0369A1', '#65A30D', '#A16207', '#6D28D9'];
  function cor(p) { if (CORES[p]) return CORES[p]; var h = 0; for (var i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) >>> 0; return EXTRA[h % EXTRA.length]; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pct(n) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; }
  function num(n) { return Number(n).toLocaleString('pt-BR'); }
  function dataBR(iso) { return iso ? iso.slice(0, 10).split('-').reverse().join('/') : ''; }
  function ini(n) { var p = String(n).split(' ').filter(function (x) { return x.length > 2; }); if (!p.length) p = [String(n)]; return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
  function json(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  /* Fotos pela Wikipédia (quando existir artigo com foto) */
  var cacheFoto = {};
  try { cacheFoto = JSON.parse(sessionStorage.getItem('praxis-fotos') || '{}'); } catch (e) { /* ok */ }
  function foto(titulo) {
    if (cacheFoto[titulo] !== undefined) return Promise.resolve(cacheFoto[titulo]);
    return fetch('https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titulo.replace(/ /g, '_')))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { var f = j && j.type !== 'disambiguation' && j.thumbnail ? j.thumbnail.source : ''; cacheFoto[titulo] = f; try { sessionStorage.setItem('praxis-fotos', JSON.stringify(cacheFoto)); } catch (e) { /* ok */ } return f; })
      .catch(function () { return ''; });
  }
  function preencherFotos(raiz) {
    var alvos = Array.prototype.slice.call((raiz || document).querySelectorAll('[data-foto-de]'));
    function prox() {
      var el = alvos.shift(); if (!el) return Promise.resolve();
      return foto(el.getAttribute('data-foto-de')).then(function (f) {
        if (f) el.outerHTML = '<img class="ft" src="' + esc(f) + '" alt="" loading="lazy" referrerpolicy="no-referrer">';
      }).then(prox);
    }
    return Promise.all([prox(), prox(), prox()]);
  }

  /* ---------- Presidente ---------- */
  function presidente(p) {
    var t2 = p.segundo_turno, t1 = p.primeiro_turno;
    var a = t2.candidatos[0], b = t2.candidatos[1];
    $('pres-sub').textContent = '2º turno em ' + dataBR(t2.data) + ' · 1º turno em ' + dataBR(t1.data) + '.';
    $('pres-2t').innerHTML = '<div class="placar">' +
      '<div class="placar__nomes">' +
        '<div class="placar__cand"><span class="eyebrow" style="color:' + cor(a.partido) + '">Eleito · ' + esc(a.partido) + '</span><span class="placar__pct" style="color:' + cor(a.partido) + '">' + pct(a.percentual) + '</span><strong>' + esc(a.nome) + '</strong></div>' +
        '<div class="placar__cand"><span class="eyebrow" style="color:' + cor(b.partido) + '">' + esc(b.partido) + '</span><span class="placar__pct" style="color:' + cor(b.partido) + '">' + pct(b.percentual) + '</span><strong>' + esc(b.nome) + '</strong></div>' +
      '</div>' +
      '<div class="placar__meio"><div class="placar__barra" role="img" aria-label="' + esc(a.nome) + ' ' + pct(a.percentual) + ', ' + esc(b.nome) + ' ' + pct(b.percentual) + '">' +
        '<span style="width:' + a.percentual + '%;background:' + cor(a.partido) + '"></span><span style="width:' + b.percentual + '%;background:' + cor(b.partido) + '"></span></div></div>' +
      '<p class="fonte" style="margin:0">Votos válidos no 2º turno. Fonte: <a href="' + esc(t2.fonte_url) + '" target="_blank" rel="noopener">' + esc(t2.fonte) + '</a>.</p></div>';
    var max = Math.max.apply(null, t1.candidatos.map(function (c) { return c.percentual; }));
    $('pres-1t').innerHTML = '<thead><tr><th>Candidato(a)</th><th>Partido</th><th>Votos</th><th>%</th><th style="width:30%"></th></tr></thead><tbody>' +
      t1.candidatos.map(function (c) {
        return '<tr><td><strong>' + esc(c.nome) + '</strong></td><td>' + esc(c.partido) + '</td><td class="num">' + num(c.votos) + '</td><td class="num"><strong>' + pct(c.percentual) + '</strong></td>' +
          '<td><div class="mini-barra"><span style="width:' + (c.percentual / max * 100) + '%;background:' + cor(c.partido) + '"></span></div></td></tr>';
      }).join('') + '</tbody>';
    $('pres-fonte').innerHTML = 'Comparecimento: ' + esc(t1.comparecimento) + ' · Brancos: ' + esc(t1.brancos) + ' · Nulos: ' + esc(t1.nulos) + '. Fonte: <a href="' + esc(t1.fonte_url) + '" target="_blank" rel="noopener">' + esc(t1.fonte) + '</a>.';
  }

  /* ---------- Governadores ---------- */
  var govs = [], filtroPartido = '';
  function detalheGov(uf) {
    var g = govs.filter(function (x) { return x.uf === uf; })[0]; if (!g) return;
    document.querySelectorAll('.gov__uf').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-uf') === uf ? 'true' : 'false'); });
    $('gov-detalhe').innerHTML = '<div class="cartao-pessoa"><span class="ft" data-foto-de="' + esc(g.wiki_eleito || g.eleito) + '">' + esc(ini(g.eleito)) + '</span><div>' +
      '<span class="eyebrow">' + esc(NOMES[g.uf] || g.uf) + '</span><h3>' + esc(g.eleito) + '</h3>' +
      '<p><strong style="color:' + cor(g.partido_eleito) + '">' + esc(g.partido_eleito) + '</strong> · ' + pct(g.percentual) + ' no ' + esc(g.turno) + ' turno' + (g.situacao ? ' · ' + esc(g.situacao) : '') + '</p>' +
      '<p style="margin-top:6px"><a href="politicos?cargo=governador&uf=' + esc(g.uf) + '" style="text-decoration:underline">Ver quem governa ' + esc(g.uf) + ' hoje →</a></p></div></div>';
    preencherFotos($('gov-detalhe'));
  }
  function desenharGov() {
    $('gov-mapa').innerHTML = govs.map(function (g) {
      var m = MAPA[g.uf]; if (!m) return '';
      var apagado = filtroPartido && g.partido_eleito !== filtroPartido;
      return '<button type="button" class="gov__uf" data-uf="' + g.uf + '" aria-pressed="false" aria-label="' + esc((NOMES[g.uf] || g.uf) + ': ' + g.eleito + ', ' + g.partido_eleito) + '" style="grid-column:' + (m[0] + 1) + ';grid-row:' + (m[1] + 1) + ';background:' + cor(g.partido_eleito) + ';opacity:' + (apagado ? '.18' : '1') + '">' + g.uf + '</button>';
    }).join('');
    var cont = {}; govs.forEach(function (g) { cont[g.partido_eleito] = (cont[g.partido_eleito] || 0) + 1; });
    $('gov-legenda').innerHTML = '<button type="button" data-p="">Todos</button>' + Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; }).map(function (p) {
      return '<button type="button" data-p="' + esc(p) + '" aria-pressed="' + (filtroPartido === p) + '"><i style="background:' + cor(p) + '"></i>' + esc(p) + ' (' + cont[p] + ')</button>';
    }).join('');
    $('gov-tabela').innerHTML = '<thead><tr><th>UF</th><th>Eleito(a)</th><th>Partido</th><th>Votos válidos</th><th>Turno</th><th>Hoje no cargo</th></tr></thead><tbody>' +
      govs.filter(function (g) { return !filtroPartido || g.partido_eleito === filtroPartido; }).map(function (g) {
        return '<tr><td><strong>' + g.uf + '</strong></td><td>' + esc(g.eleito) + (g.situacao ? '<span class="tag-ree">' + esc(/reelei/.test(g.situacao) ? 'reeleito(a)' : 'continua') + '</span>' : '') + '</td>' +
          '<td><span style="display:inline-block;width:10px;height:10px;border-radius: 8px;background:' + cor(g.partido_eleito) + ';margin-right:6px"></span>' + esc(g.partido_eleito) + '</td><td class="num">' + pct(g.percentual) + '</td><td>' + esc(g.turno) + '</td><td>' + esc(g.em_exercicio || '—') + '</td></tr>';
      }).join('') + '</tbody>';
  }

  /* ---------- Senado ---------- */
  var sens = [], filtroSen = '';
  function desenharSen(nota) {
    $('sen-sub').textContent = nota || '';
    var cont = {}; sens.forEach(function (s) { cont[s.partido] = (cont[s.partido] || 0) + 1; });
    $('sen-legenda').innerHTML = '<button type="button" data-p="">Todos (' + sens.length + ')</button>' + Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; }).map(function (p) {
      return '<button type="button" data-p="' + esc(p) + '"><i style="background:' + cor(p) + '"></i>' + esc(p) + ' (' + cont[p] + ')</button>';
    }).join('');
    var porUf = {};
    sens.forEach(function (s) { (porUf[s.uf] = porUf[s.uf] || []).push(s); });
    $('sen-grade').innerHTML = Object.keys(porUf).sort().map(function (uf) {
      var lista = porUf[uf].filter(function (s) { return !filtroSen || s.partido === filtroSen; });
      if (!lista.length) return '';
      return '<article class="sen-uf"><h3>' + esc((NOMES[uf] || uf).toUpperCase()) + '</h3>' + lista.map(function (s) {
        return '<div class="sen"><span class="ft" data-foto-de="' + esc(s.wiki || s.nome) + '">' + esc(ini(s.nome)) + '</span><div><strong>' + esc(s.nome) + (s.reeleito ? '<span class="tag-ree">reeleito(a)</span>' : '') + '</strong>' +
          '<small><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + cor(s.partido) + ';margin-right:5px"></span>' + esc(s.partido) + '</small></div></div>';
      }).join('') + '</article>';
    }).join('');
    preencherFotos($('sen-grade'));
  }

  function calendario(c) {
    $('cal').innerHTML = (c || []).map(function (e) { return '<li><b>' + dataBR(e.data) + '</b><span>' + esc(e.evento) + '</span></li>'; }).join('');
  }

  Promise.all([json('data/eleicoes.json'), json('data/autoridades.json').catch(function () { return {}; })]).then(function (r) {
    var e = r[0], a = r[1];
    $('status').innerHTML = '';
    presidente(e.presidente);
    govs = (a.governadores || []).slice();
    desenharGov();
    $('gov-fonte').textContent = a.governadores_nota || '';
    sens = e.senadores_eleitos || [];
    desenharSen(e.senado_nota);
    calendario(e.calendario);
    if (e.link_tse) $('link-tse').href = e.link_tse;
    var inicial = (location.hash.match(/^#uf-([A-Z]{2})$/) || [])[1] || 'SP';
    detalheGov(inicial);
  }).catch(function () {
    $('status').innerHTML = '<div class="erro">Não foi possível carregar os resultados agora.</div>';
  });

  $('gov-mapa').addEventListener('click', function (ev) { var b = ev.target.closest('.gov__uf'); if (b) detalheGov(b.getAttribute('data-uf')); });
  $('gov-legenda').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b) return; filtroPartido = b.getAttribute('data-p'); desenharGov(); });
  $('sen-legenda').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b) return; filtroSen = b.getAttribute('data-p'); desenharSen($('sen-sub').textContent); });
})();
