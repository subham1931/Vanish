const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    phone: { type: String, unique: true },
    username: { type: String, unique: true },
    avatar: { type: String },
    status: { type: String },
    online: { type: Boolean },
    lastSeen: { type: Date },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    email: { type: String, sparse: true } // Add email with sparse index to allow multiple nulls
})

module.exports = mongoose.model("User", userSchema)