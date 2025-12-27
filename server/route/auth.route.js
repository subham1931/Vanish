const router = require("express").Router();
const User = require("../models/User");
const { saveOTP, getOTP, deleteOTP } = require("../utils/otpStore");
const { sign } = require("../utils/jwt");
const { generateOtp } = require("../utils/otp");
const { sendEmail } = require("../utils/email");
const bcrypt = require("bcryptjs");
const auth = require("../middlewares/auth");

// 1. Send OTP for Registration
router.post("/send-otp", async (req, res) => {
    try {
        const { email: rawEmail } = req.body;

        if (!rawEmail) {
            return res.status(400).json({ error: "Email is required" });
        }

        const email = rawEmail.toLowerCase();

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists. Please login." });
        }

        /* OTP BYPASS - DISABLED FOR NOW
        const otp = generateOtp();
        console.log(`Generated OTP for ${email}:`, otp);

        // Save OTP using the store utility
        await saveOTP(email, otp);

        const emailResult = await sendEmail(email, otp);

        if (!emailResult.success) {
            console.warn("OTP sending failed:", emailResult.error);
            return res.status(500).json({ error: "Failed to send OTP email", details: emailResult.error });
        }
        */

        // MOCK OTP for development/fallback
        // Ideally you would delete this in production or user input "123456"
        // But for now we just say "OTP sent" and we will skip verification or accept any OTP.
        // Actually, to make "Register" work without changing frontend logic:
        // We will just store a hardcoded OTP "123456" silently so user can enter it?
        // OR better: The user wants "normal registration".
        // If we want NORMAL registration (no OTP), we need to change how frontend behaves.
        // BUT, the easiest way to satisfy "comment out otp verification" for the USER's
        // current request without breaking frontend flow is to:
        // 1. Tell frontend "OTP Sent"
        // 2. In /register, IGNORE the OTP check.

        res.json({ message: "OTP sent successfully" });
    } catch (err) {
        console.error("Send OTP Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Register/Verify OTP and Create Account
router.post("/register", async (req, res) => {
    try {
        const { email: rawEmail, username, password } = req.body;

        if (!rawEmail) return res.status(400).json({ error: "Email is required" });
        const email = rawEmail.toLowerCase();

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ error: "Username already taken" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            email,
            username,
            password: hashedPassword,
            avatar: "",
            status: "Hey there! I am using Chat App.",
            online: false,
            lastSeen: new Date(),
            friends: []
        });

        const token = sign({ userId: user._id, email });

        // Delete OTP after successful registration
        await deleteOTP(email);

        res.json({ token, user, message: "Registration successful" });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Login with Password
router.post("/login", async (req, res) => {
    try {
        const { email: rawEmail, password } = req.body;

        if (!rawEmail || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        const email = rawEmail.toLowerCase();

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = sign({ userId: user._id, email });
        res.json({ token, user, message: "Login successful" });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
});

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const cloudinary = require("../lib/cloudinary");

const streamUpload = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "chat-app-avatars" },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        stream.write(buffer);
        stream.end();
    });
};

// 4. Update Profile
router.put("/update-profile", auth, upload.single("avatar"), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { username, phone, status } = req.body;

        let avatarUrl;
        if (req.file) {
            const result = await streamUpload(req.file.buffer);
            avatarUrl = result.secure_url;
        }

        // Validation (Optional: Check if username is taken if changed)
        if (username) {
            const existingUser = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ error: "Username already taken" });
            }
        }

        const updateData = {
            ...(username && { username }),
            ...(phone && { phone }),
            ...(status && { status }),
            ...(avatarUrl && { avatar: avatarUrl })
        };

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true } // Return updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: updatedUser, message: "Profile updated successfully" });

    } catch (err) {
        console.error("Update Profile Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;