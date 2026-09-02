# Panel Central CENDIS — versión GitHub + Vercel

Réplica del Panel Central del turno nocturno de CENDIS Charallave (Farmatodo),
adaptada para vivir fuera de Claude Artifacts: front-end estático + una función
serverless que commitea las actualizaciones a este mismo repo, para que
cualquiera con el link vea siempre el último corte.

## Cómo funciona

- `index.html` — el panel. Al cargar, y luego cada ~25s, pide
  `data/panel-data.json` y repinta las tarjetas si hay algo nuevo.
- `data/panel-data.json` — el "último corte" conocido. Es el archivo que se
  commitea automáticamente.
- `api/update.js` — función serverless de Vercel. Cuando alguien termina de
  cargar/limpiar un Excel en Montacarguistas, Puestos en Cero o PR Críticos,
  el navegador le manda el panel-data actualizado, y esta función lo commitea
  a `data/panel-data.json` en GitHub (vía la API de GitHub). Ese commit
  dispara un redeploy automático de Vercel.
- `middleware.js` — pide usuario/contraseña (HTTP Basic Auth) antes de dejar
  ver el sitio.
- Las secciones que dependen de Oracle o de un skill de Claude (In-Transit,
  Ventanas, antigüedad PR, KPI, Auditorías) siguen actualizándose de la misma
  forma que antes: alguien le pide a Claude que corra el skill correspondiente
  y comitee `data/panel-data.json` con el resultado (a mano, o pidiéndoselo
  directamente sobre este repo).

## Puesta en marcha (una sola vez)

### 1. Importar el repo en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new) e importa este repositorio de GitHub.
2. Framework Preset: elige **"Other"**. Si Vercel propone un Build Command, bórralo (déjalo vacío) — este proyecto no necesita build.
3. Antes de darle a Deploy, agrega las variables de entorno de la sección siguiente.

### 2. Variables de entorno (Project Settings → Environment Variables)

| Variable | Valor |
|---|---|
| `GITHUB_TOKEN` | El mismo Personal Access Token (classic, scope `repo`) usado para crear este repo. La función `api/update.js` lo usa para commitear. |
| `GITHUB_OWNER` | `josepuerta8` |
| `GITHUB_REPO` | `Panel-Central-Cendis-Noct` |
| `GITHUB_BRANCH` | `main` |
| `SITE_USER` | `cendis` (o el que prefieras) |
| `SITE_PASSWORD` | La contraseña que le vas a compartir a tu equipo |

Marca las cuatro (o cinco) para los tres entornos (Production, Preview, Development) si Vercel te lo pregunta.

### 3. Deploy

Dale a **Deploy**. Cuando termine, Vercel te da la URL (algo como
`https://panel-central-cendis-noct.vercel.app`). Compártela junto con el usuario y
la contraseña que pusiste en `SITE_PASSWORD`.

## Actualizaciones después de esto

- **Montacarguistas / Puestos en Cero / PR Críticos**: cualquiera con el link
  y la contraseña puede cargar su Excel en el panel — se guarda solo, no hay
  que hacer nada más.
- **In-Transit / Ventanas / antigüedad PR / KPI / Auditorías**: le pides a
  Claude que corra el skill correspondiente y actualice `data/panel-data.json`
  en este repo (commit directo, o Pull Request si prefieres revisar antes).
- **Rotar la contraseña o el token**: cámbialos en Vercel → Environment
  Variables y vuelve a desplegar (Vercel lo hace solo al guardar en algunos
  planes, o dale a "Redeploy" manualmente).

## Seguridad

- El repo debería quedar **privado** — igual contiene datos operativos
  internos (SKUs, criticidad de PR, KPIs).
- El token de GitHub vive solo como variable de entorno en Vercel, nunca en
  el código ni en el repo.
- La contraseña del sitio es compartida (no hay usuarios individuales) — si
  alguien del equipo se va, cámbiala.
