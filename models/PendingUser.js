// models/PendingUser.js v.2
const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["user", "author"],
        default: "user",
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400, // ✅ Automatyczne usuwanie po 24 godzinach
    },
});

module.exports = mongoose.model("PendingUser", pendingUserSchema);
