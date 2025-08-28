// models/User.js v.2
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Nieprawidłowy format adresu e-mail"],
        index: true, // ✅ Dodany indeks
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    role: {
        type: String,
        enum: ["user", "author", "admin"],
        default: "user",
    },
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    const isBcrypt = typeof this.password === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password);
    if (isBcrypt) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
