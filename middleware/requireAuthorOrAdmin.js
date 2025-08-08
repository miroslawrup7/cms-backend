// middleware/requireAuthorOrAdmin.js
const Article = require('../models/Article')

module.exports = async function requireAuthorOrAdmin(req, res, next) {
  try {
    const { id } = req.params
    const article = await Article.findById(id)
    if (!article) return res.status(404).json({ message: 'Artykuł nie istnieje.' })

    const isOwner = String(article.author) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Brak uprawnień.' })
    }

    // Możesz przekazać dalej, jeśli chcesz użyć w kontrolerze:
    req.article = article
    return next()
  } catch (e) {
    return next(e)
  }
}
