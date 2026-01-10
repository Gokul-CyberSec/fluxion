const rateLimit = require("express-rate-limit");

// General API rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter - stricter for login/signup (10 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter - 20 uploads per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: "Too many file uploads, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// File download rate limiter - 50 downloads per 15 minutes
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: "Too many download requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Key management rate limiter - 5 requests per hour (key generation/revocation)
const keyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: "Too many key operations, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  downloadLimiter,
  keyLimiter,
};
