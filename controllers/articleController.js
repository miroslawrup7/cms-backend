// controllers/articleController.js
const Article = require("../models/Article")
const Comment = require("../models/Comment")
const fs = require("fs")
const path = require("path")
const { sanitizeTitle, sanitizeBody } = require("../utils/sanitize")
const validateFields = require("../utils/validate")

// === Stałe i helpery ścieżek ===
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')

/**
 * Zwraca publiczną ścieżkę do zasobu, jaką trzymamy w DB i serwujemy na froncie:
 *   "uploads/<filename>" — ze slashem, bez leading slash.
 * Obsługuje stare formy (pełne ścieżki z dysku lub wstępnie z "uploads/").
 */
function toPublicPath(p) {
  if (!p) return null
  const s = String(p).replace(/\\/g, '/')
  if (s.startsWith('uploads/')) return s
  const m = s.match(/uploads\/(.+)$/i)
  return m ? `uploads/${m[1]}` : `uploads/${path.basename(s)}`
}

/**
 * Zwraca relatywną nazwę pliku wewnątrz katalogu "uploads" (do kasowania na dysku).
 * Przykłady:
 *  - "uploads/a.jpg"       -> "a.jpg"
 *  - "C:\...\uploads\a.jpg"-> "a.jpg"
 *  - "a.jpg"               -> "a.jpg"
 */
function toUploadsRel(p) {
  if (!p) return ''
  const s = String(p)
  const m = s.match(/uploads[\/\\]+(.+)$/i)
  return m ? m[1] : path.basename(s)
}

// =========================
//  POST /api/articles
//  Tworzenie nowego artykułu
// =========================
const createArticle = async (req, res) => {
  try {
    let { title, content } = req.body

    const errors = validateFields({
      title:   [title,   'Tytuł jest wymagany'],
      content: [content, 'Treść jest wymagana'],
    })
    if (title && title.length < 5)   errors.push('Tytuł musi mieć co najmniej 5 znaków')
    if (content && content.length < 20) errors.push('Treść musi mieć co najmniej 20 znaków')
    if (errors.length) return res.status(400).json({ message: errors.join(' ') })

    // sanitacja
    title   = sanitizeTitle(title)
    content = sanitizeBody(content)

    // mapuj przesłane pliki na publiczne ścieżki "uploads/<filename>"
    const imagePaths = (req.files || []).map(f => `uploads/${f.filename}`.replace(/\\/g, '/'))

    // autoryzacja (powinna być zapewniona przez middleware, ale zostawiamy twardy check)
    const author = req.user ? req.user._id : null
    if (!author) {
      // sprzątanie uploadów jeśli brak autoryzacji
      imagePaths.forEach(rel => {
        const full = path.join(UPLOADS_DIR, toUploadsRel(rel))
        fs.unlink(full, () => {}) // ignorujemy błąd
      })
      return res.status(401).json({ message: "Nieautoryzowany dostęp" })
    }

    const newArticle = new Article({
      title,
      content,
      images: imagePaths, // w DB trzymamy zawsze "uploads/<filename>"
      author,
    })

    await newArticle.save()
    return res.status(201).json({ message: "Artykuł utworzony", article: newArticle })
  } catch (error) {
    // sprzątanie uploadów jeśli posypało się dalej
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        const full = path.join(UPLOADS_DIR, toUploadsRel(f.filename || f.path))
        fs.unlink(full, () => {})
      }
    }
    console.error("Błąd tworzenia artykułu:", error)
    return res.status(500).json({ message: "Błąd serwera" })
  }
}

