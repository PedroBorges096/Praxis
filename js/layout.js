/* =========================================================
   CABEÇALHO, MENU E RODAPÉ — iguais em todas as páginas.
   Nome, assinatura, redes, Pix e bio são editados pelo PAINEL
   (Configurações do site). O menu e o rodapé ficam aqui embaixo.
   ========================================================= */
var PORTAL = {
  nome: 'PRAXIS',
  nomeDestaque: '',                 // opcional: parte do nome em vermelho
  slogan: 'Análise Política e Conjuntura com Sthephanye Silva',
  dona: 'Sthephanye Silva',
  linkApoio: './#apoie',
  redes: { instagram: '', youtube: '', x: '', tiktok: '', spotify: '' },
  menu: [
    { id: 'inicio', texto: 'Início', link: './' },
    { id: 'Política Nacional', texto: 'Política Nacional', link: 'busca?categoria=Pol%C3%ADtica%20Nacional' },
    { id: 'Economia & Trabalho', texto: 'Economia & Trabalho', link: 'busca?categoria=Economia%20%26%20Trabalho' },
    { id: 'Geopolítica & Sul Global', texto: 'Geopolítica & Sul Global', link: 'busca?categoria=Geopol%C3%ADtica%20%26%20Sul%20Global' },
    { id: 'politicos', texto: 'Quem Governa', link: 'politicos' },
    { id: 'eleicoes', texto: 'Eleições 2026', link: 'eleicoes' },
    { id: 'podcast', texto: 'Podcast', link: 'podcast' },
    { id: 'ferramentas', texto: 'Ferramentas', link: 'calculadora' },
    { id: 'Colunas & Opinião', texto: 'Colunas & Opinião', link: 'busca?categoria=Colunas%20%26%20Opini%C3%A3o' },
    { id: 'Meio Ambiente & Clima', texto: 'Meio Ambiente & Clima', link: 'busca?categoria=Meio%20Ambiente%20%26%20Clima' }
  ],
  rodape: [
    { texto: 'Quem somos', link: 'quem-somos' },
    { texto: 'Linha editorial', link: 'linha-editorial' },
    { texto: 'Política de privacidade', link: 'privacidade' },
    { texto: 'Contato', link: 'contato' },
    { texto: 'RSS', link: 'feed.xml' },
    { texto: 'Painel', link: 'admin/' }
  ]
};

// Aplica o tema e o tamanho da letra antes de desenhar (evita "piscar")
(function () {
  try {
    var t = localStorage.getItem('praxis-tema');
    if (!t && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) t = 'escuro';
    if (t) document.documentElement.setAttribute('data-tema', t);
    var f = localStorage.getItem('praxis-fonte');
    if (f) document.documentElement.style.setProperty('--escala', f);
  } catch (e) { /* navegador sem armazenamento: segue o padrão */ }
})();

