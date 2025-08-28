// utils/advancedValidate.js v.1
const { validationResult, body } = require("express-validator");

// Middleware do obsługi błędów walidacji
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => error.msg);
        return res.status(400).json({
            status: "fail",
            message: errorMessages.join(" "),
        });
    }
    next();
};

// Walidacja rejestracji
const validateRegister = [body("username").isLength({ min: 3 }).withMessage("Nazwa użytkownika musi mieć co najmniej 3 znaki").trim().escape(), body("email").isEmail().withMessage("Podaj prawidłowy adres email").normalizeEmail(), body("password").isLength({ min: 6 }).withMessage("Hasło musi mieć co najmniej 6 znaków"), body("role").isIn(["user", "author"]).withMessage("Nieprawidłowa rola"), handleValidationErrors];

// Walidacja logowania
const validateLogin = [body("email").isEmail().withMessage("Podaj prawidłowy adres email").normalizeEmail(), body("password").notEmpty().withMessage("Hasło jest wymagane"), handleValidationErrors];

// Walidacja artykułu
const validateArticle = [body("title").isLength({ min: 5 }).withMessage("Tytuł musi mieć co najmniej 5 znaków").trim().escape(), body("content").isLength({ min: 20 }).withMessage("Treść musi mieć co najmniej 20 znaków").trim(), handleValidationErrors];

// Walidacja komentarza
const validateComment = [body("text").isLength({ min: 6 }).withMessage("Komentarz musi mieć co najmniej 6 znaków").trim().escape(), handleValidationErrors];

// Walidacja zmiany hasła
const validatePasswordChange = [body("oldPassword").notEmpty().withMessage("Stare hasło jest wymagane"), body("newPassword").isLength({ min: 6 }).withMessage("Nowe hasło musi mieć co najmniej 6 znaków"), handleValidationErrors];

// Walidacja zmiany roli (admin)
const validateRoleChange = [body("role").isIn(["user", "author", "admin"]).withMessage("Nieprawidłowa rola"), handleValidationErrors];

// Walidacja update'u usera
const validateUserUpdate = [body("username").optional().isLength({ min: 3 }).withMessage("Nazwa użytkownika musi mieć co najmniej 3 znaki").trim().escape(), handleValidationErrors];

module.exports = {
    validateRegister,
    validateLogin,
    validateArticle,
    validateComment,
    validatePasswordChange,
    validateRoleChange,
    validateUserUpdate,
    handleValidationErrors,
};
