const Comment = require('../models/Comment');
const Article = require('../models/Article');
const validateFields = require('../utils/validate');
const { sanitizeComment } = require('../utils/sanitize');

// Add comment
const addComment = async (articleId, authorId, text) => {
  // Basic validation
  const errors = validateFields({ text: [text, 'Komentarz nie może być pusty.'] });
  if (errors.length) throw new Error(errors.join(' '));

  // Sanitize
  const sanitizedText = sanitizeComment(text);

  // Validate after sanitization
  const plain = sanitizedText.replace(/<[^>]+>/g, '').trim();
  if (!plain) {
    throw new Error('Komentarz jest pusty po odfiltrowaniu niebezpiecznych elementów.');
  }
  if (plain.length < 6) {
    throw new Error('Komentarz musi mieć co najmniej 6 znaków.');
  }

  // Check if article exists
  const article = await Article.findById(articleId);
  if (!article) throw new Error('Nie znaleziono artykułu.');

  const comment = await Comment.create({
    text: sanitizedText,
    article: articleId,
    author: authorId,
  });

  return comment;
};

// Get comments for article
const getComments = async (articleId) => {
  const comments = await Comment.find({ article: articleId })
    .populate('author', 'username')
    .sort({ createdAt: -1 });

  return comments;
};

// Update comment
const updateComment = async (commentId, userId, userRole, newText) => {
  // Basic validation
  if (newText == null || String(newText).trim() === '') {
    throw new Error('Komentarz nie może być pusty.');
  }

  // Sanitize + validation
  const text = sanitizeComment(newText);
  const plain = text.replace(/<[^>]+>/g, '').trim();
  if (!plain) {
    throw new Error('Komentarz jest pusty po odfiltrowaniu niebezpiecznych elementów.');
  }
  if (plain.length < 6) {
    throw new Error('Komentarz musi mieć co najmniej 6 znaków.');
  }

  const comment = await Comment.findById(commentId);
  if (!comment) throw new Error('Komentarz nie istnieje.');

  const isAuthor = String(comment.author) === String(userId);
  const isAdmin = userRole === 'admin';
  if (!isAuthor && !isAdmin) throw new Error('Brak uprawnień do edycji komentarza.');

  comment.text = text;
  await comment.save();

  return comment;
};

// Delete comment
const deleteComment = async (commentId, userId, userRole) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new Error('Komentarz nie istnieje.');

  const isAuthor = String(comment.author) === String(userId);
  const isAdmin = userRole === 'admin';
  if (!isAuthor && !isAdmin) throw new Error('Brak uprawnień do usunięcia komentarza.');

  await comment.deleteOne();
};

module.exports = {
  addComment,
  getComments,
  updateComment,
  deleteComment,
};