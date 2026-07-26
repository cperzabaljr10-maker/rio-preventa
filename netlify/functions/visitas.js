// Contador de visitas real, privado — no se muestra en la página pública.
// Carlos lo consulta visitando directamente esta URL en su navegador:
// https://rio-preventa.netlify.app/.netlify/functions/visitas
const { getStore } = require('@netlify/blobs');

function store() {
  return getStore({
    name: 'analitica',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN,
  });
}

exports.handler = async function (event) {
  const s = store();

  if (event.httpMethod === 'POST') {
    const actual = (await s.get('visitas', { type: 'json' })) || { total: 0 };
    actual.total += 1;
    await s.setJSON('visitas', actual);
    return { statusCode: 200, body: 'ok' };
  }

  // GET — vista simple en HTML para que Carlos la lea fácil, con conversión real.
  const visitas = (await s.get('visitas', { type: 'json' })) || { total: 0 };
  let registros = 0;
  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${process.env.NETLIFY_SITE_ID}/forms`, {
      headers: { Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}` },
    });
    const forms = await res.json();
    const entrada = forms.find((f) => f.name === 'entrada');
    const preventa = forms.find((f) => f.name === 'preventa');
    registros = (entrada?.submission_count || 0) + (preventa?.submission_count || 0);
  } catch (e) {}

  const conversion = visitas.total > 0 ? ((registros / visitas.total) * 100).toFixed(1) : '0.0';

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Río — Estadísticas privadas</title>
  <style>body{font-family:-apple-system,sans-serif;background:#0E0D0B;color:#F2EAD9;padding:60px;}
  .num{font-size:48px;color:#4E8CA3;font-weight:bold;} .label{color:#A69E8D;margin-bottom:30px;}</style></head>
  <body>
    <h1>Estadísticas de Río (privado)</h1>
    <div class="num">${visitas.total}</div><div class="label">visitas totales</div>
    <div class="num">${registros}</div><div class="label">registros (preventa + entrada)</div>
    <div class="num">${conversion}%</div><div class="label">tasa de conversión</div>
  </body></html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
};
