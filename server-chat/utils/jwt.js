const jwt = require("jsonwebtoken");

const SECRET = "YOUR_SUPER_SECRET_KEY"; // In production, use process.env.JWT_SECRET

exports.sign = (payload) => {
    return jwt.sign(payload, SECRET, { expiresIn: "1h" })
}

exports.verify = (token) => {
    return jwt.verify(token, SECRET)
}