const commentService = require('../services/commentService');

// POST /api/comments/:id
const addComment = async (req, res) => {
  try {
    const articleId = req.params.id;
    const rawText = req.body?.text ?? '';
    const comment = await commentService.addComment(articleId, req.user._id, rawText);
    return res.status(201).json(comment);
  } catch (error) {
    console.error('Błąd podczas dodawania komentarza:', error);
    if (
      error.message.includes('Komentarz nie może być pusty') ||
      error.message.includes('co najmniej 6 znaków') ||
      error.message.includes('odfiltrowaniu')
    ) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('Nie znaleziono artykułu')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// GET /api/comments/:id
const getComments = async (req, res) => {
  try {
    const articleId = req.params.id;
    const comments = await commentService.getComments(articleId);
    return res.json(comments);
  } catch (error) {
    console.error('Błąd podczas pobierania komentarzy:', error);
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// PUT /api/comments/:id
const updateComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const rawText = req.body?.text ?? '';
    const comment = await commentService.updateComment(commentId, req.user._id, req.user.role, rawText);
    return res.json(comment);
  } catch (error) {
    console.error('Błąd podczas edycji komentarza:', error);
    if (
      error.message.includes('Komentarz nie może być pusty') ||
      error.message.includes('co najmniej 6 znaków') ||
      error.message.includes('odfiltrowaniu')
    ) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('Komentarz nie istnieje')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Brak uprawnień')) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// DELETE /api/comments/:id
const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    await commentService.deleteComment(commentId, req.user._id, req.user.role);
    return res.status(204).end();
  } catch (error) {
    console.error('Błąd podczas usuwania komentarza:', error);
    if (error.message.includes('Komentarz nie istnieje')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Brak uprawnień')) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

module.exports = {
  addComment,
  getComments,
  updateComment,
  deleteComment,
};