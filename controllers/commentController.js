// controllers/commentController.js
const Comment = require('../models/Comment')
const Article = require('../models/Article')
const validateFields = require('../utils/validate')
const { sanitizeBody, sanitizeComment } = require('../utils/sanitize')

// POST /api/comments/:id  (id = articleId)
const addComment = async (req, res) => {
  try {
    const articleId = req.params.id
    const raw = req.body?.text ?? ''

    // wstępna walidacja (puste)
    const errors = validateFields({ text: [raw, 'Komentarz nie może być pusty.'] })
    if (errors.length) return res.status(400).json({ message: errors.join(' ') })

    // sanitacja (usuwa <script>, zostawia linki z target/rel)
    const text = sanitizeComment(raw)

    // walidacja po sanitacji (ważne w przypadku, gdy wszystko wycięto)
    const plain = text.replace(/<[^>]+>/g, '').trim()
    if (!plain) {
      return res.status(400).json({ message: 'Komentarz jest pusty po odfiltrowaniu niebezpiecznych elementów.' })
    }
    if (plain.length < 6) {
      return res.status(400).json({ message: 'Komentarz musi mieć co najmniej 6 znaków.' })
    }

    // sprawdź istnienie artykułu
    const article = await Article.findById(articleId)
    if (!article) return res.status(404).json({ message: 'Nie znaleziono artykułu.' })

    const comment = await Comment.create({
      text,                // zapisujemy zbezpieczone HTML
      article: articleId,
      author: req.user._id
    })

    return res.status(201).json(comment)
  } catch (error) {
    console.error('Błąd podczas dodawania komentarza:', error)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

// GET /api/comments/:id  (id = articleId)
const getComments = async (req, res) => {
  try {
    const articleId = req.params.id
    const comments = await Comment.find({ article: articleId })
      .populate('author', 'username')
      .sort({ createdAt: -1 })

    return res.json(comments)
  } catch (error) {
    console.error('Błąd podczas pobierania komentarzy:', error)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

// PUT /api/comments/:id  (id = commentId)
const updateComment = async (req, res) => {
  try {
    const commentId = req.params.id
    const raw = req.body?.text ?? ''

    // wstępna walidacja (puste)
    const errors = []
    if (raw == null || String(raw).trim() === '') errors.push('Komentarz nie może być pusty.')
    if (errors.length) return res.status(400).json({ message: errors.join(' ') })

    // sanitacja + walidacja po sanitacji
    const text = sanitizeComment(raw)
    const plain = text.replace(/<[^>]+>/g, '').trim()
    if (!plain) {
      return res.status(400).json({ message: 'Komentarz jest pusty po odfiltrowaniu niebezpiecznych elementów.' })
    }
    if (plain.length < 6) {
      return res.status(400).json({ message: 'Komentarz musi mieć co najmniej 6 znaków.' })
    }

    const comment = await Comment.findById(commentId)
    if (!comment) return res.status(404).json({ message: 'Komentarz nie istnieje.' })

    const isAuthor = String(comment.author) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'
    if (!isAuthor && !isAdmin) return res.status(403).json({ message: 'Brak uprawnień do edycji komentarza.' })

    comment.text = text
    await comment.save()

    return res.json(comment)
  } catch (error) {
    console.error('Błąd podczas edycji komentarza:', error)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

// DELETE /api/comments/:id  (id = commentId)
const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id
    const comment = await Comment.findById(commentId)
    if (!comment) return res.status(404).json({ message: 'Komentarz nie istnieje.' })

    const isAuthor = String(comment.author) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'
    if (!isAuthor && !isAdmin) return res.status(403).json({ message: 'Brak uprawnień do usunięcia komentarza.' })

    await comment.deleteOne()
    return res.status(204).end()
  } catch (error) {
    console.error('Błąd podczas usuwania komentarza:', error)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

module.exports = { addComment, getComments, updateComment, deleteComment }