// =============================================
//  GET /api/articles?page=&limit=&q=&sort=
//  Lista artykułów z filtrem/sortem/paginacją
// =============================================
const getArticles = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 5
    const skip  = (page - 1) * limit

    // filtrowanie (q po tytule/treści)
    const rawQ = (req.query.q || '').trim().slice(0, 100)
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const filter = rawQ
      ? { $or: [
          { title:   { $regex: esc(rawQ), $options: 'i' } },
          { content: { $regex: esc(rawQ), $options: 'i' } },
        ] }
      : {}

    // sortowanie
    const sortParam = (req.query.sort || 'newest')
    const sortMap = {
      newest:  { createdAt: -1 },
      oldest:  { createdAt:  1 },
      titleAZ: { title:      1, createdAt: -1 },
      titleZA: { title:     -1, createdAt: -1 },
      // mostLiked osobno
    }

    if (sortParam === 'mostLiked') {
      const pipeline = [
        { $match: filter },
        { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
        { $sort: { likesCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: {
            title: 1, content: 1, images: 1, createdAt: 1, author: 1, likes: 1, likesCount: 1
        } }
      ]
      const articlesRaw = await Article.aggregate(pipeline)
      const total = await Article.countDocuments(filter)

      const articles = await Promise.all(articlesRaw.map(async (a) => {
        const commentCount = await Comment.countDocuments({ article: a._id })
        return {
          _id: a._id,
          title: a.title,
          content: a.content,
          likesCount: a.likesCount,
          commentCount,
          createdAt: a.createdAt,
          author: a.author,
          thumbnail: (a.images && a.images.length > 0)
            ? toPublicPath(a.images[0])
            : null,
        }
      }))

      return res.json({ articles, total })
    }

    // zwykłe sortowanie
    const articlesRaw = await Article.find(filter)
      .sort(sortMap[sortParam] || sortMap.newest)
      .skip(skip)
      .limit(limit)
      .populate('author', 'email')

    const articles = await Promise.all(articlesRaw.map(async (article) => {
      const commentCount = await Comment.countDocuments({ article: article._id })
      return {
        _id: article._id,
        title: article.title,
        content: article.content,
        likesCount: Array.isArray(article.likes) ? article.likes.length : 0,
        commentCount,
        createdAt: article.createdAt,
        author: article.author, // {_id, email}
        thumbnail: (article.images && article.images.length > 0)
          ? toPublicPath(article.images[0])
          : null,
      }
    }))

    const total = await Article.countDocuments(filter)
    return res.json({ articles, total })
  } catch (error) {
    console.error('Błąd pobierania artykułów:', error)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

// ===================================
//  GET /api/articles/:id
//  Pojedynczy artykuł
// ===================================
const getArticleById = async (req, res) => {
  try {
    const { id } = req.params
    const article = await Article.findById(id).populate("author", "username email")
    if (!article) return res.status(404).json({ message: "Nie znaleziono artykułu" })

    // znormalizuj obrazy na wyjściu (też dla starych rekordów)
    const out = article.toObject()
    out.images = Array.isArray(out.images) ? out.images.map(toPublicPath) : []
    return res.status(200).json(out)
  } catch (err) {
    console.error("Błąd pobierania artykułu:", err)
    return res.status(500).json({ message: "Błąd serwera" })
  }
}

// ===================================
//  PUT /api/articles/:id
//  Aktualizacja artykułu
// ===================================
const updateArticle = async (req, res) => {
  try {
    let { title, content, removeImages } = req.body
    const article = await Article.findById(req.params.id)
    if (!article) return res.status(404).json({ message: "Artykuł nie znaleziony" })

    // (jeśli w trasie używasz requireAuthorOrAdmin, to i tak mamy zabezpieczenie)
    if (String(article.author) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Brak uprawnień do edycji" })
    }

    // które obrazy usunąć?
    let imagesToRemove = []
    if (typeof removeImages === "string") imagesToRemove = [removeImages]
    else if (Array.isArray(removeImages)) imagesToRemove = removeImages

    const normalizedToRemove = imagesToRemove.map(toUploadsRel)

    // usuń z dysku
    for (const rel of normalizedToRemove) {
      const full = path.join(UPLOADS_DIR, rel)
      if (full.startsWith(UPLOADS_DIR)) {
        fs.unlink(full, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error(`Błąd usuwania pliku: ${full}`, err)
          }
        })
      }
    }

    // usuń z listy w dokumencie
    article.images = (article.images || []).filter(img => {
      const rel = toUploadsRel(img)
      return !normalizedToRemove.includes(rel)
    })

    // dodaj nowe
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => `uploads/${f.filename}`.replace(/\\/g, '/'))
      article.images.push(...newImages)
    }

    // walidacja + sanitacja
    const errors = []
    if (title) {
      if (title.length < 5) errors.push("Tytuł musi mieć co najmniej 5 znaków")
      else article.title = sanitizeTitle(title)
    }
    if (content) {
      if (content.length < 20) errors.push("Treść musi mieć co najmniej 20 znaków")
      else article.content = sanitizeBody(content)
    }
    if (errors.length) return res.status(400).json({ message: errors.join(' ') })

    await article.save()
    return res.json({ message: "Artykuł zaktualizowany", article })
  } catch (err) {
    console.error("Błąd aktualizacji artykułu:", err)
    return res.status(500).json({ message: "Błąd serwera" })
  }
}

// ===================================
//  DELETE /api/articles/:id
//  Usunięcie artykułu
// ===================================
const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
    if (!article) return res.status(404).json({ message: "Artykuł nie istnieje" })

    const isOwner = String(article.author) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Brak uprawnień" })

    // usuń pliki z dysku
    for (const img of (article.images || [])) {
      const rel = toUploadsRel(img)
      const full = path.join(UPLOADS_DIR, rel)
      if (full.startsWith(UPLOADS_DIR)) {
        fs.unlink(full, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error(`Błąd usuwania pliku ${full}:`, err)
          }
        })
      }
    }

    // usuń komentarze
    await Comment.deleteMany({ article: article._id })

    await article.deleteOne()
    return res.status(204).end()
  } catch (err) {
    console.error("Błąd usuwania artykułu:", err)
    return res.status(500).json({ message: "Błąd serwera" })
  }
}

// ===================================
//  POST /api/articles/:id/like
//  Polub/odlubi artykuł
// ===================================
const toggleLikeArticle = async (req, res) => {
  try {
    const articleId = req.params.id
    const userId = req.user._id

    const article = await Article.findById(articleId)
    if (!article) return res.status(404).json({ message: "Artykuł nie znaleziony" })

    // Autor nie może lajkować własnego artykułu
    if (article.author && String(article.author) === String(req.user._id)) {
      return res.status(400).json({
        message: 'Autor nie może polubić własnego artykułu',
        liked: false,
        totalLikes: Array.isArray(article.likes) ? article.likes.length : 0
      })
    }

    const alreadyLiked = Array.isArray(article.likes) && article.likes.some(id => String(id) === String(userId))
    if (alreadyLiked) article.likes.pull(userId)
    else article.likes.push(userId)

    await article.save()

    return res.json({
      liked: !alreadyLiked,
      totalLikes: Array.isArray(article.likes) ? article.likes.length : 0
    })
  } catch (error) {
    console.error("Błąd toggle lajka artykułu:", error)
    return res.status(500).json({ message: "Błąd serwera" })
  }
}

module.exports = {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  toggleLikeArticle,
}
