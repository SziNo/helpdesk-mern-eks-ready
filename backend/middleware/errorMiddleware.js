const logger = require('../utils/logger')

// Ismeretlen /api útvonalakra JSON 404 (HTML helyett)
const notFound = (req, res) => {
  res.status(404).json({ message: `Not found - ${req.originalUrl}` })
}

// Központi hibakezelő.
// Express 5-ben az async handlerekben dobott hibák és elutasított promise-ok
// automatikusan ide kerülnek, ezért nincs szükség az express-async-handlerre.
const errorHandler = (err, req, res, next) => {
  // JAVÍTÁS: a régi kód `res.statusCode ? res.statusCode : 500` feltétele
  // mindig igaz volt (alapból 200), így a váratlan hibák 200-zal mentek vissza.
  let statusCode = res.statusCode >= 400 ? res.statusCode : 500
  let message = err.message

  // Érvénytelen ObjectId (pl. /api/tickets/abc) -> 404 a 500 helyett
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404
    message = 'Resource not found'
  }

  // Hibás JSON törzs (express.json) vagy séma validációs hiba -> 400
  if (err.type === 'entity.parse.failed' || err.name === 'ValidationError') {
    statusCode = 400
  }

  if (statusCode >= 500) {
    logger.error('Kezeletlen hiba', {
      method: req.method,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack,
    })
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  })
}

module.exports = { errorHandler, notFound }
