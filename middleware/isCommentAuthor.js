// middleware/isCommentAuthor.js
const Comment = require('../models/Comment')

const isCommentAuthor = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id)
    if (!comment) return res.status(404).json({ message: 'Komentarz nie znaleziony' })

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Brak uprawnień do wykonania tej operacji' })
    }

    next()
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Błąd serwera' })
  }
}

module.exports = isCommentAuthor
