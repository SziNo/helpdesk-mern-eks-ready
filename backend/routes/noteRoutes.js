const express = require('express')
// mergeParams: a szülő routerből (ticketRoutes) érkező :ticketId elérhető legyen
const router = express.Router({ mergeParams: true })
const { getNotes, addNote } = require('../controllers/noteController')

const { protect } = require('../middleware/authMiddleware')

router.route('/').get(protect, getNotes).post(protect, addNote)

module.exports = router
