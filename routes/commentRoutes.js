const express = require('express')
const router = express.Router()

const {
  addComment,
  getComments,
  deleteComment,
  updateComment, // zostaw, jeśli dodałeś w kontrolerze; w przeciwnym razie usuń tę linię i trasę PUT
} = require('../controllers/commentController')

const requireAuth = require('../middleware/authMiddleware') // ✔️ poprawna ścieżka i import

// Komentarze do artykułu (id = articleId)
router.get('/:id', getComments)                 // pobiera komentarze do artykułu :id
router.post('/:id', requireAuth, addComment)    // dodaje komentarz do artykułu :id

// Operacje na konkretnym komentarzu (id = commentId)
router.put('/:id', requireAuth, updateComment)      // jeśli masz updateComment; inaczej usuń
router.delete('/:id', requireAuth, deleteComment)

module.exports = router
