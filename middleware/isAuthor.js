// middleware/isAuthor.js v.2
const Article = require("../models/Article");
const AppError = require("../utils/AppError");

const isAuthor = async (req, res, next) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return next(new AppError("Artykuł nie znaleziony", 404));
        }

        if (article.author.toString() !== req.user._id.toString()) {
            return next(new AppError("Brak uprawnień do edycji lub usunięcia tego artykułu", 403));
        }

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = isAuthor;
