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

        const otp = generateOtp();
        console.log(`Generated OTP for ${email}:`, otp);

        // Save OTP using the store utility
        await saveOTP(email, otp);

        const sent = await sendEmail(email, otp);

        if (!sent) {
            console.warn("OTP sending failed or skipped.");
            // In production, handle this error
        }

        res.json({ message: "OTP sent successfully" });
    } catch (err) {
        console.error("Send OTP Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Register/Verify OTP and Create Account
router.post("/register", async (req, res) => {
    try {
        console.log("Register Request Body:", req.body); // DEBUG LOG
        const { email: rawEmail, otp, username, password } = req.body;

        if (!rawEmail) return res.status(400).json({ error: "Email is required" });
        const email = rawEmail.toLowerCase();

        // Retrieve OTP using the store utility
        const storedOtp = await getOTP(email);
        console.log(`Registering ${email}. Input OTP: ${otp}, Stored: ${storedOtp || 'None'}`);

        if (!storedOtp || storedOtp !== otp) {
            return res.status(401).json({ error: "Invalid or expired OTP" });
        }

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

// 4. Update Profile
router.put("/update-profile", auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { username, phone, status } = req.body;

        // Validation (Optional: Check if username is taken if changed)
        if (username) {
            const existingUser = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ error: "Username already taken" });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    ...(username && { username }),
                    ...(phone && { phone }),
                    ...(status && { status })
                }
            },
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