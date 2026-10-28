// Ticket végpontok: CRUD és a jogosultság ellenőrzése
const { describe, it, before, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const {
  app,
  request,
  connectTestDB,
  resetDB,
  closeTestDB,
  registerUser,
  createTicket,
} = require('./helpers')

const auth = (token) => ({ Authorization: `Bearer ${token}` })

describe('ticketek', () => {
  let owner

  before(connectTestDB)
  beforeEach(async () => {
    await resetDB()
    owner = await registerUser()
  })
  after(closeTestDB)

  it('létrehozás: 201, status "new", a tulajdonos a bejelentkezett felhasználó', async () => {
    const res = await createTicket(owner.token, { product: 'iPad' })
    assert.equal(res.status, 201)
    assert.equal(res.body.product, 'iPad')
    assert.equal(res.body.description, 'Nem kapcsol be')
    assert.equal(res.body.status, 'new')
    assert.equal(res.body.user, owner.id)
  })

  it('létrehozás hiányzó mezővel: 400', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set(auth(owner.token))
      .send({ product: 'iPhone' })
    assert.equal(res.status, 400)
  })

  it('létrehozás érvénytelen termékkel: 400', async () => {
    const res = await createTicket(owner.token, { product: 'Nokia 3310' })
    assert.equal(res.status, 400)
  })

  it('token nélkül: 401', async () => {
    const res = await request(app).get('/api/tickets')
    assert.equal(res.status, 401)
  })

  it('listázás: csak a saját ticketek', async () => {
    const other = await registerUser()
    await createTicket(owner.token, { product: 'iPhone' })
    await createTicket(owner.token, { product: 'iMac' })
    await createTicket(other.token, { product: 'iPad' })

    const res = await request(app).get('/api/tickets').set(auth(owner.token))
    assert.equal(res.status, 200)
    assert.equal(res.body.length, 2)
    assert.deepEqual(res.body.map((t) => t.product).sort(), ['iMac', 'iPhone'])
    assert.ok(res.body.every((t) => t.user === owner.id))
  })

  it('egy ticket lekérése: 200', async () => {
    const created = await createTicket(owner.token)
    const res = await request(app)
      .get(`/api/tickets/${created.body._id}`)
      .set(auth(owner.token))
    assert.equal(res.status, 200)
    assert.equal(res.body._id, created.body._id)
  })

  it('érvénytelen azonosító: 404', async () => {
    const res = await request(app).get('/api/tickets/abc').set(auth(owner.token))
    assert.equal(res.status, 404)
  })

  it('módosítás (lezárás): 200 és a módosított ticket', async () => {
    const created = await createTicket(owner.token)
    const res = await request(app)
      .put(`/api/tickets/${created.body._id}`)
      .set(auth(owner.token))
      .send({ status: 'closed', description: 'Megoldva' })
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'closed')
    assert.equal(res.body.description, 'Megoldva')
  })

  it('törlés: 200, utána a lekérés 404', async () => {
    const created = await createTicket(owner.token)
    const del = await request(app)
      .delete(`/api/tickets/${created.body._id}`)
      .set(auth(owner.token))
    assert.equal(del.status, 200)
    assert.deepEqual(del.body, { success: true })

    const get = await request(app)
      .get(`/api/tickets/${created.body._id}`)
      .set(auth(owner.token))
    assert.equal(get.status, 404)
  })

  // MEGJEGYZÉS: a másik felhasználó ticketjére a backend 401-et ad (az eredeti
  // viselkedés, a teszt ezt rögzíti). Szemantikailag a 403 (Forbidden), vagy
  // az információszivárgás elkerülésére a 404 lenne pontosabb, mert a kérés
  // hitelesített, csak nincs jogosultsága. Lásd a README nyitott pontjait.
  describe('másik felhasználó ticketje', () => {
    let ticketId
    let intruder

    beforeEach(async () => {
      ticketId = (await createTicket(owner.token)).body._id
      intruder = await registerUser()
    })

    it('GET: 401', async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set(auth(intruder.token))
      assert.equal(res.status, 401)
    })

    it('PUT: 401, és a ticket nem változik', async () => {
      const res = await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set(auth(intruder.token))
        .send({ status: 'closed' })
      assert.equal(res.status, 401)

      const check = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set(auth(owner.token))
      assert.equal(check.body.status, 'new')
    })

    it('DELETE: 401, és a ticket megmarad', async () => {
      const res = await request(app)
        .delete(`/api/tickets/${ticketId}`)
        .set(auth(intruder.token))
      assert.equal(res.status, 401)

      const check = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set(auth(owner.token))
      assert.equal(check.status, 200)
    })
  })
})
