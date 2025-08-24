const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Middleware sprawdzający czy użytkownik jest zalogowany i ważny token
const requireAuth = async (req, res, next) => {
  const token = req.cookies.token

  if (!token) {
    return res.status(401).json({ message: 'Brak tokena. Dostęp zabroniony.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    
    if (!user) {
      return res.status(401).json({ message: 'Użytkownik nie istnieje' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Błąd autoryzacji:', error)
    return res.status(401).json({ message: 'Nieprawidłowy token.' })
  }
}

module.exports = requireAuth
