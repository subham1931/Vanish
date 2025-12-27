const router = require("express").Router();
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const auth = require("../middlewares/auth");

// Send Friend Request
// Send Friend Request
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
                $or: [{ email: identifier.toLowerCase() }, { username: identifier }]
            });
        } else {
            return res.status(400).json({ error: "Receiver ID or identifier (email/username) required" });
        }

        if (!targetUser) return res.status(404).json({ error: "User not found" });

        const targetId = targetUser._id.toString();

        if (senderId === targetId) return res.status(400).json({ error: "Cannot send request to yourself" });

        // Check if already friends
        if (targetUser.friends.includes(senderId)) {
            return res.status(400).json({ error: "Already friends" });
        }

        // Check if request already sent (is senderId in target's friendRequests?)
        if (targetUser.friendRequests.includes(senderId)) {
            return res.status(400).json({ error: "Request already sent/pending" });
        }

        // Add senderId to target's friendRequests
        targetUser.friendRequests.push(senderId);
        await targetUser.save();

        res.json({ message: "Friend request sent" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get Pending Requests (Received)
router.get("/pending", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate("friendRequests", "username email avatar");

        // Return the populated users who sent the requests
        res.json(user.friendRequests || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Respond to Request (Accept/Reject)
router.post("/respond", auth, async (req, res) => {
    try {
        // requestId is actually the Sender's User ID here
        const { requestId: senderIdToActOn, action } = req.body;
        const currentUserId = req.user.userId;

        if (!senderIdToActOn) return res.status(400).json({ error: "Request ID (Sender ID) required" });

        const currentUser = await User.findById(currentUserId);

        // Check if the request actually exists
        if (!currentUser.friendRequests.includes(senderIdToActOn)) {
            return res.status(404).json({ error: "Friend request not found" });
        }

        if (action === "accept") {
            // Add to friends list for both
            // 1. Add sender to current user's friends
            if (!currentUser.friends.includes(senderIdToActOn)) {
                currentUser.friends.push(senderIdToActOn);
            }
            // 2. Remove from friendRequests
            currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== senderIdToActOn);
            await currentUser.save();

            // 3. Add current user to sender's friends using update (to avoid fetching sender doc if possible, or fetch safe)
            await User.findByIdAndUpdate(senderIdToActOn, {
                $addToSet: { friends: currentUserId },
                // Also ensure we aren't in their requests (rare edge case of double request)
                $pull: { friendRequests: currentUserId }
            });

            res.json({ message: "Friend request accepted" });

        } else if (action === "reject") {
            // Remove from friendRequests
            currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== senderIdToActOn);
            await currentUser.save();

            res.json({ message: "Friend request rejected" });
        } else {
            res.status(400).json({ error: "Invalid action" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Search Users to friend
router.get("/search", auth, async (req, res) => { // No changes needed here, just kept for context if needed or simple replace
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        // Find users matching email or username, excluding self
        const users = await User.find({
            $and: [
                { _id: { $ne: req.user.userId } },
                {
                    $or: [
                        { username: { $regex: q, $options: "i" } },
                        { email: { $regex: q, $options: "i" } }
                    ]
                }
            ]
        }).select("username email avatar");

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Friends List
router.get("/list", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate("friends", "username email avatar online lastSeen");
        res.json(user.friends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
