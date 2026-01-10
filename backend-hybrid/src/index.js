require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { generalLimiter } = require("./middleware/rateLimiter");

// Import routes
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const filesRoutes = require("./routes/files");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
const corsOrigin =
  process.env.FRONTEND_URL === "*"
    ? "*"
    : process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: corsOrigin,
    credentials: corsOrigin !== "*",
  })
);
app.use(express.json());

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Routes
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/files", filesRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Zero-Trust Backend Running" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
