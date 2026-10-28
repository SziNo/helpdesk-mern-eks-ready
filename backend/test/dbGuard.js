// Védelem a rossz adatbázis ellen.
// A tesztek minden futás előtt TÖRLIK az adatbázist, ezért csak akkor futhatnak,
// ha a MONGO_URI_TEST biztosan egy teszt adatbázisra mutat:
//   - a séma mongodb:// (a mongodb+srv:// tipikusan Atlas / távoli cluster),
//   - minden host localhost, 127.0.0.1 vagy "mongo" (docker / CI service konténer),
//   - az adatbázis neve tartalmazza a "test" szót (pl. helpdesk_test).

const ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'mongo']

// Ellenőrzi a címet; hiba esetén { ok: false, reason }, egyébként { ok: true, dbName }
const validateTestMongoUri = (uri) => {
  if (!uri) {
    return { ok: false, reason: 'a MONGO_URI_TEST környezeti változó nincs megadva' }
  }

  if (!uri.startsWith('mongodb://')) {
    return {
      ok: false,
      reason:
        'csak mongodb:// cím engedélyezett (mongodb+srv:// vagy más séma nem, ' +
        'mert az jellemzően távoli / éles cluster)',
    }
  }

  // mongodb://[felhasználó:jelszó@]host1[:port][,host2...]/[adatbázis][?opciók]
  const rest = uri.slice('mongodb://'.length)
  const slash = rest.indexOf('/')
  const authority = slash === -1 ? rest : rest.slice(0, slash)
  const path = slash === -1 ? '' : rest.slice(slash + 1)
  const hostList = authority.slice(authority.lastIndexOf('@') + 1)

  const hosts = hostList
    .split(',')
    .map((h) => h.replace(/:\d+$/, '').toLowerCase())
  const badHosts = hosts.filter((h) => !ALLOWED_HOSTS.includes(h))
  if (hosts.length === 0 || badHosts.length > 0) {
    return {
      ok: false,
      reason:
        `nem engedélyezett host: ${badHosts.join(', ') || '(üres)'} ` +
        `(engedélyezett: ${ALLOWED_HOSTS.join(', ')})`,
    }
  }

  const dbName = decodeURIComponent(path.split('?')[0])
  if (!/test/i.test(dbName)) {
    return {
      ok: false,
      reason: `az adatbázis neve ("${dbName || '(nincs megadva)'}") nem tartalmazza a "test" szót`,
    }
  }

  return { ok: true, dbName }
}

const HELP =
  'Példa helyi futtatáshoz:\n' +
  '  docker run -d --rm --name helpdesk-test-mongo -p 27018:27017 mongo:8.0\n' +
  '  MONGO_URI_TEST=mongodb://localhost:27018/helpdesk_test npm test'

// Ellenőrzés; hiba esetén kivételt dob, így a tesztek bármilyen törlés előtt leállnak
const assertTestMongoUri = (uri) => {
  const result = validateTestMongoUri(uri)
  if (!result.ok) {
    throw new Error(
      `A tesztek nem futnak: ${result.reason}.\n` +
        'A tesztek minden futás előtt törlik az adatbázist, ezért csak helyi / CI ' +
        'teszt adatbázison futhatnak.\n' +
        HELP
    )
  }
  return result
}

module.exports = { validateTestMongoUri, assertTestMongoUri, HELP }
