const crypto = require("crypto");

exports.generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.hashOtp = (otp) => {
    return crypto.createHash("sha256").update(otp).digest("hex");
}