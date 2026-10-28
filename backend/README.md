# Helpdesk backend

A helpdesk / support ticket alkalmazás REST API-ja (Node.js 24 LTS + Express 5 + Mongoose 9 / MongoDB).
Önálló projekt: saját `package.json`, `Dockerfile`, konténerben és Kubernetesben futtatható.

## Környezeti változók

| Név | Kötelező | Alapérték | Leírás |
|---|---|---|---|
| `MONGO_URI` | igen | – | MongoDB kapcsolati URI (helyben `mongodb://localhost:27017/helpdesk`, Atlasnál `mongodb+srv://...`) |
| `JWT_SECRET` | igen | – | A JWT tokenek aláírókulcsa (titok, Kubernetesben Secretből) |
| `PORT` | nem | `8080` | HTTP port |
| `NODE_ENV` | nem | `development` (az image-ben `production`) | `production` módban a hibaválasz nem tartalmaz stack trace-t |
| `TRUST_PROXY` | nem | `loopback, linklocal, uniquelocal` | Express „trust proxy” érték: mely proxyk `X-Forwarded-For` fejlécében bízzunk |

Ha egy kötelező változó hiányzik, a szerver induláskor érthető hibaüzenettel kilép (exit 1).
Mintának lásd: `.env.example`.

## Végpontok

| Útvonal | Leírás |
|---|---|
| `GET /healthz` | Liveness: mindig 200, ha a folyamat él (nem függ a MongoDB-től) |
| `GET /readyz` | Readiness: 200, ha a MongoDB kapcsolat él, különben 503 |
| `POST /api/users` | Regisztráció |
| `POST /api/users/login` | Bejelentkezés (JWT tokent ad vissza) |
| `GET /api/users/me` | Aktuális felhasználó (védett) |
| `GET, POST /api/tickets` | Saját ticketek listája / új ticket (védett) |
| `GET, PUT, DELETE /api/tickets/:id` | Egy ticket lekérése / módosítása (`product`, `description`, `status`) / törlése (védett) |
| `GET, POST /api/tickets/:ticketId/notes` | Egy ticket jegyzetei / új jegyzet (védett) |

A védett végpontokhoz `Authorization: Bearer <token>` fejléc kell.

## Fejlesztés

```bash
cp .env.example .env        # majd töltsd ki a JWT_SECRET-et
npm ci
npm run dev                 # node --env-file-if-exists=.env --watch server.js
```

A `.env`-et a Node beépített `--env-file-if-exists` kapcsolója tölti be, így nincs szükség a `dotenv`
csomagra. Az `npm start` (és a Docker image) NEM olvas `.env`-et: ott a változókat a környezet
(docker `--env-file`, Kubernetes ConfigMap / Secret) adja.

Helyi MongoDB például így indítható:

```bash
docker run -d --rm --name helpdesk-mongo -p 27017:27017 mongo:8.0
```

## Tesztek

Integrációs tesztek HTTP szinten. A tesztek az `app.js` Express appját importálják, szervert nem
indítanak, és **Supertesttel** hívják. A futtató a Node beépített **`node:test`**-je. A projekt
CommonJS, Node 24-en fut, és a `node:test` mindent tud, ami kell (`describe`/`it`, hookok,
`mock.method`, CI-barát kilépési kód). Így nem kell külön tesztkeretrendszer, és nincs ESM/CJS
átalakítási gond sem.

```bash
docker run -d --rm --name helpdesk-test-mongo -p 27018:27017 mongo:8.0
npm ci
npm run lint
MONGO_URI_TEST=mongodb://localhost:27018/helpdesk_test npm test
docker stop helpdesk-test-mongo
```

- **`MONGO_URI_TEST` (kötelező):** a teszt adatbázis címe. Ha hiányzik, a tesztek érthető üzenettel
  leállnak.
