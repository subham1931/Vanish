const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: { type: String },
    username: { type: String, unique: true },
    avatar: { type: String },
    status: { type: String },
    online: { type: Boolean },
    lastSeen: { type: Date },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

})

module.exports = mongoose.model("User", userSchema)