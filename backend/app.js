const express = require('express')
const { errorHandler, notFound } = require('./middleware/errorMiddleware')
const requestLogger = require('./middleware/requestLogger')
const { isDbReady } = require('./config/db')

// Az Express alkalmazás összeállítása (a listen a server.js-ben történik).
const createApp = ({ trustProxy }) => {
  const app = express()

  // Reverse proxy (Gateway / load balancer) mögött az X-Forwarded-For fejlécből
  // állapítsa meg a valódi kliens IP-t (req.ip), de csak a megbízható
  // (alapból privát hálózati) proxyk fejléceinek higgyen.
  app.set('trust proxy', trustProxy)
  app.disable('x-powered-by')

  app.use(requestLogger)
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  // Liveness: mindig 200, ha a folyamat él (nem függ a MongoDB-től)
  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' })
  })

  // Readiness: csak akkor 200, ha a MongoDB kapcsolat él
  app.get('/readyz', (req, res) => {
    if (isDbReady()) {
      res.status(200).json({ status: 'ready' })
    } else {
      res.status(503).json({ status: 'not ready', reason: 'mongodb' })
    }
  })

  // API útvonalak
  app.use('/api/users', require('./routes/userRoutes'))
  app.use('/api/tickets', require('./routes/ticketRoutes'))

  // A frontendet már NEM ez a szerver szolgálja ki (külön konténer),
  // minden más útvonalra JSON 404 megy.
  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = createApp
