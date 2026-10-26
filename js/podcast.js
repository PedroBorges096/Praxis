/* =========================================================
   PODCAST: ouvir (Spotify ou MP3) ou assistir (YouTube),
   capítulos clicáveis, velocidade, transcrição e mini player.
   Os episódios vêm do painel (data/podcast.json).
   ========================================================= */
(function () {
  'use strict';
  var R = window.Render, cfg = window.PORTAL_CONFIG || {};
  R.cdn = !!cfg.cdn;
  var eps = [], audioAtual = null, epAtual = null;
  function $(id) { return document.getElementById(id); }
  function spotifyId(url) { var m = String(url || '').match(/episode\/([A-Za-z0-9]+)/); return m ? m[1] : ''; }
  function segundos(t) { return String(t || '0').split(':').reduce(function (acc, p) { return acc * 60 + (parseInt(p, 10) || 0); }, 0); }
  function relogio(s) { s = Math.floor(s || 0); var m = Math.floor(s / 60), h = Math.floor(m / 60); m = m % 60; var ss = ('0' + (s % 60)).slice(-2); return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ss; }
  function salvar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignora */ } }
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function temAudio(ep) { return !!(ep.audio_arquivo || spotifyId(ep.spotify)); }
  function temVideo(ep) { return !!R.youtubeId(ep.youtube); }

  function cartao(ep) {
    var capa = ep.capa ? '<img class="ep__capa" src="' + R.esc(R.imgUrl(ep.capa, 300, 300)) + '" alt="Capa do episódio ' + R.esc(ep.numero) + '" loading="lazy">' : '<div class="ep__capa" aria-hidden="true">#' + R.esc(ep.numero) + '</div>';
    var caps = (ep.capitulos || []).filter(function (c) { return c && c.tempo; });
    return '<article class="ep" id="ep-' + R.esc(ep.numero) + '" data-n="' + R.esc(ep.numero) + '">' + capa +
      '<div class="ep__corpo">' +
        '<div class="ep__num">Episódio ' + R.esc(ep.numero) + ' · ' + R.dataBR(ep.data) + (ep.duracao ? ' · ' + R.esc(ep.duracao) : '') + '</div>' +
        '<h2>' + R.esc(ep.titulo) + '</h2>' +
        '<p class="ep__desc">' + R.esc(ep.descricao) + '</p>' +
        ((ep.convidados || []).length ? '<div class="leve" style="font-size:14px;color:var(--texto-suave)">Com ' + ep.convidados.map(R.esc).join(', ') + '</div>' : '') +
        '<div class="modo" role="group" aria-label="Formato">' +
          '<button type="button" data-modo="audio" aria-pressed="false"' + (temAudio(ep) ? '' : ' disabled title="Áudio ainda não disponível"') + '>🎧 Ouvir</button>' +
          '<button type="button" data-modo="video" aria-pressed="false"' + (temVideo(ep) ? '' : ' disabled title="Vídeo ainda não disponível"') + '>🎬 Assistir</button>' +
        '</div>' +
        '<div class="player" aria-live="polite"></div>' +
        (caps.length ? '<div><strong style="display:block;margin:6px 0">Capítulos</strong><ul class="capitulos">' + caps.map(function (c) {
          return '<li><button type="button" data-t="' + segundos(c.tempo) + '"><b>' + R.esc(c.tempo) + '</b><span>' + R.esc(c.titulo) + '</span></button></li>';
        }).join('') + '</ul></div>' : '') +
        (ep.transcricaoHtml ? '<details class="transcricao"><summary>Ler a transcrição</summary><div>' + ep.transcricaoHtml + '</div></details>' : '') +
      '</div></article>';
  }

  function tocarModo(art, modo, inicio) {
    var ep = eps.filter(function (e) { return String(e.numero) === art.getAttribute('data-n'); })[0];
    if (!ep) return;
    art.querySelectorAll('.modo button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-modo') === modo ? 'true' : 'false'); });
    art.setAttribute('data-modo', modo);
    var p = art.querySelector('.player');
    inicio = inicio || 0;
    if (modo === 'video') {
      if (audioAtual && epAtual === ep) audioAtual.pause();
      p.innerHTML = '<div class="player__video"><iframe src="https://www.youtube-nocookie.com/embed/' + R.youtubeId(ep.youtube) + '?rel=0' + (inicio ? '&start=' + inicio + '&autoplay=1' : '') + '" title="' + R.esc(ep.titulo) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
      return;
    }
    if (ep.audio_arquivo) {
      p.innerHTML = '<audio controls preload="metadata" src="' + R.esc(ep.audio_arquivo) + '"></audio>' +
        '<div class="velocidade" role="group" aria-label="Velocidade">Velocidade: ' + [1, 1.25, 1.5, 2].map(function (v) {
          return '<button type="button" data-v="' + v + '" aria-pressed="' + (v === 1) + '">' + String(v).replace('.', ',') + 'x</button>';
        }).join('') + '</div>';
      var a = p.querySelector('audio');
      ligarAudio(a, ep);
      var salvo = parseFloat(ler('praxis-pod-' + ep.numero));
      a.addEventListener('loadedmetadata', function () { a.currentTime = inicio || (salvo && salvo < a.duration - 10 ? salvo : 0); }, { once: true });
      if (inicio) a.play().catch(function () {});
      return;
    }
    var sid = spotifyId(ep.spotify);
    p.innerHTML = '<iframe src="https://open.spotify.com/embed/episode/' + sid + '" height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" title="Ouvir no Spotify"></iframe>' +
      (inicio ? '<p class="leve" style="font-size:13px;color:var(--texto-suave)">No player do Spotify, avance até ' + relogio(inicio) + '.</p>' : '');
  }

  /* ---------- MP3: velocidade, retomada e mini player ---------- */
  function ligarAudio(a, ep) {
    a.addEventListener('play', function () {
      if (audioAtual && audioAtual !== a) audioAtual.pause();
      audioAtual = a; epAtual = ep;
      $('mini').hidden = false; document.body.classList.add('com-mini');
      $('mini-titulo').textContent = '#' + ep.numero + ' · ' + ep.titulo;
      $('mini-play').textContent = '❚❚'; $('mini-play').setAttribute('aria-label', 'Pausar');
    });
    a.addEventListener('pause', function () { $('mini-play').textContent = '▶'; $('mini-play').setAttribute('aria-label', 'Tocar'); });
    a.addEventListener('timeupdate', function () {
      if (a !== audioAtual) return;
      $('mini-barra').style.width = (a.duration ? a.currentTime / a.duration * 100 : 0) + '%';
      $('mini-tempo').textContent = relogio(a.currentTime) + ' / ' + relogio(a.duration);
      if (Math.floor(a.currentTime) % 5 === 0) salvar('praxis-pod-' + ep.numero, a.currentTime);
    });
  }
  $('mini-play').addEventListener('click', function () { if (!audioAtual) return; if (audioAtual.paused) audioAtual.play(); else audioAtual.pause(); });

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    var art = t.closest('.ep'); if (!art) return;
    var bModo = t.closest('.modo button');
    if (bModo && !bModo.disabled) { tocarModo(art, bModo.getAttribute('data-modo')); return; }
    var bVel = t.closest('.velocidade button');
    if (bVel) {
      var a = art.querySelector('audio'); if (a) a.playbackRate = parseFloat(bVel.getAttribute('data-v'));
      art.querySelectorAll('.velocidade button').forEach(function (b) { b.setAttribute('aria-pressed', b === bVel ? 'true' : 'false'); });
      return;
    }
    var bCap = t.closest('.capitulos button');
    if (bCap) {
      var seg = parseInt(bCap.getAttribute('data-t'), 10);
      var modo = art.getAttribute('data-modo') || (art.querySelector('[data-modo="audio"]:not(:disabled)') ? 'audio' : 'video');
      var audio = art.querySelector('audio');
      if (modo === 'audio' && audio) { audio.currentTime = seg; audio.play().catch(function () {}); }
      else tocarModo(art, modo, seg);
    }
  });

  function plataformas() {
    var r = cfg.redes || {}, h = '';
    if (r.spotify) h += '<a class="btn btn--bordo" href="' + R.esc(r.spotify) + '" target="_blank" rel="noopener">Seguir no Spotify</a>';
    if (r.youtube) h += '<a class="btn btn--contorno" href="' + R.esc(r.youtube) + '" target="_blank" rel="noopener">Inscrever-se no YouTube</a>';
    h += '<a class="btn btn--contorno" href="feed.xml">RSS</a>';
    $('plataformas').innerHTML = h;
  }

  function iniciar() {
    plataformas();
    fetch('data/podcast.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (lista) {
      var agora = Date.now();
      eps = lista.filter(function (e) { return new Date(e.data).getTime() <= agora; });
      $('status').innerHTML = eps.length ? '' : '<div class="vazio">Nenhum episódio publicado ainda.</div>';
      $('episodios').innerHTML = eps.map(cartao).join('');
      // escolhe automaticamente o formato disponível em cada episódio
      document.querySelectorAll('.ep').forEach(function (art) {
        var ep = eps.filter(function (e) { return String(e.numero) === art.getAttribute('data-n'); })[0];
        if (!temAudio(ep) && !temVideo(ep)) art.querySelector('.player').innerHTML = '<div class="vazio">Em breve: o episódio está sendo finalizado.</div>';
      });
      var m = location.hash.match(/^#ep-(\d+)(-video)?$/);
      if (m) {
        var alvo = document.getElementById('ep-' + m[1]);
        if (alvo) {
          alvo.scrollIntoView();
          var b = alvo.querySelector('[data-modo="' + (m[2] ? 'video' : 'audio') + '"]:not(:disabled)') || alvo.querySelector('.modo button:not(:disabled)');
          if (b) b.click();
        }
      }
    }).catch(function () {
      $('status').innerHTML = '<div class="erro">Não foi possível carregar os episódios agora.</div>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.__podcast = { segundos: segundos, relogio: relogio, spotifyId: spotifyId };
})();
