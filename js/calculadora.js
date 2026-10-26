/* =========================================================
   CALCULADORA SALÁRIO vs. INFLAÇÃO
   IPCA mensal (série 433 do Banco Central), buscado ao vivo.
   Se a API falhar, usa a cópia abaixo (jan/2018 a set/2026).
   ========================================================= */
(function () {
  'use strict';
  var INICIO = 2018;
  var RESERVA = ('0.29,0.32,0.09,0.22,0.40,1.26,0.33,-0.09,0.48,0.45,-0.21,0.15,' +
    '0.32,0.43,0.75,0.57,0.13,0.01,0.19,0.11,-0.04,0.10,0.51,1.15,' +
    '0.21,0.25,0.07,-0.31,-0.38,0.26,0.36,0.24,0.64,0.86,0.89,1.35,' +
    '0.25,0.86,0.93,0.31,0.83,0.53,0.96,0.87,1.16,1.25,0.95,0.73,' +
    '0.54,1.01,1.62,1.06,0.47,0.67,-0.68,-0.36,-0.29,0.59,0.41,0.62,' +
    '0.53,0.84,0.71,0.61,0.23,-0.08,0.12,0.23,0.26,0.24,0.28,0.56,' +
    '0.42,0.83,0.16,0.38,0.46,0.21,0.38,-0.02,0.44,0.56,0.39,0.52,' +
    '0.16,1.31,0.56,0.43,0.26,0.24,0.26,-0.11,0.48,0.09,0.18,0.33,' +
    '0.33,0.70,0.88,0.67,0.58,0.16,0.07,-0.32,0.82').split(',').map(Number);
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var ipca = RESERVA, aoVivo = false;

  function $(id) { return document.getElementById(id); }
  function brl(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function lerSalario(s) { return parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0; }

  function calcular(sal, mes, ano, serie) {
    var ultimo = serie.length - 1;
    var idx = (ano - INICIO) * 12 + (mes - 1);
    if (idx < 0 || idx >= ultimo || sal <= 0) return null;
    var f = 1, acum = 0, pts = [1];
    for (var k = idx + 1; k <= ultimo; k++) { f *= 1 + serie[k] / 100; acum += sal * f - sal; pts.push(1 / f); }
    return { fator: f, perda: 1 - 1 / f, corrigido: sal * f, poder: sal / f, acum: acum, meses: ultimo - idx, pontos: pts };
  }

  function rotuloUltimo() { var u = ipca.length - 1; return CURTO[u % 12] + '/' + (INICIO + Math.floor(u / 12)); }

  function atualizar() {
    var sal = lerSalario($('sal').value), mes = +$('mes').value, ano = +$('ano').value;
    var r = calcular(sal, mes, ano, ipca);
    if (!r) {
      $('r-pct').textContent = '—';
      $('r-frase').textContent = 'Escolha um mês anterior a ' + rotuloUltimo() + ' e informe um salário.';
      ['r-corr', 'r-dif', 'r-acum'].forEach(function (id) { $(id).textContent = '—'; });
      return;
    }
    var pct = (r.perda * 100).toFixed(1).replace('.', ',') + '%';
    var quando = CURTO[mes - 1] + '/' + ano;
    $('r-pct').textContent = pct;
    $('r-frase').innerHTML = 'do poder de compra. Hoje, os seus <strong style="color:#fff">' + brl(sal) + '</strong> compram o mesmo que <strong style="color:#fff">' + brl(r.poder) + '</strong> compravam em ' + quando + '.';
    $('r-corr').textContent = brl(r.corrigido);
    $('r-dif').textContent = brl(r.corrigido - sal);
    $('r-acum-l').textContent = 'Perda somada em ' + r.meses + ' meses';
    $('r-acum').textContent = brl(r.acum);
    var min = Math.min.apply(null, r.pontos), faixa = Math.max(1 - min, 0.0001);
    var c = r.pontos.map(function (p, i) { return (i / (r.pontos.length - 1) * 600).toFixed(1) + ' ' + (10 + (1 - p) / faixa * 150).toFixed(1); });
    var d = 'M' + c.join(' L');
    $('g-linha').setAttribute('d', d);
    $('g-area').setAttribute('d', d + ' L600 10 L0 10 Z');
    var msg = 'Desde o meu último reajuste (' + quando + '), a inflação comeu ' + pct + ' do meu salário. Calcule o seu: ' + location.href;
    $('zap').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
  }

  function preencherSelects() {
    $('mes').innerHTML = MESES.map(function (m, i) { return '<option value="' + (i + 1) + '">' + m.charAt(0).toUpperCase() + m.slice(1) + '</option>'; }).join('');
    var anoFim = INICIO + Math.floor((ipca.length - 1) / 12), html = '';
    for (var a = INICIO; a <= anoFim; a++) html += '<option>' + a + '</option>';
    var anoSel = $('ano').value || String(anoFim - 2);
    $('ano').innerHTML = html; $('ano').value = anoSel;
    if (!$('mes').dataset.ok) { $('mes').value = '1'; $('mes').dataset.ok = '1'; }
  }

  function textoFonte() {
    $('fonte').textContent = 'Fonte: IPCA mensal (IBGE), via Banco Central, de jan/2018 até ' + rotuloUltimo() + (aoVivo ? ' · atualizado agora.' : ' · cópia de segurança (a API não respondeu).');
  }

  function buscarIPCA() {
    var url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/' + INICIO;
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (arr) {
      var serie = arr.map(function (x) { return Number(x.valor); });
      if (serie.length >= RESERVA.length - 1) { ipca = serie; aoVivo = true; }
    });
  }

  function iniciar() {
    preencherSelects(); textoFonte(); atualizar();
    ['sal', 'mes', 'ano'].forEach(function (id) { $(id).addEventListener('input', atualizar); $(id).addEventListener('change', atualizar); });
    buscarIPCA().catch(function () {}).then(function () { preencherSelects(); textoFonte(); atualizar(); });
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById('sal')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  }
  if (typeof module !== 'undefined') module.exports = { calcular: calcular, RESERVA: RESERVA };
})();
