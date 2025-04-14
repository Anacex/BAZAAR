const express = require("express");
const dotenv = require("dotenv");
const stockRoutes = require("./routes/stockRoutes");
const authRoutes = require("./routes/authRoutes"); // Import auth routes


dotenv.config();
const app = express();
console.log("Environment Variables Loaded:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_NAME:", process.env.DB_NAME);

app.use(express.json()); // Middleware for parsing JSON
const rateLimit = require("express-rate-limit");

// Apply globally (adjust limits as needed)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per window per IP
  message: "Too many requests from this IP. Please try again later."
});

app.use(limiter);

app.use("/api/auth", authRoutes); // Authentication routes
app.use("/api/stock", stockRoutes); // Use stock routes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
