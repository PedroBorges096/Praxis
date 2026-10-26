/* =========================================================
   HOME: monta a capa a partir do que foi publicado no painel
   (data/noticias.json, data/podcast.json, data/colunistas.json)
   ========================================================= */
(function () {
  'use strict';
  var R = window.Render;
  var cfg = window.PORTAL_CONFIG || {};
  R.cdn = !!cfg.cdn;
  var porSlug = {};
  function $(id) { return document.getElementById(id); }
  function json(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  // só aparecem notícias cuja hora de publicação já chegou (agendamento)
  function noAr(lista) { var agora = Date.now(); return lista.filter(function (n) { return new Date(n.data).getTime() <= agora; }); }

  function hora(n) {
    var d = new Date(n.data), hoje = new Date();
    return d.toDateString() === hoje.toDateString()
      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  function link(n, conteudo, classe) {
    return '<a class="abre-noticia ' + (classe || '') + '" href="' + R.esc(n.url) + '" data-slug="' + R.esc(n.slug) + '">' + conteudo + '</a>';
  }
  function rotulo(n) { return '<div class="rotulo"><span class="selo ' + R.seloClasse(n.selo) + '">' + R.esc(n.selo) + '</span>' + R.esc(n.categoria) + '</div>'; }

  function manchete(n) {
    var midia = n.imagem ? R.img(n.imagem, n.legenda_foto || n.titulo, 1600, 800, n.posicao_foto, ' fetchpriority="high"').replace(' loading="lazy"', '')
      : '<div class="manchete__vazia">' + R.esc(n.categoria) + '</div>';
    return '<article class="manchete">' + link(n, midia, 'manchete__midia') + rotulo(n) +
      '<h1>' + link(n, R.esc(n.titulo)) + '</h1>' +
      (n.linha_fina ? '<p>' + R.esc(n.linha_fina) + '</p>' : '') +
      '<div class="leve" style="font-size:14px">Por <strong>' + R.esc(n.autora) + '</strong> · ' + n.tempo + ' min de leitura' + (R.youtubeId(n.video) ? ' · 🎬 com vídeo' : '') + '</div></article>';
  }
  function cardFoco(n) {
    var midia = n.imagem ? R.img(n.imagem, n.titulo, 900, 600, n.posicao_foto) : '<div class="materia__vazia">' + R.esc((n.selo || '?').charAt(0)) + '</div>';
    return '<article class="materia">' + link(n, midia, 'materia__midia') + rotulo(n) +
      '<h3>' + link(n, R.esc(n.titulo)) + '</h3>' + (n.linha_fina ? '<p>' + R.esc(n.linha_fina) + '</p>' : '') + '</article>';
  }

  function desenharNoticias(lista) {
    lista = noAr(lista);
    lista.forEach(function (n) { porSlug[n.slug] = n; });
    if (!lista.length) { $('manchete').innerHTML = '<p>Nenhuma notícia publicada ainda. Publique a primeira pelo painel (seusite/admin).</p>'; return; }
    var normais = lista.filter(function (n) { return n.selo !== 'Explicador'; });
    var capa = normais.filter(function (n) { return n.destaque_capa; })[0] || normais[0] || lista[0];
    $('manchete').innerHTML = manchete(capa);
    var foco = normais.filter(function (n) { return n !== capa; }).slice(0, 3);
    $('em-foco').innerHTML = foco.map(cardFoco).join('') || '<p class="leve">Publique mais notícias para preencher este bloco.</p>';
    $('lista-ultimas').innerHTML = lista.slice(0, 8).map(function (n) {
      return '<li><time datetime="' + R.esc(n.dataISO || n.data) + '">' + hora(n) + '</time><div><small>' + R.esc(n.categoria) + '</small>' + link(n, R.esc(n.titulo)) + '</div></li>';
    }).join('');
    var exp = lista.filter(function (n) { return n.selo === 'Explicador'; }).slice(0, 4);
    if (exp.length) {
      $('bloco-explica').hidden = false;
      $('explicadores').innerHTML = exp.map(function (n) {
        return '<a class="abre-noticia" href="' + R.esc(n.url) + '" data-slug="' + R.esc(n.slug) + '"><span class="explica__q">?</span><strong>' + R.esc(n.titulo) + '</strong><small>' + n.tempo + ' min de leitura</small></a>';
      }).join('');
    }
    var alvo = (location.hash.match(/^#ler=(.+)$/) || [])[1];
    if (alvo && porSlug[decodeURIComponent(alvo)]) abrir(decodeURIComponent(alvo));
  }

  function desenharColunistas(lista) {
    if (!lista.length) return;
    $('bloco-colunas').hidden = false;
    $('colunistas').innerHTML = lista.map(function (c) {
      var ini = (c.nome || '?').replace(/[\[\]]/g, '').split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('');
      var foto = c.foto ? '<span class="colunista__foto">' + R.img(c.foto, c.nome, 160, 160) + '</span>' : '<span class="colunista__foto">' + R.esc(ini) + '</span>';
      return '<article class="cartao colunista">' + foto + '<div><strong>' + R.esc(c.nome) + '</strong><div class="leve">' + R.esc(c.funcao) + '</div></div>' +
        '<h3>' + (c.link ? '<a href="' + R.esc(c.link.replace(/^\//, '')) + '">“' + R.esc(c.titulo_artigo) + '”</a>' : '“' + R.esc(c.titulo_artigo) + '”') + '</h3></article>';
    }).join('');
  }

  function desenharPodcast(lista) {
    var ep = lista[0]; if (!ep) return;
    var capa = ep.capa ? R.img(ep.capa, 'Capa do episódio', 280, 280) : '<div class="pod-capa-vazia">PRAXIS<br>Podcast</div>';
    var el = $('podcast-chamada');
    el.hidden = false;
    el.innerHTML = capa + '<div style="flex:1 1 300px"><div class="eyebrow" style="color:#E8A3AD">Podcast · episódio ' + R.esc(ep.numero) + '</div>' +
      '<h2 id="pod-titulo">' + R.esc(ep.titulo) + '</h2><p>' + R.esc(ep.descricao) + '</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn btn--bordo" href="podcast#ep-' + R.esc(ep.numero) + '">🎧 Ouvir</a><a class="btn" style="border-color:#4A5568;color:#fff" href="podcast#ep-' + R.esc(ep.numero) + '-video">🎬 Assistir</a></div></div>';
  }

  function desenharConfig() {
    if (cfg.dona) $('quem-faz-titulo').textContent = cfg.dona;
    if (cfg.foto_dona) { $('foto-dona').src = cfg.foto_dona.replace(/^\//, ''); }
    $('foto-dona').alt = 'Foto de ' + (cfg.dona || 'Sthephanye Silva');
    $('bio-dona').textContent = cfg.bio || '';
    var redes = cfg.redes || {};
    $('redes-dona').innerHTML = Object.keys(redes).filter(function (k) { return redes[k]; }).map(function (k) {
      return '<a class="btn btn--contorno" href="' + R.esc(redes[k]) + '" target="_blank" rel="noopener">' + R.esc(k.charAt(0).toUpperCase() + k.slice(1)) + '</a>';
    }).join('');
    if (cfg.newsletter_action) $('form-news').action = cfg.newsletter_action;
    $('link-apoio').hidden = !(cfg.chave_pix || cfg.link_apoio);
    if (cfg.chave_pix) {
      $('pix').hidden = false; $('pix-chave').textContent = cfg.chave_pix;
      $('pix-copiar').addEventListener('click', function () {
        var b = this;
        (navigator.clipboard ? navigator.clipboard.writeText(cfg.chave_pix) : Promise.reject()).then(function () { b.textContent = '✔ Copiada'; }, function () { prompt('Copie a chave Pix:', cfg.chave_pix); });
      });
    }
  }

  /* ---------- Caixa de leitura rápida ---------- */
  function abrir(slug) {
    var n = porSlug[slug]; if (!n) return false;
    $('leitura-conteudo').innerHTML = R.modal(n);
    var d = $('leitura');
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
    d.scrollTop = 0;
    history.replaceState(null, '', '#ler=' + encodeURIComponent(slug));
    return true;
  }
  function fechar() {
    var d = $('leitura');
    if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); }
    $('leitura-conteudo').innerHTML = ''; // para o vídeo
    history.replaceState(null, '', location.pathname + location.search);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.abre-noticia');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // Ctrl+clique abre a página completa
    if (abrir(a.getAttribute('data-slug'))) e.preventDefault();
  });
  $('leitura-fechar').addEventListener('click', fechar);
  $('leitura').addEventListener('click', function (e) { if (e.target === $('leitura')) fechar(); });
  $('leitura').addEventListener('cancel', function (e) { e.preventDefault(); fechar(); });

  /* ---------- Início ---------- */
  desenharConfig();
  json('data/noticias.json').then(desenharNoticias).catch(function () {
    $('manchete').innerHTML = '';
    $('aviso-dados').innerHTML = '<div class="aviso">As notícias não carregaram. Se você abriu o arquivo direto no computador, rode <code>npm run dev</code> e acesse http://localhost:8000 (veja o LEIA-ME).</div>';
  });
  json('data/colunistas.json').then(desenharColunistas).catch(function () {});
  json('data/podcast.json').then(function (l) { desenharPodcast(noAr(l)); }).catch(function () {});

  window.__home = { abrir: abrir, fechar: fechar };
})();
