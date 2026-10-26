#!/usr/bin/env node
/* =========================================================
   BUILD DO FORA DA BOLHA
   Roda sozinho no Netlify a cada publicação feita no painel.
   Lê a pasta content/ e gera:
   - data/noticias.json, data/podcast.json, data/colunistas.json, data/agendadas.json
   - noticia/<slug>.html (uma página por notícia, pronta para o Google e o WhatsApp)
   - js/config.js, sitemap.xml e feed.xml (RSS)
   Para testar no seu computador:  npm install  e depois  npm run build
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const R = require('../js/render.js');

const RAIZ = path.join(__dirname, '..');
const SITE_URL = (process.env.URL || process.env.SITE_URL || 'https://praxis-analise.netlify.app').replace(/\/$/, '');
const AGORA = process.env.AGORA ? new Date(process.env.AGORA) : new Date();
R.cdn = process.env.NETLIFY === 'true';

marked.setOptions({ gfm: true, breaks: true });
const md = (t) => (t && String(t).trim() ? marked.parse(String(t)) : '');
const lerPasta = (p) => {
  const dir = path.join(RAIZ, p);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return Object.assign({ slug: f.replace(/\.json$/, '') }, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); }
    catch (e) { console.warn('⚠️  Arquivo ignorado (JSON inválido):', p + '/' + f); return null; }
  }).filter(Boolean);
};
const escrever = (p, conteudo) => {
  const alvo = path.join(RAIZ, p);
  fs.mkdirSync(path.dirname(alvo), { recursive: true });
  fs.writeFileSync(alvo, conteudo);
};
const palavras = (...t) => t.join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const texto = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const lista = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',').map((s) => s.trim()) : []);

/* ---------- configurações ---------- */
let config = {};
try { config = JSON.parse(fs.readFileSync(path.join(RAIZ, 'content/config.json'), 'utf8')); } catch (e) { /* usa o padrão do layout.js */ }
config.cdn = R.cdn;
config.siteUrl = SITE_URL;
escrever('js/config.js', '/* Gerado automaticamente pelo build a partir do painel. Não edite à mão. */\nwindow.PORTAL_CONFIG = ' + JSON.stringify(config, null, 2) + ';\n');

/* ---------- notícias ---------- */
const todas = lerPasta('content/noticias').map((n) => {
  const x = Object.assign({}, n);
  x.tags = lista(n.tags);
  x.em_30_segundos = lista(n.em_30_segundos);
  x.fatosHtml = md(n.fatos); x.analiseHtml = md(n.analise); x.opiniaoHtml = md(n.opiniao);
  x.oQueMudaHtml = md(n.o_que_muda); x.corpoHtml = md(n.corpo);
  x.tempo = Math.max(1, Math.round(palavras(x.corpoHtml, x.fatosHtml, x.analiseHtml, x.opiniaoHtml, x.oQueMudaHtml) / 200));
  x.url = 'noticia/' + n.slug;
  x.urlAbsoluta = SITE_URL + '/' + x.url;
  x.dataISO = new Date(n.data || 0).toISOString();
  return x;
});
const publicadas = todas.filter((n) => new Date(n.data) <= AGORA).sort((a, b) => new Date(b.data) - new Date(a.data));
const agendadas = todas.filter((n) => new Date(n.data) > AGORA).map((n) => ({ slug: n.slug, data: n.dataISO }));
escrever('data/noticias.json', JSON.stringify(publicadas));
escrever('data/agendadas.json', JSON.stringify(agendadas));

/* ---------- podcast ---------- */
const episodios = lerPasta('content/podcast').map((e) => Object.assign({}, e, {
  transcricaoHtml: md(e.transcricao),
  convidados: lista(e.convidados),
  publicado: new Date(e.data) <= AGORA
})).sort((a, b) => (b.numero || 0) - (a.numero || 0));
escrever('data/podcast.json', JSON.stringify(episodios.filter((e) => e.publicado)));
agendadas.push(...episodios.filter((e) => !e.publicado).map((e) => ({ slug: e.slug, data: new Date(e.data).toISOString() })));
escrever('data/agendadas.json', JSON.stringify(agendadas));

