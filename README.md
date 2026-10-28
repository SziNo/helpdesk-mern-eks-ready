# Helpdesk – EKS-re előkészített MERN alkalmazás

Ez a repó egy régi MERN (MongoDB, Express, React, Node) helpdesk / support ticket alkalmazás
**„cloud native” változata**, amely konténerekben, Kubernetesen (Amazon EKS), a Gateway API mögött,
CI/CD-vel (később Argo CD-s GitOps) való futtatásra van előkészítve.

> **Megjegyzés:** később csak a `backend/` és a `frontend/` mappa kerül át egy nagyobb EKS
> projektbe. Ezért mindkettő teljesen önálló: saját `package.json`, `package-lock.json`,
> `Dockerfile`, `.dockerignore`, `.gitignore`, `.env.example` és `README.md`. A gyökérben lévő
> `docker-compose.yml` és `gateway/` csak a helyi teszteléshez kell.

```
helpdesk-eks-ready/
├── README.md
├── .gitignore
├── docker-compose.yml     # helyi teszt: mongo + backend + frontend + gateway
├── gateway/nginx.conf     # csak a compose-hoz: helyben utánozza a Gateway API-t
├── backend/               # Node 24 + Express 5 + Mongoose 9 REST API (port 8080)
└── frontend/              # React 19 + Vite, nem root nginx konténerben (port 8080)
```

## Architektúra

```
                 ┌────────────── Kubernetes Gateway (helyben: gateway nginx, :8000) ──────────────┐
  böngésző ──►   │  PathPrefix "/api"  ──►  backend:8080   (Express API)  ──►  MongoDB (Atlas)     │
                 │  PathPrefix "/"     ──►  frontend:8080  (nginx, statikus React build)           │
                 └─────────────────────────────────────────────────────────────────────────────────┘
```

A frontend és a backend **egy domainen** van, ezért nincs szükség CORS-ra, és a frontend relatív
`/api/...` útvonalakat hív, build idejű API URL nélkül.

---

## Mi változott az eredetihez képest

### Szerkezet
- **Szétválasztott frontend és backend.** A gyökér `package.json` (a `concurrently`-s dev scripttel)
  megszűnt, a két rész önálló projekt, külön Docker image-dzsel.
- **A backend már nem szolgálja ki a frontendet.** Kikerült a `NODE_ENV=production` ágban lévő
  `express.static(frontend/build)` és a `'*'` „catch-all” route (ez Express 5-ben amúgy is érvénytelen
  szintaxis lenne). A frontend külön nginx konténerben fut, az útválasztást a Gateway végzi.
  A régi `GET /` „Welcome” üzenet is kikerült. Ismeretlen útvonalra a backend JSON 404-et ad.
- **Port:** a backend az 5000 helyett a **8080**-as porton fut (`PORT`-tal felülírható).
  A frontend konténer is a 8080-as porton figyel.

### Verziók (régi → új)

Az új verziók a `package-lock.json` szerint ténylegesen telepített verziók.

**Backend**

| Csomag | Régi | Új | Szükséges kódváltozás |
|---|---|---|---|
| Node.js | (nem volt rögzítve) | **24 LTS** (`engines: >=24`, image: `node:24.22.1-slim`) | – |
| express | ^4.18.2 | **5.3.0** | Az async hibák automatikusan a hibakezelőhöz kerülnek, ezért kikerült az `express-async-handler`. A `'*'` route megszűnt. A `req.body` üres kérésnél `undefined`, ezért `req.body ?? {}` / `req.body?.x` került a kódba. Az `app.listen` hibája a callbackbe érkezik. |
| mongoose | ^6.6.5 | **9.11.4** | `ticket.remove()` → `ticket.deleteOne()` (7.0 óta). A `findByIdAndUpdate` `new: true` opciója → `returnDocument: 'after'` (9.2 óta elavult). A `mongoose.Schema(...)` → `new mongoose.Schema(...)`. A `connect` / `close` csak promise-t ad. |
| jsonwebtoken | ^8.5.1 | **9.0.3** | Nem kellett változtatni (a `sign` / `verify` használat kompatibilis) |
| bcryptjs | ^2.4.3 | **3.0.3** | Nem kellett változtatni. Az új hash-ek `$2b$` előtagúak, a régi `$2a$` hash-ek továbbra is ellenőrizhetők. |
| dotenv | ^16.0.3 | **kivéve** | Helyette a Node beépített `--env-file-if-exists=.env` kapcsolója (`npm run dev`) |
| express-async-handler | ^1.2.0 | **kivéve** | Express 5-ben beépített az async hibakezelés |
| colors | ^1.4.0 | **kivéve** | Színes konzolkimenet helyett strukturált JSON log a stdout-ra |
| concurrently | ^7.4.0 | **kivéve** | Csak a közös dev scripthez kellett, a projektek különváltak |
| nodemon | (globális) | **kivéve** | Helyette a Node beépített `--watch` kapcsolója |

