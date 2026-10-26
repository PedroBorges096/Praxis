/* =========================================================
   TICKER FINANCEIRO AO VIVO
   - Moedas: AwesomeAPI (gratuita, atualiza a cada ~30s)
   - Selic e IPCA: API oficial do Banco Central (SGS)
   - Índices (Ibovespa, S&P 500, Brent, Ouro): widget do TradingView
     embutido no index.html (as bolsas não liberam dados grátis via API)
   Atualiza sozinho a cada 60 segundos.
   ========================================================= */
(function () {
  'use strict';

  var MOEDAS = [
    { par: 'USD-BRL', chave: 'USDBRL', nome: 'Dólar' },
    { par: 'EUR-BRL', chave: 'EURBRL', nome: 'Euro' },
    { par: 'CNY-BRL', chave: 'CNYBRL', nome: 'Yuan' },
    { par: 'GBP-BRL', chave: 'GBPBRL', nome: 'Libra' },
    { par: 'ARS-BRL', chave: 'ARSBRL', nome: 'Peso arg.' },
    { par: 'BTC-BRL', chave: 'BTCBRL', nome: 'Bitcoin' }
  ];
  var SERIES_BCB = [
    { serie: 432, nome: 'Selic', sufixo: '% a.a.' },
    { serie: 13522, nome: 'IPCA 12 meses', sufixo: '%' }
  ];
  var INTERVALO = 60 * 1000;

  var brl = function (v, casas) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  };

  function comTempoLimite(url, ms) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 10000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function buscarMoedas() {
    var url = 'https://economia.awesomeapi.com.br/json/last/' + MOEDAS.map(function (m) { return m.par; }).join(',');
    return comTempoLimite(url).then(function (dados) {
      return MOEDAS.filter(function (m) { return dados[m.chave]; }).map(function (m) {
        var d = dados[m.chave];
        var valor = Number(d.bid);
        var casas = valor < 1 ? 4 : (valor > 1000 ? 0 : 2);
        return { nome: m.nome, valor: brl(valor, casas), variacao: Number(d.pctChange) };
      });
    });
  }

  function buscarBCB() {
    return Promise.all(SERIES_BCB.map(function (s) {
      var url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.' + s.serie + '/dados/ultimos/1?formato=json';
      return comTempoLimite(url).then(function (arr) {
        var u = arr[arr.length - 1];
        return { nome: s.nome, valor: Number(u.valor).toLocaleString('pt-BR') + s.sufixo, variacao: null, ref: u.data };
      }).catch(function () { return null; });
    })).then(function (lista) { return lista.filter(Boolean); });
  }

  function itemHTML(i) {
    var varHTML = '';
    if (i.variacao !== null && !isNaN(i.variacao)) {
      var sobe = i.variacao >= 0;
      varHTML = '<span class="' + (sobe ? 'up' : 'down') + '">' + (sobe ? '▲ ' : '▼ ') +
        Math.abs(i.variacao).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%</span>';
    }
    return '<span class="ticker__item"><strong>' + i.nome + '</strong><span class="v">' + i.valor + '</span>' + varHTML + '</span>';
  }

  function desenhar(itens) {
    var fita = document.getElementById('ticker-fita');
    var hora = document.getElementById('ticker-hora');
    if (!fita) return;
    if (!itens.length) {
      fita.innerHTML = '<span class="ticker__item"><span class="v">Cotações indisponíveis no momento. Tentando novamente…</span></span>';
      return;
    }
    var html = itens.map(itemHTML).join('');
    fita.innerHTML = html + html; // duplicado para a rolagem contínua
    if (hora) hora.textContent = 'Atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function atualizar() {
    Promise.all([
      buscarMoedas().catch(function () { return []; }),
      buscarBCB().catch(function () { return []; })
    ]).then(function (r) { desenhar(r[0].concat(r[1])); });
  }

  function dataDeHoje() {
    var el = document.getElementById('data-hoje');
    if (el) el.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  document.addEventListener('DOMContentLoaded', function () {
    dataDeHoje();
    atualizar();
    setInterval(atualizar, INTERVALO);
  });
})();
