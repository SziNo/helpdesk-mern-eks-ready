// Jegyzet végpontok
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

describe('jegyzetek', () => {
  let owner
  let ticketId

  before(connectTestDB)
  beforeEach(async () => {
    await resetDB()
    owner = await registerUser()
    ticketId = (await createTicket(owner.token)).body._id
  })
  after(closeTestDB)

  it('új ticketnek nincs jegyzete: üres lista', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}/notes`)
      .set(auth(owner.token))
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, [])
  })

  it('jegyzet hozzáadása és listázása', async () => {
    const add = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set(auth(owner.token))
      .send({ text: 'Újraindítás nem segített' })
    assert.equal(add.status, 200)
    assert.equal(add.body.text, 'Újraindítás nem segített')
    assert.equal(add.body.isStaff, false)
    assert.equal(add.body.ticket, ticketId)
    assert.equal(add.body.user, owner.id)

    const list = await request(app)
      .get(`/api/tickets/${ticketId}/notes`)
      .set(auth(owner.token))
    assert.equal(list.status, 200)
    assert.equal(list.body.length, 1)
    assert.equal(list.body[0]._id, add.body._id)
  })

  it('szöveg nélküli jegyzet: 400', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set(auth(owner.token))
      .send({})
    assert.equal(res.status, 400)
  })

  it('token nélkül: 401', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}/notes`)
    assert.equal(res.status, 401)
  })

  // MEGJEGYZÉS: az eredeti viselkedés (401) rögzítve; szemantikailag a 403
  // vagy a 404 lenne pontosabb (lásd a README nyitott pontjait).
  it('másik felhasználó ticketjének jegyzetei: 401 (olvasás és írás)', async () => {
    const intruder = await registerUser()
    const get = await request(app)
      .get(`/api/tickets/${ticketId}/notes`)
      .set(auth(intruder.token))
    assert.equal(get.status, 401)

    const post = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set(auth(intruder.token))
      .send({ text: 'Behatoló' })
    assert.equal(post.status, 401)
  })
})
