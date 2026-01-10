const express = require("express");
const router = express.Router();
const multer = require("multer");
const authMiddleware = require("../middleware/auth");
const { uploadLimiter, generalLimiter, downloadLimiter } = require("../middleware/rateLimiter");
const {
  sendFile,
  getInbox,
  downloadFile,
} = require("../controllers/filesController");

// Configure multer for memory storage (we'll store in MongoDB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// POST /files/send - Upload encrypted file
router.post("/send", uploadLimiter, authMiddleware, upload.single("file"), sendFile);

// GET /files/inbox - List incoming files
router.get("/inbox", generalLimiter, authMiddleware, getInbox);

// GET /files/download/:fileId - Download encrypted file
router.get("/download/:fileId", downloadLimiter, authMiddleware, downloadFile);

module.exports = router;
