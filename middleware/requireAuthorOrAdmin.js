// middleware/requireAuthorOrAdmin.js v.2
const Article = require("../models/Article");
const AppError = require("../utils/AppError");

module.exports = async function requireAuthorOrAdmin(req, res, next) {
    try {
        const { id } = req.params;
        const article = await Article.findById(id);
        if (!article) return next(new AppError("Artykuł nie istnieje.", 404));

        const isOwner = String(article.author) === String(req.user._id);
        const isAdmin = req.user.role === "admin";
        if (!isOwner && !isAdmin) {
            return next(new AppError("Brak uprawnień.", 403));
        }

        req.article = article;
        next();
    } catch (e) {
        next(e);
    }
};
