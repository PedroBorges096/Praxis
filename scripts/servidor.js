#!/usr/bin/env node
/* Servidor de teste no seu computador (npm run dev). Abre http://localhost:8000
   e entende endereços sem ".html", igual ao Netlify. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..'), PORTA = process.env.PORT || 8000;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.yml': 'text/yaml', '.mp3': 'audio/mpeg' };
http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(RAIZ, url);
  if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  else if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': TIPOS['.html'] }); return res.end(fs.readFileSync(path.join(RAIZ, '404.html'))); }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORTA, () => console.log('PRAXIS rodando em http://localhost:' + PORTA));
