const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "YOUR_SUPER_SECRET_KEY";

exports.sign = (payload) => {
    return jwt.sign(payload, SECRET, { expiresIn: "7d" })
}

exports.verify = (token) => {
    return jwt.verify(token, SECRET)
}