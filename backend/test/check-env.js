// "pretest" lépés: az npm test előtt fut le.
// Ha a MONGO_URI_TEST hiányzik vagy nem biztonságos teszt adatbázisra mutat,
// érthető üzenettel, nem nulla kilépési kóddal leállítja a tesztelést,
// még mielőtt bármilyen adatbázis művelet történne.
const { assertTestMongoUri } = require('./dbGuard')

try {
  const { dbName } = assertTestMongoUri(process.env.MONGO_URI_TEST)
  console.log(`Teszt adatbázis: ${dbName}`)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
