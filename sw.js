/* App instalável: guarda o "esqueleto" do site para abrir rápido e funcionar sem internet.
   Notícias e dados sempre buscam a versão mais nova primeiro. */
const VERSAO = 'praxis-v1';
const BASE = ['./', 'index.html', 'css/style.css', 'css/home.css', 'css/noticia.css', 'js/layout.js', 'js/render.js', 'js/home.js', 'js/ticker.js', 'img/icone.svg', 'manifest.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || req.url.includes('/admin')) return;
  // rede primeiro (conteúdo sempre atualizado); se estiver sem internet, usa a cópia
  e.respondWith(fetch(req).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
    return r;
  }).catch(() => caches.match(req).then((c) => c || caches.match('index.html'))));
});