/* ---------- colunistas ---------- */
const colunistas = lerPasta('content/colunistas').sort((a, b) => (a.ordem || 99) - (b.ordem || 99));
escrever('data/colunistas.json', JSON.stringify(colunistas));

/* ---------- páginas das notícias ---------- */
const PASTA_NOTICIAS = path.join(RAIZ, 'noticia');
if (fs.existsSync(PASTA_NOTICIAS)) fs.readdirSync(PASTA_NOTICIAS).filter((f) => f.endsWith('.html')).forEach((f) => fs.unlinkSync(path.join(PASTA_NOTICIAS, f)));

function relacionadas(n) {
  const mesma = publicadas.filter((x) => x.slug !== n.slug && x.categoria === n.categoria);
  const outras = publicadas.filter((x) => x.slug !== n.slug && x.categoria !== n.categoria);
  return mesma.concat(outras).slice(0, 3);
}

function pagina(n) {
  const nomeSite = [config.nome || 'PRAXIS', config.nome_destaque || ''].join(' ').trim();
  const desc = n.linha_fina || texto(n.fatosHtml).slice(0, 160);
  const ogImg = n.imagem ? (R.cdn ? SITE_URL + '/.netlify/images?url=' + encodeURIComponent(n.imagem) + '&w=1200&h=630&fit=cover&position=' + (n.posicao_foto || 'center') + '&fm=jpg' : SITE_URL + n.imagem) : SITE_URL + '/img/og-padrao.png';
  const ld = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: n.titulo, description: desc,
    datePublished: n.dataISO, author: { '@type': 'Person', name: n.autora }, image: [ogImg],
    publisher: { '@type': 'Organization', name: nomeSite }, mainEntityOfPage: n.urlAbsoluta
  };
  const dadosCard = { titulo: n.titulo, selo: n.selo, categoria: n.categoria, autora: n.autora, data: R.dataBR(n.data), imagem: n.imagem ? (R.cdn ? R.imgUrl(n.imagem, 1080, 1350, n.posicao_foto) : n.imagem) : '', url: n.urlAbsoluta };
  const rel = relacionadas(n).map((r) => '<a class="nt-rel" href="' + R.esc(r.slug) + '"><span class="selo ' + R.seloClasse(r.selo) + '">' + R.esc(r.selo) + '</span><strong>' + R.esc(r.titulo) + '</strong><small>' + R.dataBR(r.data) + '</small></a>').join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${R.esc(n.titulo)} — ${R.esc(nomeSite)}</title>
<meta name="description" content="${R.esc(desc)}">
<link rel="canonical" href="${R.esc(n.urlAbsoluta)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${R.esc(nomeSite)}">
<meta property="og:title" content="${R.esc(n.titulo)}">
<meta property="og:description" content="${R.esc(desc)}">
<meta property="og:url" content="${R.esc(n.urlAbsoluta)}">
<meta property="og:image" content="${R.esc(ogImg)}">
<meta property="article:published_time" content="${n.dataISO}">
<meta name="twitter:card" content="summary_large_image">
<link rel="manifest" href="../manifest.json">
<meta name="theme-color" content="#8B1E2D">
<link rel="icon" href="../img/icone.svg">
<link rel="alternate" type="application/rss+xml" title="${R.esc(nomeSite)}" href="../feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/style.css">
<link rel="stylesheet" href="../css/noticia.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body data-pagina="noticia" data-base="../">
<div id="topo"></div>
<main class="container">
  <article class="nt nt--pagina">
    <header class="nt-corpo nt-corpo--estreito">
      ${R.cabecalho(n, 'h1')}
      <div class="nt-ferramentas" role="group" aria-label="Ferramentas da matéria">
        <button type="button" class="btn btn--contorno" id="ouvir" aria-pressed="false">🔊 Ouvir esta notícia</button>
        <a class="btn btn--contorno" href="https://wa.me/?text=${encodeURIComponent(n.titulo + ' ' + n.urlAbsoluta)}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn btn--contorno" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(n.titulo)}&url=${encodeURIComponent(n.urlAbsoluta)}" target="_blank" rel="noopener">X</a>
        <button type="button" class="btn btn--contorno" id="copiar">Copiar link</button>
        <button type="button" class="btn btn--contorno" id="card">📸 Card para Instagram</button>
      </div>
    </header>
    <div class="nt-midia">${R.midia(n, 1600)}</div>
    <div class="nt-corpo nt-corpo--estreito" id="texto-materia">
      ${R.resumo30(n)}
      ${R.blocos(n)}
      ${n.corpoHtml ? '<section class="nt-texto nt-texto--corpo">' + n.corpoHtml + '</section>' : ''}
      ${R.galeria(n)}
      ${R.linhaDoTempo(n)}
      ${R.fontes(n)}
      ${R.correcao(n)}
      ${R.tags(n, '../')}
    </div>
  </article>
  ${rel ? '<section class="nt-relacionadas"><h2 class="secao__titulo">Leia também</h2><div class="grade">' + rel + '</div></section>' : ''}
