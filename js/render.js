/* =========================================================
   RENDERIZAÇÃO DAS NOTÍCIAS
   Usado em dois lugares, com o mesmo resultado:
   - no build (Node), para gerar a página completa de cada notícia (bom para o Google);
   - no navegador, para a caixa de leitura rápida da home.
   Não precisa editar este arquivo.
   ========================================================= */
(function (raiz) {
  'use strict';
  var R = { cdn: false };

  R.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Imagem otimizada: no Netlify, passa pelo Image CDN (redimensiona e converte para WebP)
  R.imgUrl = function (src, w, h, pos) {
    if (!src) return '';
    if (!R.cdn) return src;
    return '/.netlify/images?url=' + encodeURIComponent(src) + '&w=' + w + (h ? '&h=' + h + '&fit=cover&position=' + (pos || 'center') : '') + '&fm=webp&q=75';
  };
  R.img = function (src, alt, w, h, pos, extra) {
    if (!src) return '';
    var srcset = R.cdn ? ' srcset="' + R.imgUrl(src, Math.round(w / 2), h ? Math.round(h / 2) : 0, pos) + ' ' + Math.round(w / 2) + 'w, ' + R.imgUrl(src, w, h, pos) + ' ' + w + 'w" sizes="(max-width: 700px) 100vw, ' + w + 'px"' : '';
    return '<img src="' + R.esc(R.imgUrl(src, w, h, pos)) + '"' + srcset + ' alt="' + R.esc(alt || '') + '" loading="lazy" decoding="async" style="object-position:' + (pos || 'center') + '"' + (extra || '') + '>';
  };

  R.youtubeId = function (url) {
    var m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    return m ? m[1] : '';
  };

  R.dataBR = function (iso, comHora) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var o = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' };
    if (comHora) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return d.toLocaleString('pt-BR', o).replace(',', ' às');
  };

  R.seloClasse = function (selo) {
    return { 'Reportagem': 'selo--reportagem', 'Análise': 'selo--analise', 'Opinião': 'selo--opiniao', 'Explicador': 'selo--explicador' }[selo] || 'selo--reportagem';
  };

  R.midia = function (n, larg) {
    var id = R.youtubeId(n.video);
    if (id) {
      return '<div class="nt-video"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '" title="' + R.esc(n.titulo) + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    }
    if (n.imagem) {
      var leg = [n.legenda_foto, n.credito_foto].filter(Boolean).map(R.esc).join(' · ');
      return '<figure class="nt-foto">' + R.img(n.imagem, n.legenda_foto || n.titulo, larg || 1600, Math.round((larg || 1600) / 2), n.posicao_foto) +
        (leg ? '<figcaption>' + leg + '</figcaption>' : '') + '</figure>';
    }
    return '';
  };

  R.cabecalho = function (n, tag) {
    tag = tag || 'h1';
    return '<div class="nt-rotulo"><span class="selo ' + R.seloClasse(n.selo) + '">' + R.esc(n.selo) + '</span>' + R.esc(n.categoria) + '</div>' +
      '<' + tag + ' class="nt-titulo">' + R.esc(n.titulo) + '</' + tag + '>' +
      (n.linha_fina ? '<p class="nt-linha-fina">' + R.esc(n.linha_fina) + '</p>' : '') +
      '<div class="nt-meta">Por <strong>' + R.esc(n.autora) + '</strong> · ' + R.dataBR(n.data, true) + ' · ' + n.tempo + ' min de leitura' +
      (n.checado_em ? ' · <span class="nt-checado" title="Fatos conferidos pela redação">✅ Checado em ' + R.dataBR(n.checado_em) + '</span>' : '') + '</div>';
  };

  R.resumo30 = function (n) {
    var itens = (n.em_30_segundos || []).map(function (i) { return typeof i === 'string' ? i : i && i.item; }).filter(Boolean);
    if (!itens.length) return '';
    return '<section class="nt-30s"><h2>⏱ Em 30 segundos</h2><ul>' + itens.map(function (i) { return '<li>' + R.esc(i) + '</li>'; }).join('') + '</ul></section>';
  };

  R.blocos = function (n) {
    var b = [
      ['fatos', '📌 Fatos', 'O que é verificável', n.fatosHtml],
      ['analise', '🔍 Análise', 'Interpretação com dados e contexto', n.analiseHtml],
      ['opiniao', '💬 Opinião', 'Posição da autora', n.opiniaoHtml]
    ].filter(function (x) { return x[3]; });
    var html = b.map(function (x) {
      return '<section class="nt-bloco nt-bloco--' + x[0] + '"><h2>' + x[1] + ' <small>' + x[2] + '</small></h2><div class="nt-texto">' + x[3] + '</div></section>';
    }).join('');
    if (n.oQueMudaHtml) html += '<section class="nt-bloco nt-bloco--muda"><h2>💡 O que muda para você</h2><div class="nt-texto">' + n.oQueMudaHtml + '</div></section>';
    return html;
  };

  R.linhaDoTempo = function (n) {
    var l = n.linha_do_tempo || [];
    if (!l.length) return '';
    return '<section class="nt-tempo"><h2>Linha do tempo</h2><ol>' + l.map(function (e) {
      return '<li><b>' + R.esc(e.quando) + '</b><span>' + R.esc(e.evento) + '</span></li>';
    }).join('') + '</ol></section>';
  };

  R.galeria = function (n) {
    var g = (n.galeria || []).filter(function (f) { return f && f.imagem; });
    if (!g.length) return '';
    return '<section class="nt-galeria"><h2>Galeria</h2><div class="nt-galeria__grade">' + g.map(function (f, i) {
      var leg = [f.legenda, f.credito].filter(Boolean).map(R.esc).join(' · ');
      return '<figure><button type="button" class="nt-galeria__abrir" data-foto="' + R.esc(f.imagem) + '" data-legenda="' + leg + '" aria-label="Ampliar foto ' + (i + 1) + '">' +
        R.img(f.imagem, f.legenda, 1200, 800) + '</button>' + (leg ? '<figcaption>' + leg + '</figcaption>' : '') + '</figure>';
    }).join('') + '</div></section>';
  };

  R.fontes = function (n) {
    var f = n.fontes || [];
    if (!f.length) return '';
    return '<section class="nt-fontes"><h2>Fontes</h2><ul>' + f.map(function (x) {
      return '<li>' + (x.url ? '<a href="' + R.esc(x.url) + '" target="_blank" rel="noopener">' + R.esc(x.nome) + ' ↗</a>' : R.esc(x.nome)) + '</li>';
    }).join('') + '</ul></section>';
  };

  R.tags = function (n, base) {
    var t = n.tags || [];
    if (!t.length) return '';
    return '<div class="nt-tags">' + t.map(function (x) {
      return '<a href="' + (base || '') + 'busca?tag=' + encodeURIComponent(x) + '">#' + R.esc(x) + '</a>';
    }).join('') + '</div>';
  };

  R.correcao = function (n) {
    return n.correcao ? '<aside class="nt-correcao"><strong>Correção:</strong> ' + R.esc(n.correcao) + '</aside>' : '';
  };

  // Caixa de leitura rápida (home)
  R.modal = function (n) {
    return '<article class="nt nt--modal">' + R.midia(n, 1200) +
      '<div class="nt-corpo">' + R.cabecalho(n, 'h2') + R.resumo30(n) + R.blocos(n) + R.linhaDoTempo(n) +
      '<div class="nt-acoes"><a class="btn btn--bordo" href="' + R.esc(n.url) + '">Ler matéria completa →</a>' +
      '<a class="btn btn--contorno" href="https://wa.me/?text=' + encodeURIComponent(n.titulo + ' ' + (n.urlAbsoluta || n.url)) + '" target="_blank" rel="noopener">Compartilhar no WhatsApp</a></div>' +
      '</div></article>';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = R; else raiz.Render = R;
})(this);
