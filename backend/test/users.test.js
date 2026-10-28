// Felhasználói végpontok: regisztráció, bejelentkezés, /me
const { describe, it, before, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const {
  app,
  request,
  connectTestDB,
  resetDB,
  closeTestDB,
  registerUser,
} = require('./helpers')

describe('felhasználók', () => {
  before(connectTestDB)
  beforeEach(resetDB)
  after(closeTestDB)

  describe('POST /api/users (regisztráció)', () => {
    it('sikeres regisztráció: 201, token, jelszó nélküli válasz', async () => {
      const { res, body } = await registerUser()
      assert.equal(res.status, 201)
      assert.equal(res.body.name, body.name)
      assert.equal(res.body.email, body.email)
      assert.ok(res.body._id)
      assert.equal(typeof res.body.token, 'string')
      assert.equal(res.body.password, undefined)
    })

    it('dupla e-mail: 400', async () => {
      const { body } = await registerUser()
      const res = await request(app).post('/api/users').send(body)
      assert.equal(res.status, 400)
      assert.equal(res.body.message, 'User already exists')
    })

    it('hiányzó mező: 400', async () => {
      for (const body of [
        { email: 'a@example.com', password: 'x' },
        { name: 'A', password: 'x' },
        { name: 'A', email: 'a@example.com' },
        {},
      ]) {
        const res = await request(app).post('/api/users').send(body)
        assert.equal(res.status, 400, JSON.stringify(body))
        assert.equal(res.body.message, 'Please include all fields')
      }
    })

    it('üres (törzs nélküli) kérés: 400, nem 500', async () => {
      const res = await request(app).post('/api/users')
      assert.equal(res.status, 400)
    })
  })

  describe('POST /api/users/login (bejelentkezés)', () => {
    it('jó jelszó: 200 és token', async () => {
      const { body } = await registerUser()
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: body.email, password: body.password })
      assert.equal(res.status, 200)
      assert.equal(res.body.email, body.email)
      assert.equal(typeof res.body.token, 'string')
    })

    it('rossz jelszó: 401', async () => {
      const { body } = await registerUser()
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: body.email, password: 'rossz-jelszo' })
      assert.equal(res.status, 401)
      assert.equal(res.body.message, 'Invalid credentials')
      assert.equal(res.body.token, undefined)
    })

    it('nem létező e-mail: 401', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'nincs@example.com', password: 'x' })
      assert.equal(res.status, 401)
    })
  })

  describe('GET /api/users/me', () => {
    it('érvényes tokennel: 200 és a felhasználó adatai', async () => {
      const { token, body, id } = await registerUser()
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { id, email: body.email, name: body.name })
    })

    it('token nélkül: 401', async () => {
      const res = await request(app).get('/api/users/me')
      assert.equal(res.status, 401)
      assert.equal(res.body.message, 'Not authorized')
    })

    it('hibás tokennel: 401', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer nem.ervenyes.token')
      assert.equal(res.status, 401)
    })
  })
})
