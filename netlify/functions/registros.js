// Consulta cuántos registros reales hay en los formularios de preventa (Netlify Forms).
// Requiere dos variables de entorno configuradas en Netlify (Project configuration -> Environment variables):
//   NETLIFY_API_TOKEN  -> Personal access token de Netlify (User settings -> Applications -> New access token)
//   NETLIFY_SITE_ID    -> El Site ID de este proyecto (Project configuration -> General -> Site details)

exports.handler = async function () {
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!token || !siteId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: null, error: 'faltan variables de entorno' }),
    };
  }

  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/forms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const forms = await res.json();
    const entrada = forms.find((f) => f.name === 'entrada');
    const preventa = forms.find((f) => f.name === 'preventa');
    const count = (entrada?.submission_count || 0) + (preventa?.submission_count || 0);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: null, error: e.message }),
    };
  }
};
