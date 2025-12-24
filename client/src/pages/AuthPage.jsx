import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Smartphone, Lock, ArrowRight, Loader2, MessageSquare } from "lucide-react";
import { api } from "../lib/axios";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState("PE"); // PE=Phone, OV=OtpVerify
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        phone: "",
        otp: "",
    });
    const [error, setError] = useState("");
    const [requiresUsername, setRequiresUsername] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!formData.phone) {
            setError("Please enter phone number.");
            return;
        }
        setLoading(true);
        try {
            await api.post("/auth/request-otp", { phone: formData.phone });
            setStep("OV");
        } catch (err) {
            console.error(err);
            setError("Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!formData.otp) {
            setError("Please enter the OTP.");
            return;
        }

        // If username is required but missing
        if (requiresUsername && !formData.username) {
            setError("Please enter a username to create your account.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                phone: formData.phone,
                otp: formData.otp,
            };
            // Only send username if we know it's needed or if user entered it (just in case)
            if (formData.username) payload.username = formData.username;

            const res = await api.post("/auth/verify-otp", payload);
            console.log("Logged in:", res.data);

            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            navigate("/chat");
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data && err.response.data.requiresUsername) {
                setRequiresUsername(true);
                setError("New account! Please choose a username.");
            } else {
                setError(err.response?.data?.error || "Invalid OTP or server error.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px]" />

            <motion.div
                layout
                className="bg-[#1e293b]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
            >
                <div className="text-center mb-8">
                    <motion.div
                        className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30"
                    >
                        <MessageSquare className="text-white w-8 h-8" fill="white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-400">
                        {step === "PE" ? "Enter phone number to continue" : "Check console for OTP!"}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === "PE" ? (
                        <motion.form
                            key="step1"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            onSubmit={handleSendOtp}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                                <div className="relative group">
                                    <Smartphone className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="9876543210"
                                        className="w-full bg-[#334155]/50 border border-slate-600 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:bg-[#334155] transition-all placeholder:text-slate-500"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all disabled:opacity-70 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5 ml-2" /></>}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="step2"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            onSubmit={handleVerifyOtp}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">One-Time Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        name="otp"
                                        placeholder="• • • • • •"
                                        className="w-full bg-[#334155]/50 border border-slate-600 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:bg-[#334155] transition-all tracking-[0.5em] text-center font-mono text-lg placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-500"
                                        value={formData.otp}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Conditionally show Username input if required */}
                            {requiresUsername && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="space-y-2"
                                >
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Choose Username</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="text"
                                            name="username"
                                            placeholder="Eg. CoolUser123"
                                            className="w-full bg-[#334155]/50 border border-slate-600 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:bg-[#334155] transition-all placeholder:text-slate-500"
                                            value={formData.username}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center transition-all disabled:opacity-70 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (requiresUsername ? "Create Account" : "Verify & Login")}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep("PE"); setRequiresUsername(false); setError(""); }}
                                className="w-full text-slate-400 hover:text-white text-sm transition-colors py-2"
                            >
                                Change Phone Number
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
