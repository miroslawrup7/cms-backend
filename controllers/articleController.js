const articleService = require('../services/articleService');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Helper function (only what's necessary for the controller)
function toUploadsRel(p) {
  if (!p) return '';
  const s = String(p);
  const m = s.match(/uploads[/\\]+(.+)$/i);
  return m ? m[1] : path.basename(s);
}

// POST /api/articles
const createArticle = async (req, res) => {
  try {
    const { title, content } = req.body;

    // Map uploaded files to image paths
    const imagePaths = (req.files || []).map((f) => `uploads/${f.filename}`.replace(/\\/g, '/'));

    // Authorization check
    const author = req.user ? req.user._id : null;
    if (!author) {
      // Clean up uploads if no authorization
      imagePaths.forEach((rel) => {
        const full = path.join(UPLOADS_DIR, toUploadsRel(rel));
        fs.unlink(full, () => {});
      });
      return res.status(401).json({ message: 'Nieautoryzowany dostęp' });
    }

    // Call service
    const newArticle = await articleService.createArticle(title, content, author, imagePaths);

    return res.status(201).json({ message: 'Artykuł utworzony', article: newArticle });
  } catch (error) {
    // Clean up uploads on error
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        const full = path.join(UPLOADS_DIR, toUploadsRel(f.filename || f.path));
        fs.unlink(full, () => {});
      }
    }
    console.error('Błąd tworzenia artykułu:', error);
    if (error.message.includes('Tytuł musi mieć') || error.message.includes('Treść musi mieć') || error.message.includes('jest wymagana')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// GET /api/articles
const getArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = (req.query.q || '').trim();
    const sort = req.query.sort || 'newest';

    const result = await articleService.getArticles(page, limit, search, sort);
    return res.json(result);
  } catch (error) {
    console.error('Błąd pobierania artykułów:', error);
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// GET /api/articles/:id
const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await articleService.getArticleById(id);
    return res.status(200).json(article);
  } catch (error) {
    console.error('Błąd pobierania artykułu:', error);
    if (error.message === 'Nie znaleziono artykułu') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// PUT /api/articles/:id
const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, removeImages } = req.body;

    const updateData = { title, content, removeImages };
    const result = await articleService.updateArticle(
      id,
      updateData,
      req.user._id,
      req.user.role,
      req.files
    );

    return res.json({ message: 'Artykuł zaktualizowany', article: result });
  } catch (error) {
    console.error('Błąd aktualizacji artykułu:', error);
    if (error.message === 'Artykuł nie znaleziony') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Brak uprawnień do edycji') {
      return res.status(403).json({ message: error.message });
    }
    if (error.message.includes('Tytuł musi mieć') || error.message.includes('Treść musi mieć')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// DELETE /api/articles/:id
const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    await articleService.deleteArticle(id, req.user._id, req.user.role);
    return res.status(204).end();
  } catch (error) {
    console.error('Błąd usuwania artykułu:', error);
    if (error.message === 'Artykuł nie istnieje') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Brak uprawnień') {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// POST /api/articles/:id/like
const toggleLikeArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await articleService.toggleLikeArticle(id, req.user._id);
    return res.json(result);
  } catch (error) {
    console.error('Błąd toggle lajka artykułu:', error);
    if (error.message === 'Artykuł nie znaleziony') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Autor nie może polubić własnego artykułu') {
      return res.status(400).json({
        message: error.message,
        liked: false,
        totalLikes: 0,
      });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

module.exports = {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  toggleLikeArticle,
};