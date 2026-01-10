const express = require("express");
const router = express.Router();
const { googleAuth } = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

// POST /auth/google
router.post("/google", authLimiter, googleAuth);

module.exports = router;
