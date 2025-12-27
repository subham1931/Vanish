import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Mail, Phone, Edit2, Save, X, Loader2, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/axios';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        username: '',
        phone: ''
    });

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setFormData({
                username: parsed.username || '',
                phone: parsed.phone || ''
            });
        }
    }, []);

    const handleBack = () => navigate('/chat');

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const data = new FormData();
            data.append("username", formData.username);
            data.append("phone", formData.phone);
            if (formData.status) data.append("status", formData.status); // preserve status logic if needed
            if (selectedFile) {
                data.append("avatar", selectedFile);
            }

            const res = await api.put("/auth/update-profile", data);
            const updatedUser = { ...user, ...res.data.user };

            // Update local state and storage
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            setIsEditing(false);
            setSelectedFile(null); // Clear file selection
            // Optional: Show success toast
        } catch (err) {
            console.error("Update failed", err);
            alert(err.response?.data?.error || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-[100dvh] bg-black text-white flex items-center justify-center p-0 md:p-4 font-sans overflow-hidden">
            <div className="w-full md:max-w-md h-full md:h-auto bg-[#1e1e1e] md:rounded-[30px] overflow-y-auto shadow-2xl relative custom-scrollbar">

                {/* Header Background */}
                <div className="h-32 bg-gradient-to-r from-violet-600 to-indigo-600"></div>

                {/* Back Button */}
                <button
                    onClick={handleBack}
                    className="absolute top-4 left-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all z-10"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>

                {/* Action Buttons (Edit/Save/Cancel) */}
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="p-2 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-600 transition-all"
                                title="Cancel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="p-2 bg-emerald-500/80 backdrop-blur-md rounded-full text-white hover:bg-emerald-600 transition-all disabled:opacity-50"
                                title="Save"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all"
                            title="Edit Profile"
                        >
                            <Edit2 className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Profile Content */}
                <div className="px-6 pb-8 -mt-16 flex flex-col items-center">
                    <div className="relative mb-4">
                        <div className="w-32 h-32 rounded-full bg-[#1e1e1e] p-1.5 relative group">
                            <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-5xl font-bold text-white overflow-hidden uppercase relative">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : user?.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user?.username?.[0]
                                )}

                                {isEditing && (
                                    <div
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera className="w-8 h-8 text-white/80" />
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white mb-1">{user?.username}</h2>
                        <p className="text-zinc-400 text-sm">Online</p>
                    </div>

                    <div className="w-full space-y-4">
                        {/* Username Field */}
                        <div className="group bg-[#2a2a2a] p-4 rounded-2xl border border-white/5 transition-all focus-within:border-violet-500/50">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-400">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">Username</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            className="w-full bg-black/20 text-white rounded px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500/50 -ml-2"
                                        />
                                    ) : (
                                        <p className="text-zinc-200 font-medium py-1">{user?.username}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Email Field (Read Only) */}
                        <div className="group bg-[#2a2a2a] p-4 rounded-2xl border border-white/5 transition-all opacity-80">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-400">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">Email</p>
                                    <p className="text-zinc-200 font-medium py-1">{user?.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Phone Field */}
                        <div className="group bg-[#2a2a2a] p-4 rounded-2xl border border-white/5 transition-all focus-within:border-violet-500/50">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-400">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">Phone</p>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="Add phone number"
                                            className="w-full bg-black/20 text-white rounded px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500/50 -ml-2"
                                        />
                                    ) : (
                                        <p className="text-zinc-200 font-medium py-1">{user?.phone || 'Not set'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProfilePage
