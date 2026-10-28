const loadConfig = require('./config/env')
const { connectDB, closeDB } = require('./config/db')
const createApp = require('./app')
const logger = require('./utils/logger')

// Kötelező környezeti változók ellenőrzése (hiány esetén itt leáll)
const config = loadConfig()

const app = createApp(config)

// Express 5: a listen hibái (pl. EADDRINUSE) a callbackbe érkeznek
const server = app.listen(config.port, (error) => {
  if (error) {
    logger.error('A HTTP szerver nem tudott elindulni', { error: error.message })
    process.exit(1)
  }
  logger.info('Szerver elindult', { port: config.port, env: config.nodeEnv })
})

// Adatbázis kapcsolat a háttérben, újrapróbálkozással (lásd config/db.js)
connectDB(config.mongoUri)

// Szép leállás: Kubernetes a pod leállításakor SIGTERM-et küld.
// Nem fogadunk új kapcsolatot, megvárjuk a futó kéréseket, lezárjuk a
// Mongoose kapcsolatot, majd kilépünk. Ha ez nem sikerül időben, kényszerített
// kilépés (a Kubernetes alapértelmezett türelmi ideje 30 mp).
const SHUTDOWN_TIMEOUT_MS = 10000
let shuttingDown = false

const shutdown = (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  logger.info('Leállítási jel érkezett, szép leállás indul', { signal })

  setTimeout(() => {
    logger.error('A szép leállás túllépte az időkorlátot, kényszerített kilépés')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS).unref()

  server.close(async (error) => {
    if (error) {
      logger.error('Hiba a HTTP szerver leállításakor', { error: error.message })
    }
    try {
      await closeDB()
      logger.info('Leállás kész')
      process.exit(error ? 1 : 0)
    } catch (dbError) {
      logger.error('Hiba a MongoDB kapcsolat lezárásakor', {
        error: dbError.message,
      })
      process.exit(1)
    }
  })

  // Az üresjáratú keep-alive kapcsolatok bezárása, hogy a close() ne várjon rájuk
  server.closeIdleConnections()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
