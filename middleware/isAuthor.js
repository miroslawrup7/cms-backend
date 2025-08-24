// middleware/isAuthor.js
const Article = require('../models/Article')

const isAuthor = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id)

    if (!article) {
      return res.status(404).json({ message: 'Artykuł nie znaleziony' })
    }

    if (article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Brak uprawnień do edycji lub usunięcia tego artykułu' })
    }

    next()
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Błąd serwera' })
  }
}

module.exports = isAuthor
