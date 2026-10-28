const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

// Védett útvonalak: Bearer JWT token ellenőrzése.
// Express 5-ben az async middleware-ben dobott hiba automatikusan a
// hibakezelőhöz kerül, ezért nincs szükség az express-async-handlerre.
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401)
    throw new Error('Not authorized')
  }

  let decoded
  try {
    // Token kiolvasása a fejlécből és ellenőrzése
    const token = authHeader.split(' ')[1]
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    res.status(401)
    throw new Error('Not authorized')
  }

  // Felhasználó lekérése a token alapján
  req.user = await User.findById(decoded.id).select('-password')

  // JAVÍTÁS: ha a tokenhez tartozó felhasználót közben törölték, a régi kód
  // req.user = null mellett engedte tovább a kérést (később TypeError lett belőle).
  if (!req.user) {
    res.status(401)
    throw new Error('Not authorized')
  }

  next()
}

module.exports = { protect }
