const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  uploadPublicKey,
  getPublicKey,
  revokePublicKey,
} = require("../controllers/usersController");

// POST /users/public-key - Store user's public key
router.post("/public-key", authMiddleware, uploadPublicKey);

// GET /users/public-key?email= - Get receiver's public key
router.get("/public-key", authMiddleware, getPublicKey);

// PUT /users/public-key - Revoke and update user's public key
router.put("/public-key", authMiddleware, revokePublicKey);

module.exports = router;