</main>
<dialog class="lightbox" id="lightbox"><button type="button" class="lightbox__fechar" aria-label="Fechar">×</button><img alt=""><p></p></dialog>
<div id="rodape"></div>
<script type="application/json" id="dados-card">${JSON.stringify(dadosCard).replace(/</g, '\\u003c')}</script>
<script src="../js/config.js"></script>
<script src="../js/layout.js"></script>
<script src="../js/ticker.js"></script>
<script src="../js/materia.js"></script>
</body>
</html>
`;
}
publicadas.forEach((n) => escrever('noticia/' + n.slug + '.html', pagina(n)));

/* ---------- Quem Governa e Eleições (cargos sem API, editados no painel) ---------- */
['autoridades', 'eleicoes'].forEach((nome) => {
  const f = path.join(RAIZ, 'content', nome + '.json');
  if (fs.existsSync(f)) {
    try { escrever('data/' + nome + '.json', JSON.stringify(JSON.parse(fs.readFileSync(f, 'utf8')))); }
    catch (e) { console.warn('⚠️  ' + nome + '.json inválido, mantida a versão anterior'); }
  }
});

/* ---------- páginas institucionais (Quem somos, Linha editorial, Privacidade, Contato) ---------- */
const paginasInst = lerPasta('content/paginas').sort((a, b) => (a.ordem || 9) - (b.ordem || 9));
function paginaInstitucional(pg) {
  const nomeSite = [config.nome || 'PRAXIS', config.nome_destaque || ''].join(' ').trim();
  const form = pg.formulario_contato ? `
    <div id="enviado" class="aviso" hidden style="margin-top:8px">✔ Mensagem enviada! Responderemos em breve.</div>
    <form class="contato" name="contato" method="POST" action="/contato?enviado=1" data-netlify="true" netlify-honeypot="campo-robo">
      <input type="hidden" name="form-name" value="contato">
      <p hidden><label>Não preencha: <input name="campo-robo"></label></p>
      <div class="campo"><label for="c-nome">Nome</label><input id="c-nome" name="nome" required autocomplete="name"></div>
      <div class="campo"><label for="c-email">E-mail</label><input id="c-email" name="email" type="email" required autocomplete="email"></div>
      <div class="campo"><label for="c-assunto">Assunto</label><select id="c-assunto" name="assunto"><option>Sugestão de pauta</option><option>Correção</option><option>Denúncia</option><option>Parceria</option><option>Outro</option></select></div>
      <div class="campo campo--largo"><label for="c-msg">Mensagem</label><textarea id="c-msg" name="mensagem" rows="6" required></textarea></div>
      <button class="btn btn--bordo" type="submit">Enviar mensagem</button>
    </form>
    <script>if (/enviado=1/.test(location.search)) document.getElementById('enviado').hidden = false;</script>` : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${R.esc(pg.titulo)} — ${R.esc(nomeSite)}</title>
<meta name="description" content="${R.esc(pg.resumo || '')}">
<link rel="canonical" href="${SITE_URL}/${pg.slug}">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#8B1E2D">
<link rel="icon" href="img/icone.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/noticia.css">
</head>
<body data-pagina="${R.esc(pg.slug)}">
<div id="topo"></div>
<main class="container">
  <article class="nt nt--pagina">
    <header class="nt-corpo nt-corpo--estreito">
      <div class="nt-rotulo">${R.esc(nomeSite)}</div>
      <h1 class="nt-titulo">${R.esc(pg.titulo)}</h1>
      ${pg.resumo ? '<p class="nt-linha-fina">' + R.esc(pg.resumo) + '</p>' : ''}
    </header>
    <div class="nt-corpo nt-corpo--estreito" style="padding-top:0">
      <section class="nt-texto">${md(pg.corpo)}</section>
      ${form}
    </div>
  </article>
</main>
<div id="rodape"></div>
<script src="js/config.js"></script>
<script src="js/layout.js"></script>
<script src="js/ticker.js"></script>
</body>
</html>
`;
}
paginasInst.forEach((pg) => escrever(pg.slug + '.html', paginaInstitucional(pg)));
escrever('data/paginas.json', JSON.stringify(paginasInst.map((p) => ({ slug: p.slug, titulo: p.titulo, ordem: p.ordem }))));

