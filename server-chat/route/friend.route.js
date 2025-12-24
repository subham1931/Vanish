const router = require("express").Router();
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const auth = require("../middlewares/auth");

// Send Friend Request
// Send Friend Request
router.post("/send", auth, async (req, res) => {
    try {
        const { receiverId, identifier } = req.body;
        const senderId = req.user.userId;

        let targetUser;

        if (receiverId) {
            targetUser = await User.findById(receiverId);
        } else if (identifier) {
            targetUser = await User.findOne({
                $or: [{ phone: identifier }, { username: identifier }]
            });
        } else {
            return res.status(400).json({ error: "Receiver ID or identifier (phone/username) required" });
        }

        if (!targetUser) return res.status(404).json({ error: "User not found" });

        const targetId = targetUser._id.toString();

        if (senderId === targetId) return res.status(400).json({ error: "Cannot send request to yourself" });

        // Check availability
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: senderId, receiver: targetId },
                { sender: targetId, receiver: senderId }
            ]
        });

        if (existingRequest) {
            if (existingRequest.status === "pending") return res.status(400).json({ error: "Request already pending" });
            if (existingRequest.status === "accepted") return res.status(400).json({ error: "Already friends" });
            return res.status(400).json({ error: "Request interaction already exists" });
        }

        // Check if already friends in User model (double check)
        const senderUser = await User.findById(senderId);
        if (senderUser.friends.includes(targetId)) {
            return res.status(400).json({ error: "Already friends" });
        }

        const newRequest = await FriendRequest.create({ sender: senderId, receiver: targetId });
        res.json({ message: "Friend request sent", request: newRequest });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Pending Requests (Received)
router.get("/pending", auth, async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            receiver: req.user.userId,
            status: "pending"
        }).populate("sender", "username phone avatar");
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Respond to Request (Accept/Reject)
router.post("/respond", auth, async (req, res) => {
    try {
        const { requestId, action } = req.body; // action: 'accept' or 'reject'
        const userId = req.user.userId;

        const request = await FriendRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: "Request not found" });

        if (request.receiver.toString() !== userId) return res.status(403).json({ error: "Not authorized" });
        if (request.status !== "pending") return res.status(400).json({ error: "Request already handled" });

        if (action === "accept") {
            request.status = "accepted";
            await request.save();

            // Add to friends list for both
            await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
            await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

            res.json({ message: "Friend request accepted" });
        } else if (action === "reject") {
            // Option A: Set status to rejected
            // request.status = "rejected"; 
            // await request.save();

            // Option B: Delete the request so they can request again later? 
            // Prompt says "rejestc", usually implies keeping state or just deleting. 
            // Let's delete it so it disappears from the list, or keep it as rejected. 
            // "rejestc" -> usually means it's gone from pending.

            // I will delete the document for simplicity so they can request again if it was a mistake, 
            // OR I can keep it. The user didn't specify. I'll delete it to keep db clean.
            await FriendRequest.findByIdAndDelete(requestId);
            res.json({ message: "Friend request rejected" });
        } else {
            res.status(400).json({ error: "Invalid action" });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search Users to friend
router.get("/search", auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        // Find users matching phone or username, excluding self
        const users = await User.find({
            $and: [
                { _id: { $ne: req.user.userId } },
                {
                    $or: [
                        { username: { $regex: q, $options: "i" } },
                        { phone: { $regex: q, $options: "i" } }
                    ]
                }
            ]
        }).select("username phone avatar");

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Friends List
router.get("/list", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate("friends", "username phone avatar online lastSeen");
        res.json(user.friends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
