import React, { useEffect, useState, useRef } from 'react'
import {
    MessageSquare, Send, LogOut, UserPlus, Users, Check, X, Search, Bell,
    ArrowLeft, User, Phone, Video, MoreVertical, Paperclip, Image as ImageIcon, Smile
} from 'lucide-react';
import socket from '../socket';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const ChatPage = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Friend System State
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [loadingAction, setLoadingAction] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/auth");
    };

    const fetchPendingRequests = async () => {
        try {
            const res = await api.get("/friends/pending");
            setPendingRequests(res.data);
        } catch (err) {
            console.error("Failed to fetch requests", err);
        }
    };

    const fetchFriends = async () => {
        try {
            const res = await api.get("/friends/list");
            setFriends(res.data);
            // If no friends and no requests, likely a new user. Help them out.
            // valid only for initial load
            // We can check if it's the very first load or just always open if empty?
            // Always opening might be annoying if they close it. 
            // Better: Only if friends.length is 0 AND we haven't shown it yet?
            // For now, let's just trigger it if result is empty.
            if (res.data.length === 0) {
                // setShowAddFriend(true); // User request: "automatically comes to friend list tab"
                // Actually, "Friend List Tab" might mean the SIDEBAR LIST.
                // But if they have no friends, the sidebar shows "No friends yet. Add one now".
                // I will make it open the "Add Friend" modal to be helpful.
                setShowAddFriend(true);
            }
        } catch (err) {
            console.error("Failed to fetch friends", err);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            const res = await api.get(`/friends/search?q=${searchQuery}`);
            setSearchResults(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const sendFriendRequest = async (identifier) => {
        setLoadingAction(identifier);
        try {
            await api.post("/friends/send", { identifier });
            alert("Request Sent!");
            setSearchResults(prev => prev.filter(u => u.username !== identifier && u.phone !== identifier));
            setShowAddFriend(false);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to send request");
        } finally {
            setLoadingAction(null);
        }
    };

    const handleRequestResponse = async (requestId, action) => {
        try {
            await api.post("/friends/respond", { requestId, action });
            fetchPendingRequests();
            if (action === "accept") fetchFriends();
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) setCurrentUser(JSON.parse(userStr));

        const token = localStorage.getItem("token");
        socket.auth = { token };
        socket.connect();

        fetchPendingRequests();
        fetchFriends();

        // POLL for friend requests every 5 seconds
        const intervalId = setInterval(() => {
            fetchPendingRequests();
            fetchFriends();
        }, 5000);

        // Initial check: If no friends, prompt to add one
        // We need to wait for the first fetch to complete. 
        // We can do this by checking friends state in a separate effect, 
        // but to avoid flickering, let's do it after the initial fetch in the same scope if possible,
        // or just use a flag.

        // For simplicity, let's add a one-time check in a separate useEffect or timeout
        setTimeout(() => {
            if (friends.length === 0) {
                // setShowAddFriend(true); // Option A: Open Modal
                // Option B: The user might mean "Show the sidebar" which is already shown.
                // "Friend list tab" might technically refer to the "Add Friend" modal since the list is empty.
            }
        }, 1000);

        const onPrivateMessage = (newMsg) => {
            setMessages((prev) => {
                if (prev.some(m => m._id === newMsg._id)) return prev;
                return [...prev, newMsg];
            });
        };

        const onMessagesLoaded = (msgs) => {
            setMessages(msgs);
        };

        const onUserOnline = (userId) => {
            setFriends(prev => prev.map(f => f._id === userId ? { ...f, online: true } : f));
            if (selectedFriend && selectedFriend._id === userId) {
                setSelectedFriend(prev => ({ ...prev, online: true }));
            }
        };

        const onUserOffline = (userId) => {
            setFriends(prev => prev.map(f => f._id === userId ? { ...f, online: false } : f));
            if (selectedFriend && selectedFriend._id === userId) {
                setSelectedFriend(prev => ({ ...prev, online: false }));
            }
        };

        socket.on("messagesLoaded", onMessagesLoaded);
        socket.on("privateMessage", onPrivateMessage);
        socket.on("userOnline", onUserOnline);
        socket.on("userOffline", onUserOffline);

        return () => {
            clearInterval(intervalId);
            socket.off("messagesLoaded", onMessagesLoaded);
            socket.off("privateMessage", onPrivateMessage);
            socket.off("userOnline", onUserOnline);
            socket.off("userOffline", onUserOffline);
            socket.disconnect();
        }
    }, [])

    const handleSelectFriend = (friend) => {
        setSelectedFriend(friend);
        socket.emit("getMessages", { withUserId: friend._id });
        setMessages([]);
        setShowRequests(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && selectedFriend) {
            socket.emit("privateMessage", {
                content: message,
                to: selectedFriend._id
            });
            setMessage("");
        }
    }

    return (
        <div className="h-[100dvh] bg-black text-white flex justify-center items-center p-0 md:p-6 overflow-hidden font-sans">
            <div className="w-full max-w-[1600px] h-full flex md:gap-6 relative">

                {/* Sidebar Card */}
                <div className={clsx(
                    "w-full md:w-[24rem] h-full bg-[#1e1e1e] md:rounded-[30px] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 absolute md:relative z-20",
                    selectedFriend ? "-translate-x-full opacity-0 md:opacity-100 md:translate-x-0" : "translate-x-0 opacity-100"
                )}>
                    {/* Sidebar Header */}
                    <div className="p-6 pb-2">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-bold tracking-tight">Vanish</h1>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowRequests(!showRequests)}
                                    className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors relative"
                                >
                                    <Bell className="w-5 h-5" />
                                    {pendingRequests.length > 0 && (
                                        <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#1e1e1e]"></span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowAddFriend(true)}
                                    className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                                >
                                    <UserPlus className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                                >
                                    <User className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-2">
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search Chats"
                                className="w-full bg-[#2a2a2a] text-white placeholder-zinc-500 pl-12 pr-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-violet-600/50 transition-all border border-transparent focus:border-violet-500/30"
                            />
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                        {showRequests ? (
                            <div className="px-3">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3 px-1">Friend Requests</h3>
                                {pendingRequests.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-sm">
                                        No pending requests
                                    </div>
                                ) : (
                                    pendingRequests.map(req => (
                                        <div key={req._id} className="bg-[#2a2a2a] p-4 rounded-3xl mb-3">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold">
                                                    {req.sender?.username?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{req.sender?.username}</p>
                                                    <p className="text-xs text-zinc-400">{req.sender?.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleRequestResponse(req._id, "accept")} className="flex-1 bg-violet-600 hover:bg-violet-700 py-2 rounded-xl text-xs font-bold transition-colors">Accept</button>
                                                <button onClick={() => handleRequestResponse(req._id, "reject")} className="flex-1 bg-[#3a3a3a] hover:bg-[#4a4a4a] py-2 rounded-xl text-xs font-bold transition-colors">Reject</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <>
                                {friends.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                                        <p className="text-sm">No friends yet.</p>
                                        <button
                                            onClick={() => setShowAddFriend(true)}
                                            className="mt-2 text-violet-400 hover:text-violet-300 text-xs font-bold"
                                        >
                                            Add one now
                                        </button>
                                    </div>
                                ) : (
                                    friends.map((friend) => (
                                        <div
                                            key={friend._id}
                                            onClick={() => handleSelectFriend(friend)}
                                            className={clsx(
                                                "flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all duration-200 border border-transparent",
                                                selectedFriend?._id === friend._id
                                                    ? "bg-[#2a2a2a] border-white/5"
                                                    : "hover:bg-[#2a2a2a]/50 hover:border-white/5"
                                            )}
                                        >
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                                                    {friend.username?.[0]?.toUpperCase()}
                                                </div>
                                                {friend.online && (
                                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-[3px] border-[#1e1e1e] rounded-full"></span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <h3 className="font-semibold text-white truncate">{friend.username}</h3>
                                                    {/* Placeholder time */}
                                                    {/* <span className="text-[10px] text-zinc-500">11:00pm</span> */}
                                                </div>
                                                <p className="text-sm text-zinc-400 truncate">
                                                    {friend.status || "Hey there! I am using Chat App."}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {/* Logout Button at bottom of sidebar */}
                    </div>

                    {/* Logout Button at bottom of sidebar (Fixed) */}
                    <div className="p-3 mt-auto border-t border-white/5">
                        <button onClick={handleLogout} className="flex items-center gap-3 w-full p-4 rounded-3xl hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors">
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>

                {/* Right Side - Chat Area */}
                <div className={clsx(
                    "w-full h-full bg-black md:bg-transparent md:rounded-[30px] flex flex-col absolute inset-0 md:relative z-30 md:z-10 transition-transform duration-300 transform",
                    selectedFriend ? "translate-x-0" : "translate-x-full md:translate-x-0"
                )}>
                    {!selectedFriend ? (
                        <div className="hidden md:flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                            <div className="w-32 h-32 bg-[#1e1e1e] rounded-full flex items-center justify-center shadow-2xl">
                                <MessageSquare className="w-12 h-12 text-zinc-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-zinc-400">Select a chat to start messaging</h2>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full bg-[#0a0a0a] md:rounded-[30px] border-none md:border border-white/5 shadow-2xl overflow-hidden relative">
                            {/* Chat Header */}
                            <div className="h-20 bg-[#1e1e1e]/80 backdrop-blur-md border-b border-white/5 flex items-center px-6 justify-between z-20">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedFriend(null)} className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white">
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-white shadow-lg">
                                        {selectedFriend.username?.[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white leading-tight">{selectedFriend.username}</h2>
                                        <p className="text-xs text-zinc-400">{selectedFriend.online ? "Online" : "Select for Contact info"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-zinc-400">
                                    <Search className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                                    <Phone className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                                    <Video className="w-6 h-6 hover:text-white cursor-pointer transition-colors" />
                                    <MoreVertical className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
                                {messages.map((msg, index) => {
                                    const isMe = msg.sender === currentUser?._id;
                                    const isLastFromUser = index === messages.length - 1 || messages[index + 1]?.sender !== msg.sender;

                                    return (
                                        <div key={index} className={clsx("flex gap-4 max-w-[85%] md:max-w-[70%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                                            {/* Avatar next to message bubble */}
                                            <div className={clsx("flex-shrink-0 self-end", !isLastFromUser && "opacity-0")}>
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm",
                                                    isMe ? "bg-violet-600" : "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                                                )}>
                                                    {isMe ? currentUser?.username?.[0] : selectedFriend.username?.[0]}
                                                </div>
                                            </div>

                                            <div className={clsx("flex flex-col", isMe ? "items-end" : "items-start")}>
                                                <div className={clsx(
                                                    "px-6 py-3.5 shadow-sm text-[15px] leading-relaxed break-words",
                                                    isMe
                                                        ? "bg-violet-600 text-white rounded-2xl rounded-tr-sm shadow-violet-900/20"
                                                        : "bg-[#2a2a2a] text-zinc-200 rounded-2xl rounded-tl-sm shadow-black/20"
                                                )}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] text-zinc-500 mt-1.5 px-1 font-medium">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 md:p-6 bg-[#0a0a0a] relative z-20">
                                <form
                                    onSubmit={handleSubmit}
                                    className="bg-[#1e1e1e] rounded-full p-2 pl-6 pr-2 shadow-2xl border border-white/5 flex items-center gap-4"
                                >
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Write your message...."
                                        className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none h-full py-2"
                                    />

                                    <div className="flex items-center gap-3 text-zinc-400 px-2 border-r border-zinc-700/50 pr-4">
                                        <Paperclip className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                                        <ImageIcon className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                                        <Smile className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!message.trim()}
                                        className="bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-500 text-white p-3 rounded-full transition-all shadow-lg shadow-violet-900/20 active:scale-95"
                                    >
                                        <Send className="w-5 h-5 ml-0.5" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Add Friend Modal - kept similar but styled darker */}
            <AnimatePresence>
                {showAddFriend && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1e1e1e] border border-white/10 rounded-[30px] p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold">Add Friend</h3>
                                <button onClick={() => setShowAddFriend(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search by username..."
                                        className="w-full bg-[#2a2a2a] border border-transparent focus:border-violet-500/50 rounded-2xl py-3 pl-12 pr-4 text-white outline-none transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white px-6 rounded-2xl font-bold transition-colors">Search</button>
                            </form>

                            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                                {searchResults.map(user => (
                                    <div key={user._id} className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold flex-shrink-0">
                                                {user.username?.[0] || "?"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate">{user.username}</p>
                                                <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => sendFriendRequest(user.email)}
                                            disabled={loadingAction === user.email}
                                            className="bg-zinc-700 text-white hover:bg-violet-600 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            {loadingAction === user.email ? "..." : "Add"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default ChatPage