/* ---------- sitemap e RSS ---------- */
const paginasFixas = ['', 'politicos', 'eleicoes', 'calculadora', 'podcast', 'busca'].concat(paginasInst.map((p) => p.slug));
escrever('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  paginasFixas.map((p) => '  <url><loc>' + SITE_URL + '/' + p + '</loc></url>').join('\n') + '\n' +
  publicadas.map((n) => '  <url><loc>' + n.urlAbsoluta + '</loc><lastmod>' + n.dataISO + '</lastmod></url>').join('\n') + '\n</urlset>\n');

const xml = (s) => R.esc(s);
escrever('feed.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n' +
  '<title>' + xml([config.nome, config.nome_destaque].join(' ').trim()) + '</title><link>' + SITE_URL + '</link><description>' + xml(config.slogan || '') + '</description><language>pt-BR</language>\n' +
  publicadas.slice(0, 30).map((n) => '<item><title>' + xml(n.titulo) + '</title><link>' + n.urlAbsoluta + '</link><guid>' + n.urlAbsoluta + '</guid><pubDate>' + new Date(n.data).toUTCString() + '</pubDate><description>' + xml(n.linha_fina || '') + '</description></item>').join('\n') +
  '\n</channel></rss>\n');

console.log(`✅ Build pronto: ${publicadas.length} notícias publicadas, ${agendadas.length} agendadas, ${episodios.length} episódios, ${colunistas.length} colunistas.`);

/* ---------- cópia de segurança de deputados e senadores ----------
   Se a API oficial falhar no navegador do leitor, a página Quem Governa usa esta cópia.
   Se a API também falhar aqui no build, a cópia anterior é mantida. */
async function copiaParlamentares() {
  const pegar = async (url) => {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  };
  try {
    let url = 'https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome&itens=100', lista = [];
    while (url) {
      const j = await pegar(url);
      lista = lista.concat(j.dados || []);
      const prox = (j.links || []).find((l) => l.rel === 'next');
      url = prox ? prox.href.replace(/^http:/, 'https:') : null;
    }
    if (lista.length > 400) { escrever('data/deputados.json', JSON.stringify({ atualizado: new Date().toISOString(), lista })); console.log('✅ Cópia de deputados:', lista.length); }
  } catch (e) { console.warn('⚠️  Câmara indisponível no build, mantida a cópia anterior:', e.message); }
  try {
    const j = await pegar('https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json');
    let lista = (((j.ListaParlamentarEmExercicio || {}).Parlamentares || {}).Parlamentar) || [];
    if (!Array.isArray(lista)) lista = [lista];
    if (lista.length > 60) { escrever('data/senadores.json', JSON.stringify({ atualizado: new Date().toISOString(), lista })); console.log('✅ Cópia de senadores:', lista.length); }
  } catch (e) { console.warn('⚠️  Senado indisponível no build, mantida a cópia anterior:', e.message); }
}
if (process.env.SEM_REDE !== '1') copiaParlamentares();
