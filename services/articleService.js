const Article = require('../models/Article');
const Comment = require('../models/Comment');
const fs = require('fs');
const path = require('path');
const { sanitizeTitle, sanitizeBody } = require('../utils/sanitize');
const validateFields = require('../utils/validate');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Helper functions
function toPublicPath(p) {
  if (!p) return null;
  const s = String(p).replace(/\\/g, '/');
  if (s.startsWith('uploads/')) return s;
  const m = s.match(/uploads\/(.+)$/i);
  return m ? `uploads/${m[1]}` : `uploads/${path.basename(s)}`;
}

function toUploadsRel(p) {
  if (!p) return '';
  const s = String(p);
  const m = s.match(/uploads[/\\]+(.+)$/i);
  return m ? m[1] : path.basename(s);
}

// Create article
const createArticle = async (title, content, authorId, imagePaths) => {
  const errors = validateFields({
    title: [title, 'Tytuł jest wymagany'],
    content: [content, 'Treść jest wymagana'],
  });

  if (title && title.length < 5) errors.push('Tytuł musi mieć co najmniej 5 znaków');
  if (content && content.length < 20) errors.push('Treść musi mieć co najmniej 20 znaków');
  if (errors.length) throw new Error(errors.join(' '));

  const sanitizedTitle = sanitizeTitle(title);
  const sanitizedContent = sanitizeBody(content);

  const newArticle = new Article({
    title: sanitizedTitle,
    content: sanitizedContent,
    images: imagePaths,
    author: authorId,
  });

  await newArticle.save();
  return newArticle;
};

// Get articles with filtering, sorting, and pagination
const getArticles = async (page = 1, limit = 5, search = '', sort = 'newest') => {
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter
  const rawQ = (search || '').trim().slice(0, 100);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = rawQ
    ? {
        $or: [
          { title: { $regex: esc(rawQ), $options: 'i' } },
          { content: { $regex: esc(rawQ), $options: 'i' } },
        ],
      }
    : {};

  // Sort options
  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    titleAZ: { title: 1, createdAt: -1 },
    titleZA: { title: -1, createdAt: -1 },
  };

  let articlesRaw;
  let total;

  if (sort === 'mostLiked') {
    const pipeline = [
      { $match: filter },
      { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
      { $sort: { likesCount: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          title: 1,
          content: 1,
          images: 1,
          createdAt: 1,
          author: 1,
          likes: 1,
          likesCount: 1,
        },
      },
    ];

    articlesRaw = await Article.aggregate(pipeline);
    total = await Article.countDocuments(filter);
  } else {
    articlesRaw = await Article.find(filter)
      .sort(sortMap[sort] || sortMap.newest)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'email');

    total = await Article.countDocuments(filter);
  }

  // Process articles
  const articles = await Promise.all(
    articlesRaw.map(async (article) => {
      const commentCount = await Comment.countDocuments({ article: article._id });
      return {
        _id: article._id,
        title: article.title,
        content: article.content,
        likesCount: Array.isArray(article.likes) ? article.likes.length : 0,
        commentCount,
        createdAt: article.createdAt,
        author: article.author,
        thumbnail: article.images && article.images.length > 0 ? toPublicPath(article.images[0]) : null,
      };
    })
  );

  return { articles, total };
};

// Get article by ID
const getArticleById = async (id) => {
  const article = await Article.findById(id).populate('author', 'username email');
  if (!article) throw new Error('Nie znaleziono artykułu');

  const commentCount = await Comment.countDocuments({ article: article._id });

  const articleObj = article.toObject();
  articleObj.images = Array.isArray(articleObj.images) ? articleObj.images.map(toPublicPath) : [];
  articleObj.commentCount = commentCount;

  return articleObj;
};

// Update article
const updateArticle = async (articleId, updateData, userId, userRole, files) => {
  const { title, content, removeImages } = updateData;
  const article = await Article.findById(articleId);
  if (!article) throw new Error('Artykuł nie znaleziony');

  // Check permissions
  if (String(article.author) !== String(userId) && userRole !== 'admin') {
    throw new Error('Brak uprawnień do edycji');
  }

  // Handle image removal
  let imagesToRemove = [];
  if (typeof removeImages === 'string') imagesToRemove = [removeImages];
  else if (Array.isArray(removeImages)) imagesToRemove = removeImages;

  const normalizedToRemove = imagesToRemove.map(toUploadsRel);

  // Remove images from disk
  for (const rel of normalizedToRemove) {
    const full = path.join(UPLOADS_DIR, rel);
    if (full.startsWith(UPLOADS_DIR)) {
      fs.unlink(full, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error(`Błąd usuwania pliku: ${full}`, err);
        }
      });
    }
  }

  // Update article images
  article.images = (article.images || []).filter((img) => {
    const rel = toUploadsRel(img);
    return !normalizedToRemove.includes(rel);
  });

  // Add new images
  if (files && files.length > 0) {
    const newImages = files.map((f) => `uploads/${f.filename}`.replace(/\\/g, '/'));
    article.images.push(...newImages);
  }

  // Validate and update title and content
  const errors = [];
  if (title) {
    if (title.length < 5) errors.push('Tytuł musi mieć co najmniej 5 znaków');
    else article.title = sanitizeTitle(title);
  }
  if (content) {
    if (content.length < 20) errors.push('Treść musi mieć co najmniej 20 znaków');
    else article.content = sanitizeBody(content);
  }
  if (errors.length) throw new Error(errors.join(' '));

  await article.save();
  return article;
};

// Delete article
const deleteArticle = async (articleId, userId, userRole) => {
  const article = await Article.findById(articleId);
  if (!article) throw new Error('Artykuł nie istnieje');

  if (String(article.author) !== String(userId) && userRole !== 'admin') {
    throw new Error('Brak uprawnień');
  }

  // Remove images from disk
  for (const img of article.images || []) {
    const rel = toUploadsRel(img);
    const full = path.join(UPLOADS_DIR, rel);
    if (full.startsWith(UPLOADS_DIR)) {
      fs.unlink(full, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error(`Błąd usuwania pliku ${full}:`, err);
        }
      });
    }
  }

  // Remove comments
  await Comment.deleteMany({ article: article._id });

  await article.deleteOne();
};

// Toggle like on article
const toggleLikeArticle = async (articleId, userId) => {
  const article = await Article.findById(articleId);
  if (!article) throw new Error('Artykuł nie znaleziony');

  // Author cannot like their own article
  if (article.author && String(article.author) === String(userId)) {
    throw new Error('Autor nie może polubić własnego artykułu');
  }

  const alreadyLiked = Array.isArray(article.likes) && article.likes.some((id) => String(id) === String(userId));
  if (alreadyLiked) article.likes.pull(userId);
  else article.likes.push(userId);

  await article.save();

  return {
    liked: !alreadyLiked,
    totalLikes: Array.isArray(article.likes) ? article.likes.length : 0,
  };
};

module.exports = {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  toggleLikeArticle,
};