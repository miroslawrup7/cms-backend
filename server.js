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

app.set('trust proxy', 1); // potrzebne, żeby Secure/SameSite działało poprawnie za CDN/Proxy

// Środowisko
const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:1234'

// Middleware
app.use(helmet())
app.use(express.json())
app.use(cookieParser())

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,                 // produkcja: np. https://cms-frontend-dkru.onrender.com
  'http://localhost:3000',                  // lokalny frontend
  'https://cms-frontend-dkru.onrender.com', // na wszelki wypadek “na sztywno”
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // zezwól także na brak nagłówka Origin (np. curl/Postman)
    if (!origin) return cb(null, true);
    const ok = ALLOWED_ORIGINS.includes(origin);
    return cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
};

// preflight + właściwe żądania
// app.options('*', cors(corsOptions));
app.use(cors(corsOptions));


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

    // 🔍 Log szczegółów połączenia
    const conn = mongoose.connection
    console.log(`📦 Baza: ${conn.name}`)
    console.log(`🌐 Host: ${conn.host}`)

    app.listen(PORT, () => console.log(`🚀 Serwer działa na porcie ${PORT}`))
  })
  .catch((err) => {
    console.error('❌ Błąd połączenia z MongoDB:', err)
    process.exit(1)
  })
