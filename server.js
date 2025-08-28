// server.js v.3
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


// Middleware
app.use(helmet())
app.use(express.json())
app.use(cookieParser())

const ALLOWED_ORIGINS = ['http://localhost:3000'];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Rate limit tylko dla /api/auth
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zbyt wiele żądań. Spróbuj ponownie później.' }
})
app.use('/api/auth', authLimiter)

// Statyczne pliki (obrazki)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
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

// Globalny error handler - musi być na końcu, po wszystkich middleware i routes
app.use((err, req, res) => {
  // 1. SPECJALNE PRZYPADKI (istniejąca logika dla Multera)
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Za duży plik. Limit 5MB.' })
  }
  if (err && err.message && /pliki graficzne|plik[ów]* graficzny|image/i.test(err.message)) {
    return res.status(400).json({ message: 'Dozwolone są tylko pliki graficzne.' })
  }

  // 2. NOWA LOGIKA - AppError i standardowe błędy
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'

  // Development - szczegółowe logi
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR 💥:', err)
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    })
  }

  // Production - ogólne komunikaty
  if (err.isOperational) {
    // Błędy operacyjne (AppError) - pokazujemy komunikat
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    })
  } else {
    // Nieznane błędy programistyczne - nie pokazujemy szczegółów
    console.error('ERROR 💥:', err)
    return res.status(500).json({
      status: 'error',
      message: 'Coś poszło nie tak!'
    })
  }
})

// Połączenie z MongoDB i start
mongoose.connect(MONGO_URI, {})
  .then(() => {
    console.log('✅ Połączono z MongoDB')

    const conn = mongoose.connection
    console.log(`📦 Baza: ${conn.name}`)
    console.log(`🌐 Host: ${conn.host}`)

    app.listen(PORT, () => console.log(`🚀 Serwer działa na porcie ${PORT}`))
  })
  .catch((err) => {
    console.error('❌ Błąd połączenia z MongoDB:', err)
    process.exit(1)
  })