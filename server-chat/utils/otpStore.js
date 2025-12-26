const Otp = require("../models/Otp");

exports.saveOTP = async (email, otp) => {
    // Upsert: Update if exists, Insert if not
    await Otp.findOneAndUpdate(
        { email },
        { otp, createdAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

exports.getOTP = async (email) => {
    const record = await Otp.findOne({ email });
    return record ? record.otp : null;
};

exports.deleteOTP = async (email) => {
    await Otp.deleteOne({ email });
};
