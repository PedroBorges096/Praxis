/* =========================================================
   PUBLICAÇÃO AGENDADA
   Roda sozinho a cada hora no Netlify (grátis).
   Se alguma notícia agendada já chegou na hora, pede um novo build,
   e ela entra no ar. Precisa da variável BUILD_HOOK_URL (veja o LEIA-ME).
   ========================================================= */
export default async () => {
  const site = process.env.URL;
  const gancho = process.env.BUILD_HOOK_URL;
  if (!site || !gancho) return new Response('Faltam as variáveis URL ou BUILD_HOOK_URL', { status: 200 });

  try {
    const r = await fetch(site + '/data/agendadas.json', { headers: { 'cache-control': 'no-cache' } });
    const agendadas = r.ok ? await r.json() : [];
    const agora = Date.now();
    const vencidas = agendadas.filter((n) => new Date(n.data).getTime() <= agora);
    if (vencidas.length) {
      await fetch(gancho, { method: 'POST' });
      return new Response('Publicando: ' + vencidas.map((n) => n.slug).join(', '));
    }
    return new Response('Nada para publicar agora.');
  } catch (e) {
    return new Response('Erro ao verificar agendamentos: ' + e.message, { status: 200 });
  }
};

export const config = { schedule: '@hourly' };