- **Védelem:** mivel a tesztek minden teszt előtt törlik az adatbázist, csak `mongodb://` séma,
  `localhost` / `127.0.0.1` / `mongo` host és `test`-et tartalmazó adatbázisnév engedélyezett (pl.
  `helpdesk_test`). Egy Atlas (`mongodb+srv://`) vagy fejlesztői cím ezért nem törlődhet. Az ellenőrzés
  a `pretest` lépésben és csatlakozás előtt is lefut.
- A `JWT_SECRET`-et a tesztek futásidőben, véletlenszerűen állítják be.
- A fájlok egymás után futnak (`--test-concurrency=1`), mert közös adatbázist használnak. Minden teszt
  előtt üres adatbázis jön létre, így a sorrend nem számít.

| Fájl | Mit tesztel |
|---|---|
| `test/dbGuard.test.js` | A `MONGO_URI_TEST` védelem (engedélyezett és tiltott címek) |
| `test/health.test.js` | `/healthz` 200; `/readyz` 200 élő kapcsolattal, és 503 kapcsolat nélkül |
| `test/users.test.js` | Regisztráció (sikeres, dupla e-mail, hiányzó mező, üres törzs), login (jó és rossz jelszó, nemlétező e-mail), `/me` (tokennel, token nélkül, hibás tokennel) |
| `test/tickets.test.js` | Létrehozás, validáció, listázás (csak a saját), lekérés, érvénytelen id, módosítás, törlés. Más felhasználó ticketjére GET/PUT/DELETE → 401, a ticket változatlan marad. |
| `test/notes.test.js` | Üres lista, jegyzet hozzáadása és listázása, validáció, token nélkül 401, más felhasználó ticketjén 401 |
| `test/regression.test.js` | A README „régi hibák” 1–5. pontja: váratlan hiba → 500 (nem 200), `deleteOne` tényleg töröl, nemlétező ticket (és jegyzetei) → 404, törölt felhasználó tokenje → 401, a PUT nem írja át a `user` mezőt és validál |

**Nyitott pont:** más felhasználó ticketjére a backend 401-et ad, a tesztek ezt az eredeti viselkedést
rögzítik. Szemantikailag a 403 vagy a 404 lenne pontosabb (lásd a gyökér README-t).

## Docker

```bash
docker build --platform linux/amd64 -t helpdesk-backend:local .
docker run --rm -p 8080:8080 --env-file .env \
  -e MONGO_URI=mongodb://host.docker.internal:27017/helpdesk helpdesk-backend:local
```

Az image jellemzői:
- multi-stage build, csak a futáshoz szükséges függőségekkel (`npm ci --omit=dev`);
- `node:24.22.1-slim` alap, numerikus nem root felhasználó (`USER 1000:1000`);
- az alkalmazás fájljai root tulajdonúak, a futó folyamat csak olvasni tudja őket;
- exec formájú `CMD ["node", "server.js"]`, így a node PID 1-ként kapja meg a SIGTERM-et.

## Működés konténerben / Kubernetesben

- **Logolás:** minden log soronként egy JSON objektum a stdout-ra (hibák a stderr-re), külön kérésnapló
  (`method`, `path`, `status`, `durationMs`, `ip`). A `/healthz` és `/readyz` hívásokat nem naplózza.
- **Szép leállás:** SIGTERM / SIGINT jelre nem fogad új kapcsolatot, megvárja a futó kéréseket,
  lezárja a Mongoose kapcsolatot, majd kilép. 10 mp után kényszerített kilépés.
- **MongoDB kiesés:** induláskor és menet közben is újrapróbálkozik. Ilyenkor a `/readyz` 503-at ad,
  így a Kubernetes nem küld forgalmat a podra, de a `/healthz` miatt nem is indítja újra.
- **Trust proxy:** a Gateway / load balancer mögött a `req.ip` a valódi kliens IP-t mutatja.
  Az alapérték a privát hálózatokból (VPC, docker hálózat) érkező proxykban bízik meg.
- A frontendet ez a szerver NEM szolgálja ki (külön konténer). Ismeretlen útvonalakra JSON 404 megy.
