const router = require("express").Router();
const User = require("../models/User");
const { sign } = require("../utils/jwt");
const { generateOtp } = require("../utils/otp");

const { sendSMS } = require("../utils/sms");
const { sendEmail } = require("../utils/email");

const otpStore = new Map();

router.post("/request-otp", async (req, res) => {
    const { phone } = req.body;
    const otp = generateOtp();
    console.log("Generated OTP:", otp);
    otpStore.set(phone, otp);

    const isEmail = phone.includes("@");
    let sent = false;

    if (isEmail) {
        sent = await sendEmail(phone, otp);
    } else {
        sent = await sendSMS(phone, otp);
    }

    if (!sent) {
        // If sending fails, we might still allow it for dev testing via console, or return error.
        console.warn("OTP sending failed or skipped.");
    }

    res.json({ message: "OTP sent successfully" });
})

router.post("/verify-otp", async (req, res) => {
    try {
        const { phone, otp, username } = req.body;
        const storedOtp = otpStore.get(phone);

        console.log(`Verifying OTP for ${phone}. Received: ${otp}, Stored: ${storedOtp}`);

        if (storedOtp !== otp) {
            console.log("OTP Mismatch");
            return res.status(401).json({ error: "Invalid OTP" });
        }

        let user = await User.findOne({ phone });
        if (!user) {
            // New User Flow
            if (!username) {
                return res.status(400).json({
                    error: "Username required for new account",
                    requiresUsername: true
                });
            }

            // Check if username is taken
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ error: "Username already taken" });
            }

            user = await User.create({ phone, username, avatar: "", status: "", online: false, lastSeen: new Date(), friends: [] })
        }

        const token = sign({ userId: user._id, phone })
        // Clear OTP after success
        otpStore.delete(phone);

        res.json({ token, user });
    } catch (err) {
        console.error("Verify OTP Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;