**Frontend**

| Csomag | Régi | Új | Szükséges kódváltozás |
|---|---|---|---|
| react-scripts (CRA) | 5.0.1 | **Vite 8.3.5** + @vitejs/plugin-react 6.1.2 | Lásd lent: CRA → Vite |
| react / react-dom | ^18.2.0 | **19.3.1** | Nem kellett változtatni (a `createRoot` már használatban volt) |
| react-router-dom | ^6.4.2 | **react-router 8.5.1** | A v8-ban a `react-router-dom` megszűnt, minden import `'react-router'`-ből jön. A deklaratív módot (`BrowserRouter`, `Routes`, `Route`, `Link`, `Navigate`, `Outlet`, hookok) más nem érintette. Minimum: Node 22.22+, React 19.2.7+. |
| @reduxjs/toolkit | ^1.8.6 | **2.13.0** | Az `extraReducers` már builder callback formájú volt. A `logout` `createAction` prepare callbackje `{}` helyett `{ payload: undefined }`-ot ad vissza. |
| react-redux | ^8.0.4 | **9.3.1** | Nem kellett változtatni |
| axios | ^1.1.2 | **1.21.0** | Nem kellett változtatni |
| react-toastify | ^9.0.8 | **11.1.0** | A v11 magától injektálja a CSS-t, ezért az `import 'react-toastify/dist/ReactToastify.css'` kikerült |
| react-icons | ^4.4.0 | **5.7.0** | Nem kellett változtatni (a használt `Fa*` ikonok megvannak) |
| react-modal | ^3.15.1 | **3.16.3** | Nem kellett változtatni (a peer függőség a React 19-et is engedi) |
| @testing-library/*, web-vitals | | **kivéve**, később újra | Tesztfájl nem volt, a CRA-s tesztfüggőségek kikerültek. A Testing Library a Vitest alapú tesztekkel tért vissza (lásd [Tesztek](#tesztek)). |
| ESLint | CRA beépített (`react-app`) | **eslint 10.13.0** flat config, eslint-plugin-react-hooks 7.1.1, eslint-plugin-react-refresh 0.5.7 | A react-hooks 7 `set-state-in-effect` szabálya miatt a `useAuthStatus` hook effect nélkül, közvetlenül a store-ból számolja az állapotot |

### CRA → Vite
- A Create React App-et már nem fejlesztik, a build eszköz Vite lett.
- Az `index.html` a `public/` mappából a projekt gyökerébe került. A `%PUBLIC_URL%` helyett abszolút
  útvonalak szerepelnek benne, és `<script type="module" src="/src/main.jsx">` tölti be az alkalmazást.
- A JSX-et tartalmazó `.js` fájlok `.jsx`-re lettek átnevezve (`index.js` → `main.jsx`,
  `App.js` → `App.jsx`), mert a Vite csak a `.jsx` fájlokban fordít JSX-et.
- A régi `"proxy": "http://localhost:5000"` mező helyett a `vite.config.js` proxy beállítása
  (`/api` → `http://localhost:8080`) működik. A dev szerver portja továbbra is 3000.
- A build kimenete a `build/` helyett a `dist/` mappa. A hash-elt fájlok a `dist/assets/` alá kerülnek.
- Tesztek: az eredeti projektben **nem volt tesztfájl**. Az új tesztek Vitesttel futnak
  (lásd [Tesztek](#tesztek)).

### Új 404-es oldal (frontend)
- A React Routerben eddig nem volt `"*"` útvonal, ezért egy ismeretlen címen (pl. `/valami`) csak a
  fejléc jelent meg, alatta üres oldal. Most a route-lista végén egy `path="*"` útvonal a
  `NotFound` oldalt mutatja (`src/pages/NotFound.jsx`). Az oldal a meglévő stílust használja, és
  egy linkkel visz vissza a kezdőlapra.
- Az nginx ismeretlen útvonalra továbbra is az `index.html`-t adja (SPA fallback, HTTP 200), a
  „nem található” oldalt a React jeleníti meg. Ismeretlen `/api/...` útvonalra a backend JSON 404-et ad.

### Új, konténer- / Kubernetes-barát működés (backend)
- **Health végpontok:** `GET /healthz` (liveness, mindig 200, ha a folyamat él) és `GET /readyz`
  (readiness, 200 csak akkor, ha a Mongoose kapcsolat él, különben 503).
- **Kötelező környezeti változók ellenőrzése:** ha a `MONGO_URI` vagy a `JWT_SECRET` hiányzik,
  a szerver induláskor érthető hibával kilép.
- **Szép leállás:** SIGTERM / SIGINT jelre lezárja a HTTP szervert (megvárja a futó kéréseket),
  majd a Mongoose kapcsolatot, és kilép. 10 mp után kényszerített kilépés.
- **Újrapróbálkozó MongoDB kapcsolat:** a régi kód csatlakozási hibánál `process.exit(1)`-gyel
  leállt. Az új exponenciális visszalépéssel újrapróbálkozik, közben a `/readyz` 503-at ad.
- **Trust proxy:** `app.set('trust proxy', ...)`, alapból `loopback, linklocal, uniquelocal`
  (`TRUST_PROXY`-val állítható), így a `req.ip` az `X-Forwarded-For` alapján a valódi kliens IP.
- **Logolás a stdout-ra:** soronként egy JSON objektum, kérésnaplóval (`method`, `path`, `status`,
  `durationMs`, `ip`).
- Hibakezelés: az érvénytelen ObjectId 404-et, a séma validációs hiba és a hibás JSON törzs 400-at
  ad (korábban 500 vagy 200 volt).

### A régi kódban talált, a frissítéstől független hibák javítása
Ezek a hibák már az eredeti kódban is megvoltak, nem a verziófrissítés okozta őket:

1. **`errorMiddleware` státuszkód.** *Hiba:* a `res.statusCode ? res.statusCode : 500` feltétel mindig
   igaz volt, mert a `res.statusCode` alapértéke 200. Így minden váratlan hiba (pl. adatbázis hiba)
   **200 OK** státusszal ment vissza. *Javítás:* ha a státusz nem hibakód (< 400), akkor 500.
2. **Ticket törlése: `remove()` → `deleteOne()`.** *Hiba:* a `ticket.remove()` a Mongoose 7 óta nem
   létezik, ezért a `DELETE /api/tickets/:id` mindig elszállt volna. *Javítás:* `await ticket.deleteOne()`.
3. **Nemlétező ticket jegyzetei: 404.** *Hiba:* a `noteController` nem ellenőrizte, hogy a ticket
   létezik-e, így nemlétező ticketre `TypeError` (`Cannot read properties of null`) és 500 lett
   a válasz. *Javítás:* `404 Ticket not found`.
4. **Törölt felhasználó tokenje: 401.** *Hiba:* a `protect` middleware a már törölt felhasználó
   érvényes tokenjével `req.user = null` mellett továbbengedte a kérést, ami később hibához vezetett.
   *Javítás:* ha a felhasználó nem létezik, `401 Not authorized`.
5. **`updateTicket` mezőkorlátozás.** *Hiba:* a végpont a teljes `req.body`-t mentette, így a kliens
   bármely mezőt átírhatott, például a ticket tulajdonosát (`user`). Validáció sem futott (enum).
   *Javítás:* csak a `product`, `description` és `status` mező módosítható, `runValidators: true` mellett.
6. **Ticket lezárása oldalfrissítés után (frontend).** *Hiba:* ha a `/ticket/:id` oldalt frissítették
   (F5), majd a „Close Ticket” gombra kattintottak, a backend lezárta a ticketet, de a felületen nem
   történt semmi: nem jött toast és átirányítás sem. Ennek két oka volt:
   - A `ticketSlice` `closeTicket.fulfilled` reducere `state.tickets.map(...)`-et hívott. A `tickets`
     kezdőállapota `null`, és frissítés után a lista még nincs betöltve, így ez `TypeError`-t dobott.
   - A `.catch(toast.error)` a teljes Error objektumot adta át a toastnak, ezért hibaüzenet sem jelent meg.

   *Javítás:*
   - A reducer csak akkor frissíti a listát, ha az már be van töltve. A `/tickets` oldal úgyis újratölti.
   - Ugyanez a minta megvolt a `noteSlice` `createNote.fulfilled` reducerében is (`state.notes.push` null
     listára, ha a jegyzetek lekérése hibára futott), ezt is javítottam.
   - A ticket létrehozásánál nincs ilyen reducer, ott nem volt hiba.
   - Az összes `.catch(toast.error)` helyére az új `toastError` segédfüggvény került (`src/utils.js`).
     Ez a `rejectWithValue` szöveges üzenetét és a váratlan Error / SerializedError objektumot is
     olvasható szöveggé alakítja.

---

## Környezeti változók

**Backend** (minta: `backend/.env.example`)

| Név | Kötelező | Leírás |
|---|---|---|
| `MONGO_URI` | **igen** | MongoDB kapcsolati URI (helyben `mongodb://localhost:27017/helpdesk`, Atlasnál `mongodb+srv://...`) |
| `JWT_SECRET` | **igen** | A JWT tokenek aláírókulcsa. Titok: Kubernetesben Secretből jöjjön. |
| `PORT` | nem | HTTP port, alapértelmezés `8080` |
| `NODE_ENV` | nem | `production` esetén a hibaválaszban nincs stack trace (az image-ben ez az alapérték) |
| `TRUST_PROXY` | nem | Express „trust proxy” érték, alapértelmezés `loopback, linklocal, uniquelocal` |

**Frontend:** futásidejű változó nincs. Az opcionális `VITE_DEV_API_TARGET` csak a Vite dev proxy
célját állítja (alapértelmezés `http://localhost:8080`).

Titok (jelszó, kulcs) egyik fájlban sincs. A `.env` fájlok git- és docker-ignore-oltak.
JWT kulcs generálása:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Portok és végpontok

| Szolgáltatás | Konténer port | Végpontok |
|---|---|---|
| backend | 8080 | `GET /healthz`, `GET /readyz`, `/api/users` (`POST /`, `POST /login`, `GET /me`), `/api/tickets` (`GET`, `POST`, `GET/PUT/DELETE /:id`, `GET/POST /:ticketId/notes`) |
| frontend | 8080 | `GET /healthz`, minden más: statikus fájl vagy SPA fallback (`index.html`) |
| gateway (csak compose) | 8080 → **localhost:8000** | `/api` → backend, `/` → frontend |
| mongo (csak compose) | 27017 (csak belső hálózat) | – |

A `/healthz` és `/readyz` a Kubernetes probe-oknak szól (közvetlenül a podot hívják).
A Gateway-en keresztül nem érhetők el, mert a backendre csak az `/api` prefix van irányítva.

---

## Helyi futtatás

### Fejlesztői mód (`npm run dev` mindkettőben)

```bash
# 1. MongoDB (a verzió egyezzen az Atlas clusterrel, lásd lent)
docker run -d --rm --name helpdesk-mongo -p 27017:27017 mongo:8.0

# 2. Backend – http://localhost:8080
cd backend
cp .env.example .env          # töltsd ki a JWT_SECRET-et
npm ci
npm run dev                   # node --env-file-if-exists=.env --watch server.js

# 3. Frontend – http://localhost:3000 (az /api-t a Vite a 8080-ra proxyzza)
cd frontend
npm ci
npm run dev
```

### Docker Compose (a Kubernetes felállás utánzása)

```bash
cp backend/.env.example backend/.env   # töltsd ki a JWT_SECRET-et
docker compose up --build              # http://localhost:8000
docker compose down -v                 # leállítás + az adatbázis volume törlése
```

- Kívülről csak a **gateway** érhető el (`localhost:8000`). A mongo, a backend és a frontend csak a
  compose hálózaton belül látszik.
- A backend változói a `backend/.env` fájlból jönnek (`env_file`). A compose fájl csak a nem titkos
  `MONGO_URI=mongodb://mongo:27017/helpdesk` és `NODE_ENV=production` értéket írja felül.
- A `gateway/nginx.conf` a Gateway API HTTPRoute-ot utánozza (`PathPrefix /api` → backend,
  `PathPrefix /` → frontend), és beállítja az `X-Forwarded-For`, `X-Real-IP` és `X-Forwarded-Proto`
  fejléceket.
- **MongoDB verzió:** a compose `mongo:8.0` image-et használ, mert élesben MongoDB Atlas lesz.
  **A compose mongo főverzióját mindig az Atlas cluster verziójához kell igazítani**, hogy a helyi
  teszt ugyanazzal a szerververzióval fusson, mint az éles adatbázis. Ha az Atlas cluster frissül,
  frissítsd a `docker-compose.yml`-ben az `image: mongo:X.Y` sort is.

## Tesztek

Mindkét projekt `npm test` parancsa egyszer fut le (nincs watch mód), és a kilépési kódja jelzi az
eredményt, így GitHub Actions pipeline-ban közvetlenül használható. Mindkettőben van `npm run lint` is.

| | Eszközök | Tesztek | Mit fednek le |
|---|---|---|---|
| **backend** | Node beépített `node:test` + Supertest, valódi MongoDB | 42 | A rossz adatbázis elleni védelem, `/healthz` és `/readyz` (MongoDB-vel és nélküle), regisztráció, login, `/me`, ticket CRUD, más felhasználó ticketjének tiltása, jegyzetek, a „régi hibák” 1–5. pontjának regressziós tesztjei |
| **frontend** | Vitest + jsdom + React Testing Library | 20 | `ticketSlice` / `noteSlice` reducerek (a 6. régi hiba regressziója), `toastError` / `extractErrorMessage`, a 404-es oldal ismeretlen útvonalon, a Login űrlap mockolt API-val (elutasított és sikeres bejelentkezés) |

A tesztek nem függenek a futtatás sorrendjétől és a gép időzónájától:
- A backendben minden teszt előtt üres adatbázis jön létre.
- A frontendben minden teszt friss Redux store-t kap, és a teszt után törlődik a `localStorage`. Az időzóna `UTC`-re van rögzítve.
- Helyben ellenőrizve: a frontend véletlen sorrendben (`--sequence.shuffle`) is lefut, és mindkét projekt `TZ=Pacific/Auckland` mellett is.

### Futtatás helyben

```bash
# Backend – ideiglenes MongoDB konténerrel (külön porton, hogy ne ütközzön a fejlesztői mongóval)
docker run -d --rm --name helpdesk-test-mongo -p 27018:27017 mongo:8.0
cd backend
npm ci
npm run lint
MONGO_URI_TEST=mongodb://localhost:27018/helpdesk_test npm test
docker stop helpdesk-test-mongo          # a --rm miatt a konténer törlődik is

# Frontend – nem kell hozzá adatbázis és hálózat (az API hívások mockolva)
cd frontend
npm ci
npm run lint
npm test
npm run build
```

### Környezeti változó: `MONGO_URI_TEST` (csak a backend teszteknek)

| Név | Kötelező | Leírás |
|---|---|---|
| `MONGO_URI_TEST` | **igen** (a backend tesztekhez) | A teszt MongoDB címe, pl. `mongodb://localhost:27018/helpdesk_test`. CI-ban egy `mongo:8.0` service konténer, pl. `mongodb://localhost:27017/helpdesk_test` vagy `mongodb://mongo:27017/helpdesk_test`. |

A `JWT_SECRET`-et a tesztek futásidőben, véletlenszerűen állítják be, ezért a tesztekhez nem kell `.env`.

**Védelem a rossz adatbázis ellen.** A backend tesztek minden teszt előtt **törlik a teljes
adatbázist** (`dropDatabase`). Ha a `MONGO_URI_TEST` véletlenül egy fejlesztői, éles vagy Atlas
adatbázisra mutatna, a tesztfuttatás minden adatát törölné. Ezért a tesztek csak akkor futnak, ha
a cím biztosan egy teszt adatbázisra mutat:
- a séma `mongodb://`, tehát a `mongodb+srv://` (Atlas) cím tiltott;
- minden host `localhost`, `127.0.0.1` vagy `mongo` (docker / CI service konténer);
- az adatbázis neve tartalmazza a `test` szót (pl. `helpdesk_test`).

Minden más esetben a tesztek érthető hibaüzenettel, nem nulla kilépési kóddal leállnak, még mielőtt
bármilyen adatbázis művelet történne. A hiányzó változóra ugyanez vonatkozik. Az ellenőrzés kétszer
fut le:
- az `npm test` előtti `pretest` lépésben (`test/check-env.js`);
- minden csatlakozás előtt a tesztsegédben (`test/helpers.js`), így közvetlen `node --test` futtatásnál is.

A védelmet a `test/dbGuard.test.js` tesztjei ellenőrzik.

## Nyitott pontok

- **Más felhasználó ticketje: 401 helyett 403 vagy 404.** Ha egy bejelentkezett felhasználó egy másik
  felhasználó ticketjét (vagy annak jegyzeteit) kéri le, módosítja vagy törli, a backend **401
  Unauthorized**-ot ad. Ez az eredeti viselkedés, a tesztek ezt rögzítik. Szemantikailag pontosabb lenne:
  - a **403 Forbidden**, mert a kérés hitelesített, csak nincs jogosultsága;
  - vagy a **404 Not Found**, ha nem akarjuk elárulni, hogy az adott azonosítójú ticket létezik.

  A 401-et a frontend is „ki kell jelentkezni” jelzésnek értelmezhetné. Ha változik, a
  `backend/test/tickets.test.js` és a `notes.test.js` érintett tesztjeit is frissíteni kell.

## Docker build parancsok

Mindkét image `linux/amd64`-re is buildelhető (EKS x86 node-ok):

```bash
docker build --platform linux/amd64 -t helpdesk-backend:local  ./backend
docker build --platform linux/amd64 -t helpdesk-frontend:local ./frontend

# Futtatás önállóan
docker run --rm -p 8080:8080 --env-file backend/.env \
  -e MONGO_URI=mongodb://host.docker.internal:27017/helpdesk helpdesk-backend:local
docker run --rm -p 8081:8080 helpdesk-frontend:local
```

| Image | Build szakasz | Futtató szakasz | Felhasználó |
|---|---|---|---|
| backend | `node:24.22.1-slim`, `npm ci --omit=dev` | `node:24.22.1-slim`, `CMD ["node", "server.js"]` | `1000:1000` |
| frontend | `node:24.22.1-slim`, `npm ci` + `npm run build` | `nginxinc/nginx-unprivileged:1.30.6-alpine` | `101` |

---

## Döntések

**A frontend konténerben fut.** A frontend konténerben fut, hogy a későbbi Argo CD-s GitOps telepítés
egységes legyen. Statikus fájlokra az S3 + CloudFront olcsóbb és jobban skálázódó megoldás lenne;
ezt a GitOps egységesség miatt nem ezt választottuk.

**dotenv helyett `--env-file-if-exists`.** A Node 20.6+ beépítetten tud `.env`-et olvasni, így eggyel
kevesebb a függőség. A kapcsoló csak az `npm run dev` scriptben szerepel. Az `npm start` és a Docker
image a valódi környezeti változókra támaszkodik (ConfigMap / Secret).

**Nincs CORS.** A frontend és a backend egy domainen van a Gateway mögött, ezért nincs rá szükség.

**Trust proxy alapértéke.** A `true` minden proxyban megbízna, így a kliens bármilyen
`X-Forwarded-For` értéket hamisíthatna. Az alapérték ezért csak a privát címtartományokban bízik meg
(VPC-ben a load balancer és a Gateway, helyben a docker hálózat). Ha az EKS-ben más a hálózati
felállás, a `TRUST_PROXY` változóval pontosítható (pl. a VPC CIDR-jére).
