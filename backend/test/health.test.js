// Liveness / readiness végpontok
const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { app, request, connectTestDB, closeTestDB } = require('./helpers')

describe('health végpontok', () => {
  before(connectTestDB)
  after(closeTestDB)

  it('GET /healthz -> 200', async () => {
    const res = await request(app).get('/healthz')
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { status: 'ok' })
  })

  it('GET /readyz -> 200, ha a MongoDB kapcsolat él', async () => {
    const res = await request(app).get('/readyz')
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'ready')
  })

  it('MongoDB kapcsolat nélkül: /readyz -> 503, /healthz továbbra is 200', async () => {
    await mongoose.connection.close()
    try {
      const ready = await request(app).get('/readyz')
      assert.equal(ready.status, 503)
      assert.equal(ready.body.status, 'not ready')

      const health = await request(app).get('/healthz')
      assert.equal(health.status, 200)
    } finally {
      // A kapcsolat visszaállítása, hogy a teszt sorrendje ne számítson
      await connectTestDB()
    }
  })
})
