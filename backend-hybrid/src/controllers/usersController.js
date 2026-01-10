const User = require("../models/User");

// POST /users/public-key - Store user's public key
const uploadPublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ error: "Public key is required" });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow setting public key once (registration only)
    if (user.publicKey) {
      return res.status(400).json({ error: "Public key already set" });
    }

    user.publicKey = publicKey;
    await user.save();

    res.json({ message: "Public key stored" });
  } catch (error) {
    console.error("Upload public key error:", error);
    res.status(500).json({ error: "Failed to store public key" });
  }
};

// GET /users/public-key?email= - Get receiver's public key
const getPublicKey = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.publicKey) {
      return res
        .status(404)
        .json({ error: "User has not registered their public key" });
    }

    res.json({
      userId: user._id.toString(),
      publicKey: user.publicKey,
    });
  } catch (error) {
    console.error("Get public key error:", error);
    res.status(500).json({ error: "Failed to get public key" });
  }
};

// PUT /users/public-key - Revoke and update user's public key
const revokePublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ error: "Public key is required" });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the public key (revoke old one and set new one)
    user.publicKey = publicKey;
    await user.save();

    res.json({ message: "Public key revoked and updated successfully" });
  } catch (error) {
    console.error("Revoke public key error:", error);
    res.status(500).json({ error: "Failed to revoke public key" });
  }
};

module.exports = { uploadPublicKey, getPublicKey, revokePublicKey };
