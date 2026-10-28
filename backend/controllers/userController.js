const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const User = require('../models/userModel')

// @desc   Új felhasználó regisztrálása
// @route  POST /api/users
// @access Nyilvános
const registerUser = async (req, res) => {
  const { name, email, password } = req.body ?? {}

  // Validáció
  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Please include all fields')
  }

  // Létezik-e már ilyen felhasználó
  const userExists = await User.findOne({ email })

  if (userExists) {
    res.status(400)
    throw new Error('User already exists')
  }

  // Jelszó hash-elése
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  // Felhasználó létrehozása
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  })

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    })
  } else {
    res.status(400)
    throw new Error('Invalid user data')
  }
}

// @desc   Bejelentkezés
// @route  POST /api/users/login
// @access Nyilvános
const loginUser = async (req, res) => {
  const { email, password } = req.body ?? {}
  const user = await User.findOne({ email })

  // Felhasználó és jelszó ellenőrzése
  if (user && password && (await bcrypt.compare(password, user.password))) {
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    })
  } else {
    res.status(401)
    throw new Error('Invalid credentials')
  }
}

// @desc   Aktuális felhasználó adatai
// @route  GET /api/users/me
// @access Védett
const getMe = async (req, res) => {
  const user = {
    id: req.user._id,
    email: req.user.email,
    name: req.user.name,
  }
  res.status(200).json(user)
}

// JWT token generálása
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  })
}

module.exports = {
  registerUser,
  loginUser,
  getMe,
}
