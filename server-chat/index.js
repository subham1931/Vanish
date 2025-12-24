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

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRouter);
app.use("/api/friends", friendRouter);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = 5000;
const MONGO_URI = "mongodb://localhost:27017/chat-app";

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    try {
      await mongoose.connection.collection("users").dropIndex("email_1");
      console.log("Dropped email_1 index");
    } catch (e) {
      // Index might not exist, which is fine
    }
  })
  .catch(err => console.error("MongoDB connection error:", err));

// app.get("/", (req, res) => {
//   res.sendFile(join(__dirname, "public/index.html"));
// });

const Message = require("./models/Message");
const { verify } = require("./utils/jwt");

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

  // Update online status
  await User.findByIdAndUpdate(userId, { online: true });
  socket.broadcast.emit("userOnline", userId);

  socket.join(userId);

  // Send message
  socket.on("privateMessage", async ({ content, to }) => {
    try {
      const message = await Message.create({
        sender: userId,
        receiver: to,
        content
      });

      io.to(to).emit("privateMessage", message);
      socket.emit("privateMessage", message);
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
    socket.emit("messagesLoaded", messages);
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected", userId);
    await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
    socket.broadcast.emit("userOffline", userId);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});