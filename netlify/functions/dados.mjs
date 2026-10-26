/* =========================================================
   INTERMEDIÁRIO DAS APIS OFICIAIS
   Alguns navegadores bloqueiam o acesso direto à API da Câmara (CORS).
   Quando isso acontece, o site pede os dados por aqui: o servidor do
   Netlify busca na fonte oficial e devolve. Só aceita Câmara e Senado.
   ========================================================= */
const PERMITIDOS = ['dadosabertos.camara.leg.br', 'legis.senado.leg.br'];

export default async (req) => {
  const alvo = new URL(req.url).searchParams.get('url') || '';
  let url;
  try { url = new URL(alvo); } catch { return new Response('url inválida', { status: 400 }); }
  if (url.protocol !== 'https:' || !PERMITIDOS.includes(url.hostname)) return new Response('fonte não permitida', { status: 403 });

  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Praxis/1.0' } });
    const corpo = await r.text();
    return new Response(corpo, {
      status: r.status,
      headers: {
        'content-type': r.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=600', // guarda por 10 minutos
        'access-control-allow-origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ erro: 'fonte indisponível' }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
};
