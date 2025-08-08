// server.js
const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const path = require('path')

dotenv.config()
const app = express()

// Środowisko
const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:1234'

// Middleware
app.use(helmet())
app.use(express.json())
app.use(cookieParser())

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}))

// ===============================
// Rate limit tylko dla /api/auth
// prod: 100/15 min, dev: 1000/1 min
// ===============================
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? (15 * 60 * 1000) : (60 * 1000),
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zbyt wiele żądań. Spróbuj ponownie później.' }
})
app.use('/api/auth', authLimiter)

// Statyczne pliki (obrazki)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, p) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  }
}))

// Trasy API
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/articles', require('./routes/articleRoutes'))
app.use('/api/comments', require('./routes/commentRoutes'))
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))

// 404 – brak trasy
app.use((req, res) => {
  res.status(404).json({ message: 'Nie znaleziono endpointu.' })
})

// Globalny handler błędów (ZA trasami)
app.use((err, req, res, next) => {
  // Multer: za duży plik
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Za duży plik. Limit 5MB.' })
  }
  // Multer / fileFilter: nieprawidłowy typ pliku
  if (err && err.message && /pliki graficzne|plik[ów]* graficzny|image/i.test(err.message)) {
    return res.status(400).json({ message: 'Dozwolone są tylko pliki graficzne.' })
  }

  console.error('Błąd:', err.stack || err)
  return res.status(500).json({ message: 'Wewnętrzny błąd serwera' })
})

// Połączenie z MongoDB i start
mongoose.connect(MONGO_URI, {})
  .then(() => {
    console.log('✅ Połączono z MongoDB')
    app.listen(PORT, () => console.log(`🚀 Serwer działa na porcie ${PORT}`))
  })
  .catch((err) => {
    console.error('❌ Błąd połączenia z MongoDB:', err)
    process.exit(1)
  })
