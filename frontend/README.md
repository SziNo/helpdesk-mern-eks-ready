# Helpdesk frontend

A helpdesk / support ticket alkalmazás React felülete (React 19, Redux Toolkit 2, React Router 8),
Vite-tal buildelve. Élesben egy nem root nginx konténer szolgálja ki a statikus buildet.
Önálló projekt: saját `package.json`, `Dockerfile`, nginx konfiguráció.

## API hívások

A kód kizárólag **relatív** útvonalakat hív (`/api/...`). Nincs beégetett szervercím és nincs build
idejű API URL: ugyanaz az image minden környezetben használható.
- **Élesben** a frontend és a backend egy domainen van: a Kubernetes Gateway a `/` útvonalat a
  frontendre, az `/api`-t a backendre irányítja. A frontend nginx-e az `/api`-t szándékosan NEM proxyzza.
- **Fejlesztéskor** a Vite dev szerver proxyzza az `/api` kéréseket a backendre
  (alapból `http://localhost:8080`, a `VITE_DEV_API_TARGET` változóval módosítható).

## Scriptek

```bash
npm ci
npm run dev       # Vite dev szerver: http://localhost:3000 (a backend fusson a 8080-as porton)
npm run build     # éles build a dist/ mappába
npm run preview   # a build kipróbálása helyben
npm run lint      # ESLint (flat config, react-hooks és react-refresh szabályok)
```

Tesztek: az eredeti CRA projektben tesztfájl nem volt, csak a tesztfüggőségek. Ezek kikerültek,
ezért nincs `npm test`. Ha később kell, a Vitest illeszkedik a Vite-hoz.

## Környezeti változók

Futásidejű változó nincs. Az egyetlen, opcionális, csak fejlesztéshez használt változó
(lásd `.env.example`):

| Név | Kötelező | Leírás |
|---|---|---|
| `VITE_DEV_API_TARGET` | nem | A Vite dev proxy célja (alapértelmezés: `http://localhost:8080`) |

## Docker

```bash
docker build --platform linux/amd64 -t helpdesk-frontend:local .
docker run --rm -p 8081:8080 helpdesk-frontend:local
curl http://localhost:8081/healthz
```

Az image jellemzői (`nginx/default.conf`):
- 1. szakasz: `node:24.22.1-slim` (`npm ci`, `npm run build`); 2. szakasz:
  `nginxinc/nginx-unprivileged:1.30.6-alpine`, benne csak a `dist/` tartalma és a konfiguráció;
- nem root felhasználó (UID 101), `listen 8080`;
- `GET /healthz` → 200 (a SPA fallback előtt, pontos egyezéssel);
- SPA fallback (`try_files $uri /index.html`): a React Router útvonalai frissítéskor sem adnak 404-et.
  Ismeretlen útvonalon is az `index.html` jön vissza, a „nem található” oldalt a React mutatja
  (`path="*"` → `src/pages/NotFound.jsx`);
- a hash-elt `/assets/*` fájlok 1 éves, `immutable` cache-t kapnak, az `index.html` `no-cache`-t.
