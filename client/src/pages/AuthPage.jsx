import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, ArrowRight, Loader2, MessageSquare } from "lucide-react";
import { api } from "../lib/axios";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
    const navigate = useNavigate();
    const [authMode, setAuthMode] = useState("LOGIN"); // LOGIN or REGISTER
    const [step, setStep] = useState(1); // 1=Email/Pass(Login) or Email(Register), 2=OTP+Pass(Register)
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        otp: "",
    });
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    // Login Submission
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post("/auth/login", {
                email: formData.email,
                password: formData.password
            });
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            navigate("/chat");
        } catch (err) {
            setError(err.response?.data?.error || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    // Register Step 1: Send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!formData.email) return setError("Email is required");

        setLoading(true);
        try {
            await api.post("/auth/send-otp", { email: formData.email });
            setStep(2); // Move to OTP verification
        } catch (err) {
            setError(err.response?.data?.error || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    // Register Step 2: Verify OTP & Create Account
    const handleRegister = async (e) => {
        e.preventDefault();
        if (!formData.otp || !formData.username || !formData.password) {
            return setError("All fields are required");
        }

        setLoading(true);
        try {
            const res = await api.post("/auth/register", {
                email: formData.email,
                otp: formData.otp,
                username: formData.username,
                password: formData.password
            });
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            navigate("/chat");
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px]" />

            <motion.div layout className="bg-[#1e293b]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
                <div className="text-center mb-6">
                    <motion.div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                        <MessageSquare className="text-white w-8 h-8" fill="white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        {authMode === "LOGIN" ? "Welcome Back" : "Create Account"}
                    </h1>

                    {/* Toggle Auth Mode */}
                    <div className="flex bg-[#334155]/50 p-1 rounded-xl mt-4">
                        <button
                            onClick={() => { setAuthMode("LOGIN"); setStep(1); setError(""); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === "LOGIN" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setAuthMode("REGISTER"); setStep(1); setError(""); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === "REGISTER" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                        >
                            Register
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* LOGIN FORM */}
                    {authMode === "LOGIN" && (
                        <motion.form
                            key="login-form"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleLogin}
                            className="space-y-4"
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} className="w-full bg-[#334155]/50 border border-slate-600 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:bg-[#334155] transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className="w-full bg-[#334155]/50 border border-slate-600 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:bg-[#334155] transition-all" />
                                    </div>
                                </div>
                            </div>
                            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</p>}
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center transition-all">
                                {loading ? <Loader2 className="animate-spin" /> : "Login"}
                            </button>
                        </motion.form>
                    )}

                    {/* REGISTER FORM - Step 1 (Email) */}
                    {authMode === "REGISTER" && step === 1 && (
                        <motion.form
                            key="reg-step-1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleSendOtp}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} className="w-full bg-[#334155]/50 border border-slate-600 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-purple-500 focus:bg-[#334155] transition-all" />
                                </div>
                            </div>
                            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</p>}
                            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center transition-all">
                                {loading ? <Loader2 className="animate-spin" /> : <>Send OTP <ArrowRight className="ml-2 w-4 h-4" /></>}
                            </button>
                        </motion.form>
                    )}

                    {/* REGISTER FORM - Step 2 (OTP + Details) */}
                    {authMode === "REGISTER" && step === 2 && (
                        <motion.form
                            key="reg-step-2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleRegister}
                            className="space-y-4"
                        >
                            <p className="text-sm text-slate-400 text-center">OTP sent to {formData.email}</p>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 transition-colors" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        readOnly
                                        disabled
                                        className="w-full bg-[#334155]/30 border border-slate-600 text-slate-400 rounded-xl py-3 pl-10 pr-4 outline-none cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">OTP Code</label>
                                <input type="text" name="otp" placeholder="123456" value={formData.otp} onChange={handleChange} className="w-full bg-[#334155]/50 border border-slate-600 text-white rounded-xl py-3 px-4 text-center tracking-widest outline-none focus:border-purple-500" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Username</label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                    <input type="text" name="username" placeholder="cooluser" value={formData.username} onChange={handleChange} className="w-full bg-[#334155]/50 border border-slate-600 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-purple-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Create Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                    <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className="w-full bg-[#334155]/50 border border-slate-600 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-purple-500" />
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</p>}

                            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center transition-all">
                                {loading ? <Loader2 className="animate-spin" /> : "Complete Registration"}
                            </button>
                            <button type="button" onClick={() => setStep(1)} className="w-full text-slate-400 hover:text-white text-xs mt-2">Back to Email</button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
