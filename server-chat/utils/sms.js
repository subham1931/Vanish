const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

let client;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
}

const sendSMS = async (phone, otp) => {
    if (!client) {
        console.log("Twilio not configured. OTP:", otp);
        return true; // Fallback to console success
    }

    try {
        await client.messages.create({
            body: `Your OTP for Chat App is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        return true;
    } catch (error) {
        console.error("Failed to send SMS:", error);
        return false;
    }
};

module.exports = { sendSMS };
