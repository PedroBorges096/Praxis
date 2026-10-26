/* =========================================================
   PÁGINA DA MATÉRIA: ouvir, copiar link, card para Instagram, galeria
   ========================================================= */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var dados = {};
  try { dados = JSON.parse($('dados-card').textContent); } catch (e) { /* sem card */ }

  /* ---------- Ouvir a notícia (voz do próprio celular/computador) ---------- */
  var ouvir = $('ouvir');
  if (ouvir) {
    if (!('speechSynthesis' in window)) { ouvir.hidden = true; }
    else {
      var falando = false;
      var parar = function () { speechSynthesis.cancel(); falando = false; ouvir.setAttribute('aria-pressed', 'false'); ouvir.textContent = '🔊 Ouvir esta notícia'; };
      ouvir.addEventListener('click', function () {
        if (falando) { parar(); return; }
        var partes = [document.querySelector('.nt-titulo'), document.querySelector('.nt-linha-fina'), $('texto-materia')]
          .filter(Boolean).map(function (el) { return el.innerText; }).join('. ');
        // a fala é dividida em frases: alguns navegadores cortam textos longos
        var frases = partes.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || [partes];
        var vozes = speechSynthesis.getVoices().filter(function (v) { return /^pt(-|_)BR/i.test(v.lang); });
        frases.forEach(function (f, i) {
          var u = new SpeechSynthesisUtterance(f.trim());
          u.lang = 'pt-BR'; u.rate = 1.02;
          if (vozes[0]) u.voice = vozes[0];
          if (i === frases.length - 1) u.onend = parar;
          speechSynthesis.speak(u);
        });
        falando = true; ouvir.setAttribute('aria-pressed', 'true'); ouvir.textContent = '⏹ Parar leitura';
      });
      window.addEventListener('pagehide', function () { speechSynthesis.cancel(); });
    }
  }

  /* ---------- Copiar link ---------- */
  var copiar = $('copiar');
  if (copiar) copiar.addEventListener('click', function () {
    var url = dados.url || location.href;
    var ok = function () { copiar.textContent = '✔ Link copiado'; setTimeout(function () { copiar.textContent = 'Copiar link'; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, function () { prompt('Copie o link:', url); });
    else prompt('Copie o link:', url);
  });

  /* ---------- Card para Instagram (1080 × 1350) ---------- */
  function quebrar(ctx, texto, largura) {
    var palavras = texto.split(' '), linhas = [], linha = '';
    palavras.forEach(function (p) {
      var teste = linha ? linha + ' ' + p : p;
      if (ctx.measureText(teste).width > largura && linha) { linhas.push(linha); linha = p; } else linha = teste;
    });
    if (linha) linhas.push(linha);
    return linhas;
  }
  function carregarImagem(src) {
    return new Promise(function (ok) {
      if (!src) return ok(null);
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () { ok(img); }; img.onerror = function () { ok(null); };
      img.src = src;
    });
  }
  function desenharCard() {
    var cfg = window.PORTAL_CONFIG || {};
    var W = 1080, H = 1350, c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var fontes = document.fonts ? Promise.all([document.fonts.load('800 80px "Playfair Display"'), document.fonts.load('600 30px Inter')]) : Promise.resolve();
    return fontes.then(function () { return carregarImagem(dados.imagem); }).then(function (img) {
      ctx.fillStyle = '#141B26'; ctx.fillRect(0, 0, W, H);
      var topoTexto = 140;
      if (img) {
        var alt = 620, esc = Math.max(W / img.width, alt / img.height);
        var sw = W / esc, sh = alt / esc;
        ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, alt);
        var g = ctx.createLinearGradient(0, alt - 220, 0, alt);
        g.addColorStop(0, 'rgba(20,27,38,0)'); g.addColorStop(1, 'rgba(20,27,38,1)');
        ctx.fillStyle = g; ctx.fillRect(0, alt - 220, W, 220);
        topoTexto = alt + 30;
      }
      ctx.fillStyle = '#8B1E2D'; ctx.fillRect(0, 0, W, 16);
      // selo
      ctx.font = '700 28px Inter, sans-serif';
      var selo = (dados.selo || '').toUpperCase() + '  ·  ' + (dados.categoria || '').toUpperCase();
      ctx.fillStyle = '#E8A3AD'; ctx.fillText(selo, 72, topoTexto);
      // título
      var tam = 76; ctx.font = '800 ' + tam + 'px "Playfair Display", Georgia, serif';
      var linhas = quebrar(ctx, dados.titulo || '', W - 144);
      var espaco = H - topoTexto - 260;
      while (linhas.length * tam * 1.12 > espaco && tam > 44) { tam -= 4; ctx.font = '800 ' + tam + 'px "Playfair Display", Georgia, serif'; linhas = quebrar(ctx, dados.titulo || '', W - 144); }
      ctx.fillStyle = '#FFFFFF';
      linhas.forEach(function (l, i) { ctx.fillText(l, 72, topoTexto + 40 + tam + i * tam * 1.12); });
      // rodapé
      ctx.fillStyle = '#8B1E2D'; ctx.fillRect(0, H - 170, W, 170);
      ctx.fillStyle = '#FFFFFF'; ctx.font = '800 52px "Playfair Display", Georgia, serif';
      ctx.fillText(((cfg.nome || 'PRAXIS') + ' ' + (cfg.nome_destaque || '')).trim(), 72, H - 92);
      ctx.font = '500 26px Inter, sans-serif'; ctx.fillStyle = '#F4D6DA';
      ctx.fillText(cfg.slogan || '', 72, H - 50);
      ctx.textAlign = 'right'; ctx.fillText(dados.data || '', W - 72, H - 92);
      return c;
    });
  }
  var card = $('card');
  if (card) card.addEventListener('click', function () {
    card.disabled = true; card.textContent = 'Gerando…';
    desenharCard().then(function (c) {
      var a = document.createElement('a');
      a.download = 'card-' + (location.pathname.split('/').pop() || 'noticia').replace('.html', '') + '.png';
      try { a.href = c.toDataURL('image/png'); a.click(); }
      catch (e) { alert('Não foi possível gerar o card com esta foto.'); }
    }).then(function () { card.disabled = false; card.textContent = '📸 Card para Instagram'; });
  });

  /* ---------- Galeria ampliada ---------- */
  var lb = $('lightbox');
  if (lb) {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.nt-galeria__abrir');
      if (!b) return;
      lb.querySelector('img').src = b.querySelector('img').currentSrc || b.getAttribute('data-foto');
      lb.querySelector('p').textContent = b.getAttribute('data-legenda') || '';
      if (lb.showModal) lb.showModal();
    });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lightbox__fechar')) lb.close(); });
  }
})();
