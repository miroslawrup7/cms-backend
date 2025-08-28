// controllers/adminController.js v.2
const bcrypt = require("bcryptjs");
const PendingUser = require("../models/PendingUser");
const User = require("../models/User");
const { sanitizeTitle } = require("../utils/sanitize");
const { sendMail } = require("../utils/mailer");
const { approvedUserEmail, rejectedUserEmail } = require("../utils/emailTemplates");
const AppError = require("../utils/AppError");

// GET /api/admin/pending-users
const getPendingUsers = async (req, res, next) => {
    try {
        const { search = "", page = 1, limit = 10 } = req.query;

        const query = {
            $or: [{ username: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }],
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [total, users] = await Promise.all([
            PendingUser.countDocuments(query),
            PendingUser.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(), // ✅ DOBRZE - tylko odczyt
        ]);

        res.json({
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            users,
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/admin/approve/:id
const approveUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pending = await PendingUser.findById(id);
        if (!pending) return next(new AppError("Wniosek nie istnieje.", 404));

        const exists = await User.findOne({ email: pending.email });
        if (exists) {
            await pending.deleteOne();
            return next(new AppError("Email jest już zajęty w systemie.", 400));
        }

        const hashed = await bcrypt.hash(String(pending.password), 10);
        const user = new User({
            username: sanitizeTitle(pending.username),
            email: pending.email,
            password: hashed,
            role: pending.role,
        });
        await user.save();

        await pending.deleteOne();

        // wysyłka maila (best-effort)
        try {
            const tpl = approvedUserEmail({ username: user.username, email: user.email });
            await sendMail({ to: user.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
        } catch (mailErr) {
            console.warn("approveUser: mail send failed:", mailErr?.message || mailErr);
        }

        return res.json({ message: "Użytkownik zatwierdzony i dodany do systemu.", userId: user._id });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/admin/reject/:id
const rejectUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pending = await PendingUser.findById(id);
        if (!pending) return next(new AppError("Wniosek nie istnieje.", 404));

        // wysyłka maila (best-effort)
        try {
            const tpl = rejectedUserEmail({ username: pending.username, email: pending.email });
            await sendMail({ to: pending.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
        } catch (mailErr) {
            console.warn("rejectUser: mail send failed:", mailErr?.message || mailErr);
        }

        await pending.deleteOne();
        return res.json({ message: "Wniosek został odrzucony." });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getPendingUsers,
    approveUser,
    rejectUser,
};
