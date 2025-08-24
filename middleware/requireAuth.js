// middleware/requireAuth.js
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const requireAuth = async (req, res, next) => {
  const token = req.cookies.token

  if (!token) {
    return res.status(401).json({ message: 'Brak tokena. Dostęp zabroniony.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = await User.findById(decoded.id).select('-password')
    next()
  } catch (error) {
    console.error('Błąd autoryzacji:', error)
    return res.status(401).json({ message: 'Nieprawidłowy token.' })
  }
}

module.exports = requireAuth
