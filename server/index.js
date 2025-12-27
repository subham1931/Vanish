require("dotenv").config();
const express = require("express");
const http = require("http");
const { join } = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const authRouter = require("./route/auth.route");
const friendRouter = require("./route/friend.route");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174", "http://localhost:4173"].filter(Boolean);
console.log("Allowed Origins:", allowedOrigins);

app.use(cors({
  origin: allowedOrigins,
  // origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:4173"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRouter);
app.use("/api/friends", friendRouter);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    // origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:4173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    try {
      await mongoose.connection.collection("users").dropIndex("phone_1");
      console.log("Dropped phone_1 index");
    } catch (e) {
      // Index might not exist
    }
  })
  .catch(err => console.error("MongoDB connection error:", err));

// app.get("/", (req, res) => {
//   res.sendFile(join(__dirname, "public/index.html"));
// });

const Message = require("./models/Message");
const { verify } = require("./utils/jwt");
const redis = require("./lib/redis"); // Import Redis

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const decoded = verify(token);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

const User = require("./models/User");

io.on("connection", async (socket) => {
  const userId = socket.user.userId;
  console.log("User connected", userId);

  // 1. Add current socket to user's socket list
  await redis.sadd(`user:${userId}:sockets`, socket.id);

  // 2. Check if this is the first connection (user coming online)
  // We check purely based on the fact we just added one. If the set size is 1, they are new.
  const socketCount = await redis.scard(`user:${userId}:sockets`);
  if (socketCount === 1) {
    await redis.sadd("online_users", userId);
    socket.broadcast.emit("userOnline", userId);
  }

  // Send message
  socket.on("privateMessage", async ({ content, to }) => {
    try {
      const message = await Message.create({
        sender: userId,
        receiver: to,
        content
      });

      // Emit to Receiver's sockets (using Redis mapping)
      const receiverSockets = await redis.smembers(`user:${to}:sockets`);
      if (receiverSockets.length > 0) {
        io.to(receiverSockets).emit("privateMessage", message);
      }

      // Emit to Sender's sockets (for multi-tab sync)
      const senderSockets = await redis.smembers(`user:${userId}:sockets`);
      if (senderSockets.length > 0) {
        io.to(senderSockets).emit("privateMessage", message);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Load chat history
  socket.on("getMessages", async ({ withUserId }) => {
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: withUserId },
        { sender: withUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    // Mark messages as read when loading history
    await Message.updateMany(
      { sender: withUserId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    socket.emit("messagesLoaded", messages);
  });

  // Mark specific conversation as read
  socket.on("markRead", async ({ fromUserId }) => {
    await Message.updateMany(
      { sender: fromUserId, receiver: userId, read: false },
      { $set: { read: true } }
    );
    // Optionally notify the sender if needed for read receipts
  });

  // Typing indicators
  socket.on("typing", async ({ to }) => {
    const receiverSockets = await redis.smembers(`user:${to}:sockets`);
    if (receiverSockets.length > 0) {
      io.to(receiverSockets).emit("userTyping", { userId });
    }
  });

  socket.on("stopTyping", async ({ to }) => {
    const receiverSockets = await redis.smembers(`user:${to}:sockets`);
    if (receiverSockets.length > 0) {
      io.to(receiverSockets).emit("userStoppedTyping", { userId });
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected", userId);

    // 1. Remove current socket from user's socket list
    await redis.srem(`user:${userId}:sockets`, socket.id);

    // 2. Check if user has no more open connections
    const remainingSockets = await redis.scard(`user:${userId}:sockets`);
    if (remainingSockets === 0) {
      await redis.srem("online_users", userId);
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      socket.broadcast.emit("userOffline", userId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});