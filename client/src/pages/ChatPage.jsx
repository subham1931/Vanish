import React, { useEffect, useState } from 'react'
import { MessageSquare, Send, LogOut, UserPlus, Users, Check, X, Search, Bell, ArrowLeft } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-900 text-white flex overflow-hidden">
            {/* Sidebar - Full width on mobile unless chat selected */}
            <div className={clsx(
                "w-full md:w-80 bg-slate-800 border-r border-slate-700 flex flex-col transition-all",
                selectedFriend ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Users className="text-blue-400" /> Friends
                    </h2>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setShowRequests(!showRequests)}
                            className={clsx("p-2 hover:bg-slate-700 rounded-lg relative", showRequests && "bg-slate-700 text-blue-400")}
                            title="Friend Requests"
                        >
                            <Bell className="w-5 h-5" />
                            {pendingRequests.length > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                        </button>
                        <button
                            onClick={() => setShowAddFriend(true)}
                            className="p-2 hover:bg-slate-700 rounded-lg"
                            title="Add Friend"
                        >
                            <UserPlus className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {/* Toggle View: Friends or Requests */}
                    {showRequests ? (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">Pending Requests</h3>
                            {pendingRequests.length === 0 ? (
                                <p className="text-sm text-slate-500 px-2">No pending requests.</p>
                            ) : (
                                pendingRequests.map(req => (
                                    <div key={req._id} className="bg-slate-700/50 p-3 rounded-lg flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold">
                                                {req.sender?.username?.[0] || "?"}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{req.sender?.username}</p>
                                                <p className="text-xs text-slate-400">{req.sender?.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                            <button
                                                onClick={() => handleRequestResponse(req._id, "accept")}
                                                className="flex-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 py-1 rounded text-xs font-medium flex items-center justify-center gap-1"
                                            >
                                                <Check className="w-3 h-3" /> Accept
                                            </button>
                                            <button
                                                onClick={() => handleRequestResponse(req._id, "reject")}
                                                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 py-1 rounded text-xs font-medium flex items-center justify-center gap-1"
                                            >
                                                <X className="w-3 h-3" /> Reject
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {/* Friends List */}
                            {friends.length === 0 ? (
                                <div className="p-2 text-sm text-slate-500 text-center mt-4">
                                    No friends yet. Add some!
                                </div>
                            ) : (
                                friends.map(friend => (
                                    <div
                                        key={friend._id}
                                        onClick={() => handleSelectFriend(friend)}
                                        className={clsx(
                                            "p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors group",
                                            selectedFriend?._id === friend._id ? "bg-blue-600 shadow-md transform scale-[1.02]" : "hover:bg-slate-700/50"
                                        )}
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 group-hover:bg-purple-500/30 transition-colors">
                                                {friend.username?.[0]}
                                            </div>
                                            {friend.online && (
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800"></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className={clsx("font-medium text-sm", selectedFriend?._id === friend._id ? "text-white" : "text-slate-200")}>
                                                {friend.username}
                                            </p>
                                            <p className={clsx("text-xs truncate w-32", selectedFriend?._id === friend._id ? "text-blue-200" : "text-slate-500")}>
                                                {friend.phone}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-700">
                    <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors w-full p-2 hover:bg-slate-700 rounded-lg">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </div>

            {/* Main Chat Area - Hidden on mobile if no friend selected */}
            <div className={clsx(
                "flex-1 flex flex-col h-screen relative bg-slate-900/50 transition-all",
                !selectedFriend ? "hidden md:flex" : "flex"
            )}>
                {!selectedFriend ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-10 h-10 text-slate-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-400">Welcome to Chat App</h2>
                        <p className="mt-2">Select a friend from the sidebar to start messaging.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                {/* Back Button for Mobile */}
                                <button
                                    onClick={() => setSelectedFriend(null)}
                                    className="md:hidden p-2 hover:bg-slate-700 rounded-full text-slate-300"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>

                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300">
                                    {selectedFriend.username?.[0]}
                                </div>
                                <div className="flex-1">
                                    <h1 className="text-xl font-bold truncate">{selectedFriend.username}</h1>
                                    <p className="text-xs text-slate-400">{selectedFriend.online ? "Online" : "Offline"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-2">
                            {messages.length === 0 && (
                                <div className="text-center text-slate-500 mt-10">No messages yet. Say hi! 👋</div>
                            )}
                            {messages
                                .filter(msg => (msg.sender === selectedFriend._id || msg.receiver === selectedFriend._id))
                                .map((msg, index) => {
                                    const isMe = msg.sender === currentUser?._id;
                                    return (
                                        <div key={index} className={clsx("flex flex-col max-w-[80%]", isMe ? "self-end items-end" : "self-start items-start")}>
                                            <div className={clsx(
                                                "p-3 rounded-2xl text-sm",
                                                isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-slate-700 text-slate-100 rounded-bl-none"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-1 px-1">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors"
                                placeholder={`Message ${selectedFriend.username}...`}
                            />
                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20">
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </>
                )}

                {/* Add Friend Modal */}
                <AnimatePresence>
                    {showAddFriend && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold">Add Friend</h3>
                                    <button onClick={() => setShowAddFriend(false)} className="text-slate-400 hover:text-white">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Search by username or phone..."
                                            className="w-full bg-slate-900 border border-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-white outline-none focus:border-blue-500"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl">Search</button>
                                </form>

                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {searchResults.map(user => (
                                        <div key={user._id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300">
                                                    {user.username?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.username}</p>
                                                    <p className="text-xs text-slate-400">{user.phone}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => sendFriendRequest(user.phone)}
                                                disabled={loadingAction === user.phone}
                                                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                {loadingAction === user.phone ? "Sending..." : "Add"}
                                            </button>
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && searchQuery && (
                                        <p className="text-center text-slate-500 py-4">No users found.</p>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default ChatPage
