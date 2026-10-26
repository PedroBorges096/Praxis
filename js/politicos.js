/* =========================================================
   QUEM GOVERNA — lista de deputados, senadores e Executivo
   Fontes (carregadas ao vivo, direto no navegador do leitor):
   - Câmara:  https://dadosabertos.camara.leg.br/api/v2
   - Senado:  https://legis.senado.leg.br/dadosabertos
   - Votos:   data/votos.json (gerado pelo script scripts/gerar_votos.py, dados do TSE)
   ========================================================= */
(function () {
  'use strict';

  var API_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
  var API_SENADO = 'https://legis.senado.leg.br/dadosabertos';
  var SALARIO_PARLAMENTAR = 46366.19; // Decreto Legislativo 172/2022, desde 01/02/2025
  var POR_PAGINA = 60;

  var REGIAO = {
    AC: 'Norte', AM: 'Norte', AP: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
    AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
    DF: 'Centro-Oeste', GO: 'Centro-Oeste', MS: 'Centro-Oeste', MT: 'Centro-Oeste',
    ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
    PR: 'Sul', RS: 'Sul', SC: 'Sul'
  };
  var CORES = ['#8B1E2D', '#1F5F8B', '#D9A21B', '#2F7D5B', '#6E4BA3', '#C2410C', '#4F8A9A', '#9C5A7A', '#5B6B2E', '#3A4252', '#B07B3E', '#7A8794'];

  var estado = {
    pessoas: [],
    votos: {},
    cargo: 'todos', regiao: '', uf: '', partido: '', busca: '', ordem: 'nome',
    mostrando: POR_PAGINA,
    erros: [],
    copia: []
  };
  var cache = {};

  /* ---------- utilidades ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function get(o, caminho) {
    return caminho.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o);
  }
  function normalizar(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
  }
  function iniciais(nome) {
    var todas = String(nome).replace(/[\[\]]/g, '').split(' ').filter(Boolean);
    var p = todas.filter(function (x) { return x.length > 2; });
    if (!p.length) p = todas;
    if (p.length < 2) return ((p[0] || '?')[0]).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }
  function idade(dataISO) {
    if (!dataISO) return null;
    var n = new Date(dataISO + 'T12:00:00'), h = new Date();
    var a = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
    return a;
  }
  function dataBR(iso) { return iso ? iso.split('-').reverse().join('/') : '—'; }
  function brl(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function corPartido(sigla) {
    var h = 0; for (var i = 0; i < sigla.length; i++) h = (h * 31 + sigla.charCodeAt(i)) >>> 0;
    return CORES[h % CORES.length];
  }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Busca com 3 camadas de segurança:
  // 1) direto na API oficial; 2) se o navegador bloquear, pelo "intermediário" do próprio site
  //    (netlify/functions/dados.mjs); 3) para as listas, a cópia salva no build (data/*.json).
  var usarIntermediario = false;
  function baixar(url, tentativas) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
      clearTimeout(t);
      if (r.status === 429 && tentativas > 0) return esperar(1500).then(function () { return baixar(url, tentativas - 1); });
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      return r.json();
    }, function (e) { clearTimeout(t); throw e; });
  }
  function viaIntermediario(url) {
    if (!/^https?:$/.test(location.protocol)) return Promise.reject(new Error('sem intermediário fora do site'));
    return baixar('/.netlify/functions/dados?url=' + encodeURIComponent(url), 2);
  }
  function buscarJSON(url) {
    url = url.replace(/^http:\/\//, 'https://'); // evita bloqueio de "conteúdo misto"
    if (cache[url]) return Promise.resolve(cache[url]);
    var p = usarIntermediario ? viaIntermediario(url) : baixar(url, 3).catch(function (e) {
      if (e && e.status === 404) throw e;
      return viaIntermediario(url).then(function (j) { usarIntermediario = true; return j; });
    });
    return p.then(function (j) { cache[url] = j; return j; });
  }
  function copiaSalva(arquivo) {
    return fetch(arquivo, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { if (!j || !j.lista || !j.lista.length) throw new Error('vazia'); return j; });
  }

  /* ---------- carregamento das listas ---------- */
  function mapaDeputados(lista) {
    return lista.map(function (d) {
      return {
        id: 'dep-' + d.id, apiId: d.id, tipo: 'deputado', cargo: 'Deputado(a) federal',
        nome: d.nome, partido: d.siglaPartido || 'S/Partido', uf: d.siglaUf, regiao: REGIAO[d.siglaUf] || '',
        foto: String(d.urlFoto || '').replace(/^http:\/\//, 'https://'), email: d.email
      };
    });
  }
  function carregarDeputados() {
    var todos = [];
    function pagina(url) {
      return buscarJSON(url).then(function (j) {
        todos = todos.concat(j.dados || []);
        var prox = (j.links || []).filter(function (l) { return l.rel === 'next'; })[0];
        return prox ? pagina(prox.href) : todos;
      });
    }
    return pagina(API_CAMARA + '/deputados?ordem=ASC&ordenarPor=nome&itens=100')
      .then(function (l) { if (!l.length) throw new Error('lista vazia'); return l; })
      .catch(function () {
        return copiaSalva('data/deputados.json').then(function (j) { estado.copia.push('deputados (' + new Date(j.atualizado).toLocaleDateString('pt-BR') + ')'); return j.lista; });
      })
      .then(mapaDeputados);
  }

  function carregarSenadores() {
    return buscarJSON(API_SENADO + '/senador/lista/atual.json').then(function (j) {
      return get(j, 'ListaParlamentarEmExercicio.Parlamentares.Parlamentar') || [];
    }).then(function (l) { if (!l || (Array.isArray(l) && !l.length)) throw new Error('vazia'); return l; }).catch(function () {
      return copiaSalva('data/senadores.json').then(function (j) { estado.copia.push('senadores (' + new Date(j.atualizado).toLocaleDateString('pt-BR') + ')'); return j.lista; });
    }).then(function (lista) {
      if (!Array.isArray(lista)) lista = [lista];
      return lista.map(function (p) {
        var id = p.IdentificacaoParlamentar || {};
        var uf = id.UfParlamentar || get(p, 'Mandato.UfParlamentar');
        return {
          id: 'sen-' + id.CodigoParlamentar, apiId: id.CodigoParlamentar, tipo: 'senador',
          cargo: id.SexoParlamentar === 'Feminino' ? 'Senadora' : 'Senador',
          nome: id.NomeParlamentar, nomeCivil: id.NomeCompletoParlamentar,
          partido: id.SiglaPartidoParlamentar || 'S/Partido', uf: uf, regiao: REGIAO[uf] || '',
          foto: String(id.UrlFotoParlamentar || '').replace(/^http:\/\//, 'https://'), email: id.EmailParlamentar, pagina: id.UrlPaginaParlamentar,
          participacao: get(p, 'Mandato.DescricaoParticipacao'),
          mandatoInicio: get(p, 'Mandato.PrimeiraLegislaturaDoMandato.DataInicio'),
          mandatoFim: get(p, 'Mandato.SegundaLegislaturaDoMandato.DataFim')
        };
      });
    });
  }

  // Cargos sem API (Executivo, ministros, STF, governadores, presidentes das Casas):
  // vêm de data/autoridades.json, que a Sthephanye edita no painel.
  function carregarAutoridades() {
    return fetch('data/autoridades.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (a) {
      estado.notas = { ministro: a.ministros_nota, stf: a.stf_nota, governador: a.governadores_nota };
      var lista = [];
      var add = function (tipo, arr, extra) {
        (arr || []).forEach(function (e, i) {
          var o = Object.assign({ tipo: tipo, posicao: i, regiao: REGIAO[e.uf] || '' }, e, extra ? extra(e) : {});
          o.nomeCivil = o.nomeCivil || e.nome;
          o.nome = e.nome_curto || o.nome || e.nome;
          o.creditoFoto = e.credito_foto;
          o.partido = o.partido || '—';
          o.id = tipo + '-' + i;
          lista.push(o);
        });
      };
      add('executivo', a.executivo);
      add('mesa', a.presidentes_casas);
      add('ministro', a.ministros);
      add('stf', a.stf);
      add('governador', a.governadores, function (g) {
        var temAtual = !!g.em_exercicio;
        return {
          nome: temAtual ? g.em_exercicio : g.eleito,
          partido: (temAtual ? g.partido_exercicio : g.partido_eleito) || '—',
          cargo: temAtual ? 'Governador(a) · ' + g.uf : 'Governador(a) eleito(a) · ' + g.uf,
          wiki: temAtual ? g.wiki_exercicio : g.wiki_eleito,
          mandato: temAtual ? 'Em exercício até 6/1/2027' : 'Toma posse em 6/1/2027'
        };
      });
      return lista;
    });
  }

  /* ---------- fotos pela Wikipédia (para quem não tem foto em API oficial) ---------- */
  var fotosWiki = {};
  try { fotosWiki = JSON.parse(sessionStorage.getItem('praxis-fotos') || '{}'); } catch (e) { /* ok */ }
  function resumoWiki(titulo) {
    if (!titulo) return Promise.resolve(null);
    var url = 'https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titulo.replace(/ /g, '_'));
    if (cache[url]) return Promise.resolve(cache[url]);
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || j.type === 'disambiguation') return null;
      cache[url] = j; return j;
    }).catch(function () { return null; });
  }
  function carregarFotosWiki() {
    var alvos = Array.prototype.slice.call(document.querySelectorAll('.pessoa[data-wiki]:not([data-foto-ok])'));
    function proximo() {
      var b = alvos.shift(); if (!b) return Promise.resolve();
      b.setAttribute('data-foto-ok', '1');
      var t = b.getAttribute('data-wiki');
      var pronto = fotosWiki[t] !== undefined ? Promise.resolve(fotosWiki[t]) : resumoWiki(t).then(function (j) {
        var f = j && j.thumbnail ? j.thumbnail.source : '';
        fotosWiki[t] = f;
        try { sessionStorage.setItem('praxis-fotos', JSON.stringify(fotosWiki)); } catch (e) { /* ok */ }
        return f;
      });
      return pronto.then(function (f) {
        if (f) {
          var ini = b.querySelector('.pessoa__ini');
          if (ini) ini.outerHTML = '<img class="pessoa__foto" src="' + esc(f) + '" alt="" loading="lazy" referrerpolicy="no-referrer" style="object-position:top">';
          var p = estado.pessoas.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
          if (p && !p.foto) { p.foto = f; p.creditoFoto = p.creditoFoto || 'Foto: Wikipédia / Wikimedia Commons'; }
        }
      }).then(proximo);
    }
    return Promise.all([proximo(), proximo(), proximo(), proximo()]);
  }

  function carregarVotos() {
    return fetch('data/votos.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
  }

  function votosDe(p) {
    var chave = (p.tipo === 'deputado' ? 'DEPUTADO FEDERAL' : 'SENADOR') + '|' + p.uf + '|' + normalizar(p.nome);
    return estado.votos[chave] || null;
  }

  /* ---------- filtros e desenho da lista ---------- */
  function filtrar() {
    var b = normalizar(estado.busca);
    var r = estado.pessoas.filter(function (p) {
      if (estado.cargo !== 'todos' && p.tipo !== estado.cargo) return false;
      if (estado.regiao && p.regiao !== estado.regiao) return false;
      if (estado.uf && p.uf !== estado.uf) return false;
      if (estado.partido && p.partido !== estado.partido) return false;
      if (b && normalizar(p.nome + ' ' + (p.nomeCivil || '')).indexOf(b) === -1) return false;
      return true;
    });
    var o = estado.ordem;
    var peso = { executivo: 0, mesa: 1, ministro: 2, stf: 3, governador: 4, senador: 5, deputado: 6 };
    r.sort(function (a, c) {
      if (estado.cargo === 'todos' && peso[a.tipo] !== peso[c.tipo]) return peso[a.tipo] - peso[c.tipo];
      if (a.tipo === c.tipo && /executivo|mesa|stf/.test(a.tipo) && o === 'nome') return a.posicao - c.posicao;
      var x = o === 'partido' ? a.partido + a.nome : o === 'uf' ? a.uf + a.nome : a.nome;
      var y = o === 'partido' ? c.partido + c.nome : o === 'uf' ? c.uf + c.nome : c.nome;
      return x.localeCompare(y, 'pt-BR');
    });
    return r;
  }

  function cartaoHTML(p) {
    var foto = p.foto
      ? '<img class="pessoa__foto" src="' + esc(p.foto) + '" alt="" loading="lazy" referrerpolicy="no-referrer" style="object-position:top" onerror="this.outerHTML=\'<div class=&quot;pessoa__ini&quot;>' + esc(iniciais(p.nome)) + '</div>\'">'
      : '<div class="pessoa__ini" aria-hidden="true">' + esc(iniciais(p.nome)) + '</div>';
    return '<button type="button" class="pessoa" data-id="' + esc(p.id) + '"' + (!p.foto && p.wiki ? ' data-wiki="' + esc(p.wiki) + '"' : '') + '>' + foto +
      '<span class="pessoa__info"><span class="pessoa__cargo">' + esc(p.cargo) + '</span>' +
      '<span class="pessoa__nome">' + esc(p.nome) + '</span>' +
      '<span class="pessoa__meta">' + esc(p.partido) + ' · ' + esc(p.uf || 'BR') + '</span></span></button>';
  }

  function desenharBarra(lista) {
    var cont = {};
    lista.forEach(function (p) { cont[p.partido] = (cont[p.partido] || 0) + 1; });
    var siglas = Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; });
    var total = lista.length || 1;
    var trilho = siglas.map(function (s) {
      return '<span title="' + esc(s) + ': ' + cont[s] + '" style="width:' + (cont[s] / total * 100) + '%;background:' + corPartido(s) + '"></span>';
    }).join('');
    var leg = siglas.slice(0, 14).map(function (s) {
      return '<button type="button" data-partido="' + esc(s) + '"><i style="background:' + corPartido(s) + '"></i><strong>' + esc(s) + '</strong> ' + cont[s] + '</button>';
    }).join('') + (siglas.length > 14 ? '<span style="color:var(--texto-suave)">+' + (siglas.length - 14) + ' partidos</span>' : '');
    $('barra-partidos').innerHTML = lista.length ? '<div class="barra-partidos__trilho">' + trilho + '</div><div class="barra-partidos__legenda">' + leg + '</div>' : '';
  }

  function desenhar() {
    var lista = filtrar();
    $('lista').innerHTML = lista.slice(0, estado.mostrando).map(cartaoHTML).join('');
    $('ver-mais').hidden = lista.length <= estado.mostrando;
    $('contagem').textContent = lista.length + (lista.length === 1 ? ' pessoa encontrada' : ' pessoas encontradas');
    desenharBarra(lista);
    if (!lista.length && estado.pessoas.length) $('lista').innerHTML = '<p>Ninguém encontrado com esses filtros.</p>';
    var nota = estado.notas && estado.notas[estado.cargo];
    $('nota-cargo').innerHTML = nota ? '<div class="aviso">' + esc(nota) + '</div>' : '';
    desenharMapa();
    carregarFotosWiki();
  }

  function preencherSelects() {
    var ufs = {}, partidos = {};
    estado.pessoas.forEach(function (p) { if (p.uf) ufs[p.uf] = 1; partidos[p.partido] = 1; });
    $('f-uf').innerHTML = '<option value="">Todos</option>' + Object.keys(ufs).sort().map(function (u) { return '<option>' + u + '</option>'; }).join('');
    $('f-partido').innerHTML = '<option value="">Todos</option>' + Object.keys(partidos).sort().map(function (u) { return '<option>' + esc(u) + '</option>'; }).join('');
    $('f-uf').value = estado.uf; $('f-partido').value = estado.partido;
  }

  function atualizarContadores() {
    var c = { deputado: 0, senador: 0, executivo: 0, mesa: 0, ministro: 0, stf: 0, governador: 0 }, partidos = {};
    estado.pessoas.forEach(function (p) { c[p.tipo]++; if (p.tipo === 'deputado' || p.tipo === 'senador') partidos[p.partido] = 1; });
    $('c-todos').textContent = estado.pessoas.length;
    Object.keys(c).forEach(function (k) { var el = $('c-' + k); if (el) el.textContent = c[k]; });
    $('n-dep').textContent = c.deputado || '—';
    $('n-sen').textContent = c.senador || '—';
    $('n-part').textContent = Object.keys(partidos).length;
  }

  /* ---------- mapa do Brasil (mosaico clicável) ---------- */
  var MAPA = { RR: [2, 0], AP: [4, 0], AM: [1, 1], PA: [3, 1], MA: [5, 1], CE: [6, 1], RN: [7, 1], AC: [0, 2], RO: [1, 2], MT: [2, 2], TO: [3, 2], PI: [5, 2], PB: [7, 2],
    GO: [3, 3], DF: [4, 3], BA: [5, 3], PE: [6, 3], AL: [7, 3], MS: [2, 4], MG: [4, 4], ES: [5, 4], SE: [6, 4], SP: [3, 5], RJ: [4, 5], PR: [3, 6], SC: [3, 7], RS: [2, 8] };
  function desenharMapa() {
    var alvo = $('mapa'); if (!alvo) return;
    var guardaUf = estado.uf, guardaReg = estado.regiao;
    estado.uf = ''; estado.regiao = '';
    var base = filtrar();
    estado.uf = guardaUf; estado.regiao = guardaReg;
    var cont = {}; base.forEach(function (p) { if (p.uf && MAPA[p.uf]) cont[p.uf] = (cont[p.uf] || 0) + 1; });
    var max = Math.max.apply(null, Object.keys(cont).map(function (k) { return cont[k]; }).concat([1]));
    alvo.innerHTML = Object.keys(MAPA).map(function (uf) {
      var n = cont[uf] || 0, int = n ? 0.18 + 0.82 * (n / max) : 0;
      var sel = estado.uf === uf, foraReg = estado.regiao && REGIAO[uf] !== estado.regiao;
      return '<button type="button" class="mapa__uf' + (sel ? ' mapa__uf--sel' : '') + (foraReg ? ' mapa__uf--fora' : '') + '" data-uf="' + uf + '" aria-pressed="' + sel + '" ' +
        'style="grid-column:' + (MAPA[uf][0] + 1) + ';grid-row:' + (MAPA[uf][1] + 1) + ';--int:' + int.toFixed(2) + '" aria-label="' + uf + ': ' + n + ' pessoas">' +
        '<b>' + uf + '</b><small>' + n + '</small></button>';
    }).join('');
  }

  /* ---------- ficha individual ---------- */
  function linhaDado(rotulo, valor) {
    return '<div><dt>' + esc(rotulo) + '</dt><dd>' + valor + '</dd></div>';
  }

  function abrirFicha(id) {
    var p = estado.pessoas.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var v = votosDe(p);
    var suave = function (t) { return '<span style="font-weight:500;color:var(--texto-suave)">' + t + '</span>'; };
    var votosTxt = p.tipo === 'executivo' ? esc(p.eleicao) :
      p.tipo === 'governador' ? esc(p.eleito + ' (' + p.partido_eleito + '), ' + String(p.percentual).replace('.', ',') + '% no ' + p.turno + ' turno de 2026') :
      v ? Number(v.votos).toLocaleString('pt-BR') + ' votos (' + v.ano + ')' :
      (p.tipo === 'deputado' || p.tipo === 'senador') ? suave('em atualização') : suave('não se aplica (cargo indicado)');
    var foto = p.foto ? '<figure style="margin:0;flex:0 0 auto"><img class="ficha__foto" src="' + esc(p.foto) + '" alt="Foto de ' + esc(p.nome) + '" referrerpolicy="no-referrer" style="object-position:top" onerror="this.parentNode.outerHTML=\'<div class=&quot;ficha__foto pessoa__ini&quot;>' + esc(iniciais(p.nome)) + '</div>\'">' + (p.creditoFoto ? '<figcaption style="font-size:11px;color:var(--texto-suave);margin-top:4px;max-width:180px">' + esc(p.creditoFoto) + '</figcaption>' : '') + '</figure>' : '<div class="ficha__foto pessoa__ini" aria-hidden="true">' + esc(iniciais(p.nome)) + '</div>';
    var salario = p.salario != null ? p.salario : SALARIO_PARLAMENTAR;
    var salarioTxt = salario ? brl(salario) + '<span style="display:block;font-size:11px;font-weight:500;color:var(--texto-suave)">por mês</span>' : suave('Definido por lei estadual');

    $('ficha-conteudo').innerHTML =
      '<div class="ficha__topo">' + foto +
        '<div class="ficha__dados">' +
          '<span class="eyebrow">' + esc(p.cargo) + '</span>' +
          '<h2 id="ficha-nome">' + esc(p.nome) + '</h2>' +
          '<div id="ficha-civil" style="color:var(--texto-suave);font-size:14px">' + (p.nomeCivil && p.nomeCivil !== p.nome ? esc(p.nomeCivil) : '') + '</div>' +
          '<dl class="ficha__tabela" style="margin:0">' +
            linhaDado('Partido', esc(p.partido)) +
            linhaDado('Estado · Região', esc((p.uf || '—') + ' · ' + (p.regiao || '—'))) +
            linhaDado('Idade', '<span id="ficha-idade">' + (p.nascimento ? idade(p.nascimento) + ' anos' : '…') + '</span>') +
            linhaDado('Salário bruto', salarioTxt) +
            linhaDado(p.tipo === 'governador' ? 'Eleito(a) para 2027–2030' : p.tipo === 'executivo' ? 'Eleição' : 'Votos na eleição', votosTxt) +
            (p.tipo === 'senador' && p.mandatoFim ? linhaDado('Mandato até', dataBR(p.mandatoFim)) : '') +
            (p.mandato ? linhaDado('Mandato', esc(p.mandato)) : '') +
            (p.indicado_por ? linhaDado('Indicado(a) por', esc(p.indicado_por) + (p.desde ? ' · desde ' + esc(p.desde) : '')) : '') +
          '</dl>' +
        '</div>' +
      '</div>' +
      '<div class="ficha__corpo" id="ficha-corpo"><div class="carregando">Buscando dados oficiais…</div></div>';

    var dlg = $('ficha');
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    history.replaceState(null, '', '#' + p.id);

    if (p.tipo === 'deputado') detalheDeputado(p);
    else if (p.tipo === 'senador') detalheSenador(p);
    else detalheAutoridade(p);
  }

  function fecharFicha() {
    var dlg = $('ficha');
    if (dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
    history.replaceState(null, '', location.pathname + location.search);
  }

  function blocoPessoal(itens) {
    return '<section><h3>Dados pessoais</h3><dl class="ficha__tabela" style="margin:0">' +
      itens.filter(function (i) { return i[1]; }).map(function (i) { return linhaDado(i[0], esc(i[1])); }).join('') + '</dl></section>';
  }

  function detalheDeputado(p) {
    var corpo = $('ficha-corpo');
    var ano = new Date().getFullYear();
    buscarJSON(API_CAMARA + '/deputados/' + p.apiId).then(function (j) {
      var d = j.dados || {}, st = d.ultimoStatus || {}, gab = st.gabinete || {};
      if (d.dataNascimento) $('ficha-idade').textContent = idade(d.dataNascimento) + ' anos';
      if (d.nomeCivil && normalizar(d.nomeCivil) !== normalizar(p.nome)) $('ficha-civil').textContent = d.nomeCivil;
      var redes = (d.redeSocial || []).map(function (u) { return '<a class="btn btn--contorno" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) + '</a>'; }).join('');
      corpo.innerHTML =
        blocoPessoal([
          ['Nascimento', d.dataNascimento ? dataBR(d.dataNascimento) : ''],
          ['Naturalidade', d.municipioNascimento ? d.municipioNascimento + ' (' + d.ufNascimento + ')' : ''],
          ['Escolaridade', d.escolaridade],
          ['Situação', st.situacao],
          ['Condição eleitoral', st.condicaoEleitoral],
          ['Gabinete', gab.sala ? 'Anexo ' + (gab.predio || '') + ', sala ' + gab.sala : ''],
          ['Telefone', gab.telefone ? '(61) ' + gab.telefone : ''],
          ['E-mail', gab.email || st.email]
        ]) +
        '<section><h3>Gastos com a cota parlamentar em ' + ano + '</h3><div id="ficha-gastos"><div class="carregando">Somando as notas fiscais…</div></div></section>' +
        '<section class="proj"><h3>Projetos de autoria</h3><div id="ficha-proj"><div class="carregando">Buscando projetos…</div></div></section>' +
        '<section><h3>Links oficiais</h3><div class="links-oficiais">' +
          '<a class="btn btn--escuro" href="https://www.camara.leg.br/deputados/' + p.apiId + '" target="_blank" rel="noopener">Página na Câmara</a>' + redes +
        '</div></section>';
      carregarGastos(p.apiId, ano);
      carregarProjetos(p.apiId);
    }).catch(function () {
      corpo.innerHTML = '<div class="erro">Não foi possível carregar os detalhes agora. <a href="https://www.camara.leg.br/deputados/' + p.apiId + '" target="_blank" rel="noopener"><strong>Ver na página da Câmara</strong></a>.</div>';
    });
  }

  function carregarGastos(id, ano) {
    var total = 0, notas = 0, porTipo = {};
    function pagina(n) {
      return buscarJSON(API_CAMARA + '/deputados/' + id + '/despesas?ano=' + ano + '&itens=100&pagina=' + n).then(function (j) {
        (j.dados || []).forEach(function (g) {
          var v = Number(g.valorLiquido) || 0;
          total += v; notas++;
          porTipo[g.tipoDespesa] = (porTipo[g.tipoDespesa] || 0) + v;
        });
        var prox = (j.links || []).some(function (l) { return l.rel === 'next'; });
        return prox && n < 20 ? pagina(n + 1) : null;
      });
    }
    pagina(1).then(function () {
      var el = $('ficha-gastos'); if (!el) return;
      var tipos = Object.keys(porTipo).sort(function (a, b) { return porTipo[b] - porTipo[a]; }).slice(0, 5);
      var max = tipos.length ? porTipo[tipos[0]] : 1;
      el.innerHTML = '<p style="margin:0 0 12px"><strong style="font-size:26px;font-family:var(--serif)">' + brl(total) + '</strong> <span style="color:var(--texto-suave)">em ' + notas + ' despesas declaradas</span></p>' +
        tipos.map(function (t) {
          return '<div style="margin-bottom:8px;font-size:13px"><div style="display:flex;justify-content:space-between;gap:8px"><span>' + esc(t) + '</span><strong>' + brl(porTipo[t]) + '</strong></div>' +
            '<div style="height:6px;background:var(--linha);border-radius: 8px;margin-top:4px"><div style="height:6px;border-radius: 8px;background:var(--bordo);width:' + (porTipo[t] / max * 100) + '%"></div></div></div>';
        }).join('') +
        '<p style="font-size:12px;color:var(--texto-suave);margin:8px 0 0">A cota parlamentar paga passagens, combustível, escritório e divulgação do mandato. Não faz parte do salário.</p>';
    }).catch(function () {
      var el = $('ficha-gastos'); if (el) el.innerHTML = '<p style="color:var(--texto-suave)">Gastos indisponíveis no momento.</p>';
    });
  }

  function carregarProjetos(id) {
    var url = API_CAMARA + '/proposicoes?idDeputadoAutor=' + id + '&siglaTipo=PL,PLP,PEC,PDL&dataApresentacaoInicio=2000-01-01&ordem=DESC&ordenarPor=id&itens=100';
    buscarJSON(url).then(function (j) {
      var props = j.dados || [];
      var el = $('ficha-proj'); if (!el) return;
      if (!props.length) { el.innerHTML = '<p style="color:var(--texto-suave)">Nenhum projeto de lei, PLP, PEC ou PDL de autoria encontrado.</p>'; return; }
      var mais = (j.links || []).some(function (l) { return l.rel === 'next'; });
      var recentes = props.slice(0, 12);
      el.innerHTML = '<p style="margin:0 0 6px;color:var(--texto-suave);font-size:14px"><strong style="color:var(--texto)">' + props.length + (mais ? '+' : '') + '</strong> proposições apresentadas. ' + (recentes.length > 1 ? 'As ' + recentes.length + ' mais recentes' : 'A mais recente') + ', com a situação atual:</p>' +
        '<p id="ficha-leis" style="margin:0 0 6px;font-size:14px"></p><ul>' +
        recentes.map(function (pr) {
          return '<li><span class="proj__sigla">' + esc(pr.siglaTipo + ' ' + pr.numero + '/' + pr.ano) + '</span>' +
            '<span class="proj__texto"><a href="https://www.camara.leg.br/propostas-legislativas/' + pr.id + '" target="_blank" rel="noopener">' + esc(pr.ementa) + '</a>' +
            '<span class="proj__status" id="st-' + pr.id + '">consultando situação…</span></span></li>';
        }).join('') + '</ul>';
      // consulta a situação de cada um, 2 por vez, para não sobrecarregar a API
      var fila = recentes.slice(), viraramLei = 0;
      function proximo() {
        var pr = fila.shift(); if (!pr) return Promise.resolve();
        return buscarJSON(API_CAMARA + '/proposicoes/' + pr.id).then(function (d) {
          var s = get(d, 'dados.statusProposicao.descricaoSituacao') || 'Em tramitação';
          var lei = /norma jur[ií]dica/i.test(s);
          if (lei) viraramLei++;
          var alvo = $('st-' + pr.id);
          if (alvo) alvo.innerHTML = esc(s) + (lei ? '<span class="proj__lei">VIROU LEI</span>' : '');
        }).catch(function () {
          var alvo = $('st-' + pr.id); if (alvo) alvo.textContent = 'situação indisponível';
        }).then(proximo);
      }
      Promise.all([proximo(), proximo()]).then(function () {
        var l = $('ficha-leis');
        var n = recentes.length;
        if (l) l.innerHTML = viraramLei
          ? '<strong style="color:var(--azul)">' + viraramLei + ' de ' + n + (viraramLei === 1 ? ' virou lei.' : ' viraram lei.') + '</strong>'
          : 'Nenhum dos ' + n + ' mais recentes virou lei até agora.';
      });
    }).catch(function () {
      var el = $('ficha-proj'); if (el) el.innerHTML = '<p style="color:var(--texto-suave)">Projetos indisponíveis no momento.</p>';
    });
  }

  function detalheSenador(p) {
    var corpo = $('ficha-corpo');
    buscarJSON(API_SENADO + '/senador/' + p.apiId + '.json').then(function (j) {
      var b = get(j, 'DetalheParlamentar.Parlamentar.DadosBasicosParlamentar') || {};
      if (b.DataNascimento) $('ficha-idade').textContent = idade(b.DataNascimento) + ' anos';
      corpo.innerHTML =
        blocoPessoal([
          ['Nascimento', b.DataNascimento ? dataBR(b.DataNascimento) : ''],
          ['Naturalidade', b.Naturalidade ? b.Naturalidade + (b.UfNaturalidade ? ' (' + b.UfNaturalidade + ')' : '') : ''],
          ['Participação', p.participacao],
          ['Mandato', p.mandatoInicio ? dataBR(p.mandatoInicio) + ' a ' + dataBR(p.mandatoFim) : ''],
          ['E-mail', p.email]
        ]) + linksSenador(p);
    }).catch(function () {
      corpo.innerHTML = blocoPessoal([['Participação', p.participacao], ['E-mail', p.email]]) + linksSenador(p);
      $('ficha-idade').textContent = '—';
    });
  }

  function linksSenador(p) {
    var pag = p.pagina || 'https://www25.senado.leg.br/web/senadores/senador/-/perfil/' + p.apiId;
    setTimeout(function () { carregarProjetosSenador(p); }, 0);
    return '<section class="proj"><h3>Projetos de autoria</h3><div id="ficha-proj-sen"><div class="carregando">Buscando projetos no Senado…</div></div></section>' +
      '<section><h3>Links oficiais</h3><div class="links-oficiais"><a class="btn btn--escuro" href="' + esc(pag) + '" target="_blank" rel="noopener">Página no Senado</a></div></section>';
  }
  function carregarProjetosSenador(p) {
    buscarJSON(API_SENADO + '/senador/' + p.apiId + '/autorias.json').then(function (j) {
      var l = get(j, 'AutoriaParlamentar.Parlamentar.Autorias.Autoria') || [];
      if (!Array.isArray(l)) l = [l];
      var itens = l.map(function (a) { return a.Materia || a; }).filter(function (m) { return m && m.IdentificacaoMateria; })
        .sort(function (a, b) { return (b.IdentificacaoMateria.AnoMateria || 0) - (a.IdentificacaoMateria.AnoMateria || 0) || (b.IdentificacaoMateria.CodigoMateria || 0) - (a.IdentificacaoMateria.CodigoMateria || 0); });
      var el = $('ficha-proj-sen'); if (!el) return;
      if (!itens.length) throw new Error('vazio');
      el.innerHTML = '<p style="margin:0 0 6px;color:var(--texto-suave);font-size:14px"><strong style="color:var(--texto)">' + itens.length + '</strong> proposições de autoria. As 12 mais recentes:</p><ul>' +
        itens.slice(0, 12).map(function (m) {
          var id = m.IdentificacaoMateria;
          return '<li><span class="proj__sigla">' + esc((id.SiglaSubtipoMateria || '') + ' ' + (id.NumeroMateria || '') + '/' + (id.AnoMateria || '')) + '</span><span class="proj__texto"><a href="https://www25.senado.leg.br/web/atividade/materias/-/materia/' + esc(id.CodigoMateria) + '" target="_blank" rel="noopener">' + esc(m.EmentaMateria || 'Ver proposição') + '</a></span></li>';
        }).join('') + '</ul>';
    }).catch(function () {
      var el = $('ficha-proj-sen');
      if (el) el.innerHTML = '<p style="margin:0;font-size:15px;color:var(--texto-forte)">A lista de projetos está disponível na página oficial do senador.</p>';
    });
  }

  // Ficha de quem não tem API própria: resumo da Wikipédia + dados do painel + links oficiais
  function detalheAutoridade(p) {
    var corpo = $('ficha-corpo');
    var dados = blocoPessoal([
      ['Nome completo', p.nomeCivil !== p.nome ? p.nomeCivil : ''],
      ['Nascimento', p.nascimento ? dataBR(p.nascimento) : ''],
      ['Naturalidade', p.naturalidade],
      ['Situação', p.situacao],
      ['Em exercício hoje', p.tipo === 'governador' ? (p.em_exercicio ? p.em_exercicio + ' (' + p.partido_exercicio + ')' : 'a confirmar') : '']
    ]);
    var links = '<section><h3>Atuação e links oficiais</h3><p style="margin:0 0 12px;font-size:15px;color:var(--texto-forte)">' +
      ({ executivo: 'Decretos, projetos enviados e agenda ficam no portal do Planalto.', mesa: 'Pauta, votações e atos da Mesa ficam no site da Casa.', ministro: 'Ações e programas do ministério ficam no portal gov.br.', stf: 'Votos, decisões e processos ficam no portal do STF.', governador: 'Leis sancionadas e agenda ficam no portal do governo do estado.' }[p.tipo] || '') +
      '</p><div class="links-oficiais">' + (p.link ? '<a class="btn btn--escuro" href="' + esc(p.link) + '" target="_blank" rel="noopener">Página oficial</a>' : '') +
      (p.tipo === 'governador' ? '<a class="btn btn--contorno" href="busca?tag=' + encodeURIComponent('Governo ' + p.uf) + '">Notícias da PRAXIS sobre ' + esc(p.uf) + '</a>' : '') + '</div></section>';
    corpo.innerHTML = dados + '<section id="ficha-wiki"><div class="carregando">Buscando biografia…</div></section>' + links;
    var titulo = p.tipo === 'governador' ? (p.em_exercicio ? p.wiki_exercicio : p.wiki_eleito) : (p.wiki || p.nomeCivil);
    resumoWiki(titulo).then(function (j) {
      var el = $('ficha-wiki'); if (!el) return;
      if (!j || !j.extract) { el.innerHTML = ''; return; }
      if (j.description && $('ficha-civil') && !$('ficha-civil').textContent) $('ficha-civil').textContent = j.description;
      el.innerHTML = '<h3>Quem é</h3><p style="margin:0;font-size:15px;line-height:1.6">' + esc(j.extract) + '</p>' +
        '<p style="font-size:12px;color:var(--texto-suave);margin:6px 0 0">Resumo: <a href="' + esc(get(j, 'content_urls.desktop.page') || '#') + '" target="_blank" rel="noopener" style="text-decoration:underline">Wikipédia</a> (CC BY-SA)</p>';
      var nasc = j.extract.match(/\((?:[^)]*?)(\d{1,2}) de (janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})/);
      if (!p.nascimento && nasc && $('ficha-idade')) {
        var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        var iso = nasc[3] + '-' + ('0' + (meses.indexOf(nasc[2]) + 1)).slice(-2) + '-' + ('0' + nasc[1]).slice(-2);
        $('ficha-idade').textContent = idade(iso) + ' anos';
      } else if (!p.nascimento && $('ficha-idade')) $('ficha-idade').textContent = '—';
    });
    if (p.nascimento) $('ficha-idade').textContent = idade(p.nascimento) + ' anos';
  }

  /* ---------- eventos ---------- */
  function ligarEventos() {
    document.querySelectorAll('.aba').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.aba').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        estado.cargo = b.getAttribute('data-cargo'); estado.mostrando = POR_PAGINA; desenhar();
      });
    });
    document.querySelectorAll('.regiao').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.regiao').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        estado.regiao = b.getAttribute('data-regiao'); estado.uf = ''; $('f-uf').value = '';
        estado.mostrando = POR_PAGINA; desenhar();
      });
    });
    var timer;
    $('f-busca').addEventListener('input', function (e) {
      clearTimeout(timer);
      timer = setTimeout(function () { estado.busca = e.target.value; estado.mostrando = POR_PAGINA; desenhar(); }, 150);
    });
    $('f-uf').addEventListener('change', function (e) { estado.uf = e.target.value; estado.mostrando = POR_PAGINA; desenhar(); });
    $('f-partido').addEventListener('change', function (e) { estado.partido = e.target.value; estado.mostrando = POR_PAGINA; desenhar(); });
    $('f-ordem').addEventListener('change', function (e) { estado.ordem = e.target.value; desenhar(); });
    $('ver-mais').addEventListener('click', function () { estado.mostrando += POR_PAGINA; desenhar(); });
    $('limpar').addEventListener('click', function () {
      estado.regiao = estado.uf = estado.partido = estado.busca = ''; estado.mostrando = POR_PAGINA;
      $('f-busca').value = ''; $('f-uf').value = ''; $('f-partido').value = '';
      document.querySelectorAll('.regiao').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-regiao') === '' ? 'true' : 'false'); });
      desenhar();
    });
    $('barra-partidos').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-partido]'); if (!b) return;
      estado.partido = b.getAttribute('data-partido'); $('f-partido').value = estado.partido; estado.mostrando = POR_PAGINA; desenhar();
    });
    $('mapa').addEventListener('click', function (e) {
      var b = e.target.closest('.mapa__uf'); if (!b) return;
      var uf = b.getAttribute('data-uf');
      estado.uf = estado.uf === uf ? '' : uf; estado.regiao = '';
      $('f-uf').value = estado.uf;
      document.querySelectorAll('.regiao').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-regiao') === '' ? 'true' : 'false'); });
      estado.mostrando = POR_PAGINA; desenhar();
      $('contagem').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('lista').addEventListener('click', function (e) {
      var b = e.target.closest('.pessoa'); if (b) abrirFicha(b.getAttribute('data-id'));
    });
    $('ficha-fechar').addEventListener('click', fecharFicha);
    $('ficha').addEventListener('click', function (e) { if (e.target === $('ficha')) fecharFicha(); });
    $('ficha').addEventListener('cancel', function () { history.replaceState(null, '', location.pathname + location.search); });
  }

  /* ---------- início ---------- */
  function iniciar() {
    ligarEventos();
    var params = new URLSearchParams(location.search);
    if (params.get('cargo')) estado.cargo = params.get('cargo');
    if (params.get('uf')) estado.uf = params.get('uf').toUpperCase();
    document.querySelectorAll('.aba').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-cargo') === estado.cargo ? 'true' : 'false'); });
    $('status').innerHTML = '<div class="carregando">Carregando deputados, senadores, governadores, ministros e STF direto das fontes…</div>';

    var avisos = [];
    Promise.all([
      carregarDeputados().catch(function () { avisos.push('Câmara dos Deputados'); return []; }),
      carregarSenadores().catch(function () { avisos.push('Senado Federal'); return []; }),
      carregarVotos(),
      carregarAutoridades().catch(function () { avisos.push('lista de autoridades'); return []; })
    ]).then(function (r) {
      estado.votos = r[2] || {};
      estado.pessoas = r[3].concat(r[1], r[0]);
      $('status').innerHTML = avisos.length
        ? '<div class="erro">Não conseguimos carregar: ' + avisos.join(' e ') + '. Recarregue a página em alguns instantes.</div>'
        : estado.copia.length ? '<div class="aviso">A fonte oficial está lenta agora. Mostrando a cópia salva de ' + estado.copia.join(' e ') + '.</div>' : '';
      preencherSelects(); atualizarContadores(); desenhar();
      var alvo = location.hash.replace('#', '');
      if (alvo) abrirFicha(alvo);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  // exposto só para testes automatizados
  window.__politicos = { normalizar: normalizar, idade: idade, filtrar: filtrar, estado: estado, REGIAO: REGIAO };
})();
