const mongoose = require('mongoose')
const logger = require('../utils/logger')

// Leállítás után már ne próbálkozzon újra
let stopping = false

// Kapcsolódás a MongoDB-hez újrapróbálkozással.
// Ha az adatbázis induláskor nem érhető el, a folyamat NEM áll le: a /healthz
// továbbra is 200-at ad (a folyamat él), a /readyz pedig 503-at, amíg a
// kapcsolat létre nem jön. Így a Kubernetes nem küld forgalmat a podra, de
// nem is indítja újra feleslegesen.
const connectDB = async (uri, { maxDelayMs = 30000 } = {}) => {
  let attempt = 0

  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB kapcsolat megszakadt')
  )
  mongoose.connection.on('reconnected', () =>
    logger.info('MongoDB kapcsolat helyreállt')
  )

  while (!stopping) {
    attempt += 1
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      })
      logger.info('MongoDB csatlakozva', { host: conn.connection.host })
      return conn
    } catch (error) {
      if (stopping) return
      // Exponenciális visszalépés, felső korláttal
      const delay = Math.min(1000 * 2 ** (attempt - 1), maxDelayMs)
      logger.error('MongoDB csatlakozási hiba, újrapróbálkozás', {
        attempt,
        retryInMs: delay,
        error: error.message,
      })
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

// true, ha a Mongoose kapcsolat él (readyState 1 = connected)
const isDbReady = () => mongoose.connection.readyState === 1

const closeDB = () => {
  stopping = true
  return mongoose.connection.close()
}

module.exports = { connectDB, isDbReady, closeDB }
