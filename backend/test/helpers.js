// Közös segédfüggvények az integrációs tesztekhez.
const crypto = require('node:crypto')
const mongoose = require('mongoose')
const request = require('supertest')
const { assertTestMongoUri } = require('./dbGuard')

// Teszt környezet: véletlen JWT kulcs futásidőben (nem kerül fájlba)
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex')

const createApp = require('../app')

// Az app a szerver (listen) indítása nélkül; a Supertest közvetlenül hívja
const app = createApp({ trustProxy: 'loopback' })

// Csatlakozás a teszt adatbázishoz. A védelem itt is lefut (nem csak a
// pretest lépésben), így közvetlen `node --test` futtatásnál sem törölhet
// rossz adatbázist.
const connectTestDB = async () => {
  const uri = process.env.MONGO_URI_TEST
  assertTestMongoUri(uri)
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  }
}

// Üres adatbázis minden teszt előtt, hogy a tesztek ne függjenek a sorrendtől.
// Az indexeket (pl. a User e-mail unique indexe) újra létrehozzuk.
const resetDB = async () => {
  await mongoose.connection.dropDatabase()
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.syncIndexes())
  )
}

const closeTestDB = () => mongoose.connection.close()

let counter = 0

// Felhasználó regisztrálása; visszaadja a választ és a tokent
const registerUser = async (overrides = {}) => {
  counter += 1
  const body = {
    name: `Teszt Felhasználó ${counter}`,
    email: `user${counter}-${Date.now()}@example.com`,
    password: 'Jelszo123!',
    ...overrides,
  }
  const res = await request(app).post('/api/users').send(body)
  return { res, body, token: res.body.token, id: res.body._id }
}

// Ticket létrehozása egy felhasználó nevében
const createTicket = (token, overrides = {}) =>
  request(app)
    .post('/api/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send({ product: 'iPhone', description: 'Nem kapcsol be', ...overrides })

module.exports = {
  app,
  request,
  connectTestDB,
  resetDB,
  closeTestDB,
  registerUser,
  createTicket,
}
