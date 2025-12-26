const { verify } = require("../utils/jwt");

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Access denied. No token provided." });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access denied. Invalid token format." });

    try {
        const decoded = verify(token);
        req.user = decoded; // { userId, phone, iat, exp }
        next();
    } catch (err) {
        res.status(400).json({ error: "Invalid token." });
    }
};
