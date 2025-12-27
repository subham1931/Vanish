const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (email, otp) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("Email credentials not set. OTP:", otp);
        return { success: false, error: "Email credentials are missing in environment variables." };
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Login OTP',
            text: `Your OTP for Chat App is ${otp}. Valid for 5 minutes.`
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to send email:", error);
        return { success: false, error: error.message };
    }
};

module.exports = { sendEmail };
