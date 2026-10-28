const logger = require('../utils/logger')

// Hozzáférési napló: minden kérésről egy sor a stdout-ra, a válasz elküldése után.
// A req.ip a "trust proxy" beállítás miatt a valódi kliens IP-t mutatja
// (az X-Forwarded-For fejlécből), nem a Gateway / proxy címét.
// A health végpontokat nem naplózzuk, mert a probe-ok sűrűn hívják őket.
const requestLogger = (req, res, next) => {
  if (req.path === '/healthz' || req.path === '/readyz') {
    return next()
  }

  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      ip: req.ip,
    })
  })
  next()
}

module.exports = requestLogger
