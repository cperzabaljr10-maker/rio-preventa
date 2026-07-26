// Muro de la comunidad: guarda y devuelve palabras/frases sugeridas para el próximo drop,
// con conteo de votos. Usa Netlify Blobs (incluido gratis, sin base de datos externa).
const { getStore } = require('@netlify/blobs');

// Filtro básico de moderación — no es perfecto, pero bloquea lo más obvio automáticamente.
// Cualquier cosa que se cuele se puede borrar manualmente (pedir ayuda para eso cuando haga falta).
const PALABRAS_BLOQUEADAS = [
  'puta', 'puto', 'pendejo', 'pendeja', 'verga', 'chinga', 'mierda', 'cabron', 'cabrón',
  'idiota', 'estupido', 'estúpido', 'imbecil', 'imbécil', 'maldito', 'maldita',
  'perra', 'zorra', 'culero', 'culera', 'nazi', 'matar', 'suicid', 'violar',
];

function contieneTextoBloqueado(texto) {
  const limpio = texto.toLowerCase();
  return PALABRAS_BLOQUEADAS.some((mala) => limpio.includes(mala));
}

function store() {
  return getStore({
    name: 'palabras',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN,
  });
}

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const s = store();

    if (event.httpMethod === 'GET') {
      const data = (await s.get('lista', { type: 'json' })) || [];
      return { statusCode: 200, headers, body: JSON.stringify({ palabras: data }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      let data = (await s.get('lista', { type: 'json' })) || [];

      if (body.action === 'votar' && body.id) {
        data = data.map((p) => (p.id === body.id ? { ...p, votos: (p.votos || 0) + 1 } : p));
        await s.setJSON('lista', data);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, palabras: data }) };
      }

      const texto = (body.texto || '').trim().slice(0, 60);
      if (!texto) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'texto vacío' }) };
      }
      if (contieneTextoBloqueado(texto)) {
        return { statusCode: 200, headers, body: JSON.stringify({ error: 'Ese texto no se puede publicar — intenta con otra frase.', bloqueado: true }) };
      }
      const nueva = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), texto, votos: 0 };
      data.push(nueva);
      // Límite simple para no crecer sin control mientras no hay moderación.
      if (data.length > 300) data = data.slice(-300);
      await s.setJSON('lista', data);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, palabras: data }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'método no permitido' }) };
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: e.message, palabras: [] }) };
  }
};