(function () {
  'use strict';
  // Junta o que foi editado no painel (js/config.js) com o padrão acima
  var c = window.PORTAL_CONFIG || {};
  if (c.nome) PORTAL.nome = c.nome;
  if (typeof c.nome_destaque === 'string') PORTAL.nomeDestaque = c.nome_destaque;
  if (c.slogan) PORTAL.slogan = c.slogan;
  if (c.dona) PORTAL.dona = c.dona;
  if (c.link_apoio) PORTAL.linkApoio = c.link_apoio;
  if (c.redes) Object.keys(c.redes).forEach(function (k) { if (c.redes[k]) PORTAL.redes[k] = c.redes[k]; });

  var base = document.body.getAttribute('data-base') || '';
  var link = function (l) { return /^(https?:|#|mailto:)/.test(l) ? l : base + l; };
  var esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]; }); };

  var icones = {
    instagram: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/></svg>',
    youtube: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/></svg>',
    x: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4l16 16M20 4L4 20"/></svg>',
    tiktok: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3v11a4 4 0 1 1-4-4"/><path d="M14 3c.5 3 2.5 5 5.5 5"/></svg>',
    spotify: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.6c2.5-.7 5.2-.4 7.3.8M8.6 15.4c2-.5 4-.3 5.6.6"/></svg>',
    busca: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    lua: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>'
  };
  var nomesRedes = { instagram: 'Instagram', youtube: 'YouTube', x: 'X (Twitter)', tiktok: 'TikTok', spotify: 'Spotify' };
  var pagina = document.body.getAttribute('data-pagina');
  function temApoio() { return !!(c.chave_pix || c.link_apoio); }
  function nomeLogo() { return esc(PORTAL.nome) + (PORTAL.nomeDestaque ? ' <span>' + esc(PORTAL.nomeDestaque) + '</span>' : ''); }

  function montarTopo() {
    var redes = Object.keys(PORTAL.redes).filter(function (k) { return PORTAL.redes[k]; }).map(function (k) {
      return '<a class="icone-social" href="' + esc(PORTAL.redes[k]) + '" target="_blank" rel="noopener" aria-label="' + nomesRedes[k] + '">' + icones[k] + '</a>';
    }).join('');
    var menu = PORTAL.menu.map(function (m) {
      return '<a href="' + esc(link(m.link)) + '"' + (m.id === pagina ? ' aria-current="page"' : '') + '>' + esc(m.texto) + '</a>';
    }).join('');
    return '' +
      '<a class="pular" href="#conteudo">Pular para o conteúdo</a>' +
      '<div class="ticker" role="region" aria-label="Cotações ao vivo">' +
        '<div class="ticker__tag">AO VIVO</div>' +
        '<div class="ticker__trilho"><div class="ticker__fita" id="ticker-fita"><span class="ticker__item"><span class="v">Carregando cotações…</span></span></div></div>' +
        '<div class="ticker__hora" id="ticker-hora"></div>' +
      '</div>' +
      '<header class="container topo">' +
        '<div class="topo__data"><b id="data-hoje"></b>Edição atualizada em tempo real</div>' +
        '<a class="logo" href="' + link('./') + '"><div class="logo__nome">' + esc(PORTAL.nome) + ' <span>' + esc(PORTAL.nomeDestaque) + '</span></div><div class="logo__slogan">' + esc(PORTAL.slogan) + '</div></a>' +
        '<div class="topo__acoes">' + redes +
          (temApoio() ? '<button type="button" class="btn btn--bordo abre-apoio">Apoie a PRAXIS</button>' : '') +
        '</div>' +
      '</header>' +
      '<nav class="menu" aria-label="Menu principal"><div class="container menu__barra">' +
        '<div class="menu__lista">' + menu + '</div>' +
        '<div class="menu__ferramentas">' +
          '<a class="icone-btn" href="' + link('busca') + '" aria-label="Buscar notícias">' + icones.busca + '</a>' +
          '<button type="button" class="icone-btn" id="fonte-menos" aria-label="Diminuir letra">A−</button>' +
          '<button type="button" class="icone-btn" id="fonte-mais" aria-label="Aumentar letra">A+</button>' +
          '<button type="button" class="icone-btn" id="tema" aria-label="Alternar modo escuro">' + icones.lua + '</button>' +
        '</div>' +
      '</div></nav><div id="conteudo"></div>';
  }

  function montarRodape() {
    return '<footer class="rodape"><div class="container">' +
      '<div class="rodape__logo">' + nomeLogo() + '<div class="rodape__slogan">' + esc(PORTAL.slogan) + '</div></div>' +
      '<nav aria-label="Institucional" class="rodape__links">' +
      PORTAL.rodape.map(function (l) { return '<a href="' + esc(link(l.link)) + '">' + esc(l.texto) + '</a>'; }).join('') +
      '<button type="button" class="rodape__instalar" id="instalar" hidden>📱 Instalar o app</button>' +
      '</nav><div>© ' + new Date().getFullYear() + ' · ' + esc((PORTAL.nome + ' ' + PORTAL.nomeDestaque).trim()) + ' · Um jornal de ' + esc(PORTAL.dona) + '</div></div></footer>';
  }

  var topo = document.getElementById('topo');
  var rodape = document.getElementById('rodape');
  if (topo) topo.innerHTML = montarTopo();
  if (rodape) rodape.innerHTML = montarRodape();

  /* ---------- Card "Apoie" com a chave Pix (editável no painel) ---------- */
  function montarApoio() {
    var d = document.createElement('dialog');
    d.className = 'apoio-card'; d.id = 'apoio-card'; d.setAttribute('aria-labelledby', 'apoio-titulo');
    var foto = c.foto_dona ? '<img class="apoio-card__foto" src="' + esc(link(String(c.foto_dona).replace(/^\//, ''))) + '" alt="">' : '';
    d.innerHTML = '<button type="button" class="apoio-card__fechar" aria-label="Fechar">×</button>' + foto +
      '<div class="eyebrow">Jornalismo independente</div>' +
      '<h2 id="apoio-titulo">Apoie a ' + esc(PORTAL.nome) + '</h2>' +
      '<p>' + esc(c.texto_apoio || 'A PRAXIS é independente e feita com o apoio de quem lê. Qualquer valor ajuda a manter o jornalismo de análise no ar.') + '</p>' +
      (c.chave_pix ? '<div class="apoio-card__pix"><span>Chave Pix (e-mail)</span><strong id="apoio-chave">' + esc(c.chave_pix) + '</strong>' +
        '<button type="button" class="btn btn--bordo" id="apoio-copiar">Copiar chave Pix</button></div>' +
        '<p class="apoio-card__passo">Abra o app do seu banco → Pix → <b>Pagar com chave</b> → cole a chave → escolha o valor.</p>' : '') +
      (c.link_apoio ? '<a class="btn btn--contorno" href="' + esc(c.link_apoio) + '" target="_blank" rel="noopener">Apoio mensal</a>' : '') +
      '<p class="apoio-card__dona">' + esc(PORTAL.dona) + ' agradece 💛</p>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.classList.contains('apoio-card__fechar')) d.close();
      if (e.target.id === 'apoio-copiar') {
        var b = e.target, ok = function () { b.textContent = '✔ Chave copiada!'; setTimeout(function () { b.textContent = 'Copiar chave Pix'; }, 2200); };
        if (navigator.clipboard) navigator.clipboard.writeText(c.chave_pix).then(ok, function () { prompt('Copie a chave Pix:', c.chave_pix); });
        else prompt('Copie a chave Pix:', c.chave_pix);
      }
    });
    return d;
  }
  document.addEventListener('click', function (e) {
    var gatilho = e.target.closest && e.target.closest('.abre-apoio, a[href$="#apoie"]');
    if (!gatilho || !temApoio()) return;
    e.preventDefault();
    var d = document.getElementById('apoio-card') || montarApoio();
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  });

  /* ---------- Aviso de cookies (LGPD) ---------- */
  var escolha = null;
  try { escolha = localStorage.getItem('praxis-cookies'); } catch (e) { /* ok */ }
  window.PRAXIS_COOKIES = escolha; // "aceito" libera anúncios (AdSense); "recusado" não carrega
  if (!escolha && pagina !== 'privacidade') {
    var av = document.createElement('div');
    av.className = 'cookies'; av.setAttribute('role', 'region'); av.setAttribute('aria-label', 'Aviso de cookies');
    av.innerHTML = '<p>Usamos cookies apenas para exibir anúncios que ajudam a manter a ' + esc(PORTAL.nome) + '. Suas preferências de leitura ficam só no seu aparelho. <a href="' + link('privacidade') + '">Saiba mais</a>.</p>' +
      '<div><button type="button" class="btn btn--contorno" data-c="recusado">Recusar</button><button type="button" class="btn btn--bordo" data-c="aceito">Aceitar</button></div>';
    document.body.appendChild(av);
    av.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-c'); if (!v) return;
      try { localStorage.setItem('praxis-cookies', v); } catch (er) { /* ok */ }
      window.PRAXIS_COOKIES = v; av.remove();
    });
  }

  // Modo escuro e tamanho da letra
  function salvar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignora */ } }
  var tema = document.getElementById('tema');
  if (tema) tema.addEventListener('click', function () {
    var escuro = document.documentElement.getAttribute('data-tema') === 'escuro';
    document.documentElement.setAttribute('data-tema', escuro ? 'claro' : 'escuro');
    salvar('praxis-tema', escuro ? 'claro' : 'escuro');
  });
  function mudarFonte(passo) {
    var atual = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--escala')) || 1;
    var nova = Math.min(1.4, Math.max(0.9, Math.round((atual + passo) * 10) / 10));
    document.documentElement.style.setProperty('--escala', nova);
    salvar('praxis-fonte', nova);
    var av = document.querySelector('.aviso-fonte');
    if (!av) { av = document.createElement('div'); av.className = 'aviso-fonte'; av.setAttribute('role', 'status'); document.body.appendChild(av); }
    av.textContent = 'Tamanho da letra: ' + Math.round(nova * 100) + '%';
    clearTimeout(mudarFonte.t); mudarFonte.t = setTimeout(function () { av.remove(); }, 1600);
  }
  var menos = document.getElementById('fonte-menos'), mais = document.getElementById('fonte-mais');
  if (menos) menos.addEventListener('click', function () { mudarFonte(-0.1); });
  if (mais) mais.addEventListener('click', function () { mudarFonte(0.1); });

  // App instalável (PWA)
  if ('serviceWorker' in navigator && /^https:|localhost/.test(location.href)) {
    navigator.serviceWorker.register(base + 'sw.js').catch(function () { /* sem app offline */ });
  }
  var pedido;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); pedido = e;
    var b = document.getElementById('instalar'); if (b) b.hidden = false;
  });
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'instalar' && pedido) { pedido.prompt(); pedido = null; e.target.hidden = true; }
  });
})();
