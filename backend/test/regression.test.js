// Regressziós tesztek a README "A régi kódban talált hibák" pontjaihoz
const { describe, it, before, beforeEach, afterEach, after, mock } = require('node:test')
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
const Ticket = require('../models/ticketModel')
const User = require('../models/userModel')

const auth = (token) => ({ Authorization: `Bearer ${token}` })
const MISSING_ID = '000000000000000000000000'

describe('regresszió: régi hibák', () => {
  let owner

  before(connectTestDB)
  beforeEach(async () => {
    await resetDB()
    owner = await registerUser()
  })
  afterEach(() => mock.restoreAll())
  after(closeTestDB)

  it('1. váratlan hiba: 500 (nem 200) a hibakezelőtől', async () => {
    // Adatbázis hiba szimulálása: a Ticket.find hibát dob
    mock.method(Ticket, 'find', async () => {
      throw new Error('Szimulált adatbázis hiba')
    })
    const res = await request(app).get('/api/tickets').set(auth(owner.token))
    assert.equal(res.status, 500)
    assert.equal(res.body.message, 'Szimulált adatbázis hiba')
  })

  it('2. ticket törlése deleteOne()-nal: tényleg törlődik az adatbázisból', async () => {
    const id = (await createTicket(owner.token)).body._id
    const res = await request(app).delete(`/api/tickets/${id}`).set(auth(owner.token))
    assert.equal(res.status, 200)
    assert.equal(await Ticket.countDocuments({ _id: id }), 0)
  })

  it('3. nem létező ticket: 404 (a ticketnél és a jegyzeteknél is, GET és POST)', async () => {
    const ticket = await request(app)
      .get(`/api/tickets/${MISSING_ID}`)
      .set(auth(owner.token))
    assert.equal(ticket.status, 404)

    const getNotes = await request(app)
      .get(`/api/tickets/${MISSING_ID}/notes`)
      .set(auth(owner.token))
    assert.equal(getNotes.status, 404)
    assert.equal(getNotes.body.message, 'Ticket not found')

    const addNote = await request(app)
      .post(`/api/tickets/${MISSING_ID}/notes`)
      .set(auth(owner.token))
      .send({ text: 'x' })
    assert.equal(addNote.status, 404)
  })

  it('4. törölt felhasználó tokenje: 401', async () => {
    await User.deleteOne({ _id: owner.id })

    const me = await request(app).get('/api/users/me').set(auth(owner.token))
    assert.equal(me.status, 401)

    const tickets = await request(app).get('/api/tickets').set(auth(owner.token))
    assert.equal(tickets.status, 401)
  })

  it('5. a PUT nem írja át a user mezőt (és csak az engedélyezett mezőket módosítja)', async () => {
    const other = await registerUser()
    const id = (await createTicket(owner.token)).body._id

    const res = await request(app)
      .put(`/api/tickets/${id}`)
      .set(auth(owner.token))
      .send({ status: 'open', user: other.id, _id: MISSING_ID })
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'open')
    assert.equal(res.body.user, owner.id)
    assert.equal(res.body._id, id)

    const stored = await Ticket.findById(id)
    assert.equal(stored.user.toString(), owner.id)
  })

  it('5. a PUT lefuttatja a séma validációt: érvénytelen status -> 400', async () => {
    const id = (await createTicket(owner.token)).body._id
    const res = await request(app)
      .put(`/api/tickets/${id}`)
      .set(auth(owner.token))
      .send({ status: 'xyz' })
    assert.equal(res.status, 400)

    const stored = await Ticket.findById(id)
    assert.equal(stored.status, 'new')
  })
})
