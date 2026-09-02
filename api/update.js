// api/update.js
// Recibe el panel-data actualizado desde el navegador (cuando alguien termina
// de cargar/limpiar un Excel en Montacarguistas, Puestos en Cero o PR Críticos)
// y lo commitea a data/panel-data.json en GitHub. Ese commit dispara un
// redeploy automático de Vercel (integración Git nativa), y mientras tanto
// cualquier pestaña abierta lo recoge sola vía el sondeo a /data/panel-data.json.
//
// Variables de entorno requeridas (configúralas en Vercel → Project Settings → Environment Variables):
// GITHUB_TOKEN - Personal Access Token con permiso de escritura sobre el repo
// GITHUB_OWNER - usuario u organización dueña del repo (ej. "jpuerta")
// GITHUB_REPO - nombre del repo (ej. "cendis-panel-central")
// GITHUB_BRANCH - rama a commitear (opcional, default "main")
// DATA_PATH - ruta del archivo dentro del repo (opcional, default "data/panel-data.json")

const GITHUB_API = 'https://api.github.com';

function envOrDefault(name, fallback) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

async function githubRequest(path, token, options = {}) {
  const resp = await fetch(GITHUB_API + path, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  return resp;
}

module.exports = async (req, res) => {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = envOrDefault('GITHUB_BRANCH', 'main');
  const dataPath = envOrDefault('DATA_PATH', 'data/panel-data.json');
  const token = process.env.GITHUB_TOKEN;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido, usa POST' });
    return;
  }

  if (!token || !owner || !repo) {
    res.status(500).json({ error: 'Faltan variables de entorno GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO en Vercel' });
    return;
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = null; }
  }

  if (!payload || typeof payload !== 'object' || typeof payload.modulos !== 'object') {
    res.status(400).json({ error: 'Cuerpo inválido: se espera el objeto panel-data completo con "modulos"' });
    return;
  }

  payload.generado = new Date().toISOString();
  const contentStr = JSON.stringify(payload, null, 2) + '\n';
  const contentB64 = Buffer.from(contentStr, 'utf-8').toString('base64');

  try {
    const getResp = await githubRequest(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(dataPath)}?ref=${encodeURIComponent(branch)}`,
      token
    );

    let sha;
    if (getResp.status === 200) {
      const current = await getResp.json();
      sha = current.sha;
    } else if (getResp.status !== 404) {
      const errBody = await getResp.text();
      res.status(502).json({ error: `No se pudo leer el archivo actual en GitHub (HTTP ${getResp.status})`, detail: errBody.slice(0, 500) });
      return;
    }

    const putResp = await githubRequest(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(dataPath)}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({
          message: `panel: actualización automática ${payload.generado}`,
          content: contentB64,
          branch,
          ...(sha ? { sha } : {})
        })
      }
    );

    if (putResp.status === 200 || putResp.status === 201) {
      res.status(200).json({ ok: true, generado: payload.generado });
      return;
    }

    if (putResp.status === 409) {
      res.status(409).json({ error: 'Conflicto: otra actualización llegó al mismo tiempo, intenta de nuevo' });
      return;
    }

    const errBody = await putResp.text();
    res.status(502).json({ error: `GitHub respondió HTTP ${putResp.status}`, detail: errBody.slice(0, 500), getRespStatus: getResp.status });
  } catch (err) {
    res.status(500).json({ error: 'Error inesperado al commitear a GitHub', detail: String(err && err.message || err) });
  }
};
