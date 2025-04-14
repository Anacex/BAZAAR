const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { auth_JWT } = require("../middleware/authMiddleware");

const router = express.Router();
const PRIVATE_KEY = process.env.JWT_SECRET;

// Registering a new user upon access
router.post("/register", async (req, res) => {
    const { username, password, store_id } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }
    try {
        // Hashing the password for added security
        const hashedPass = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            "INSERT INTO users (username, password, store_id) VALUES ($1, $2, $3) RETURNING id",
            [username, hashedPass, store_id || null]
        );
        res.status(201).json({ 
            message: "User registered",
            userId: rows[0].id 
        });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') { // Unique violation error code in PostgreSQL
            return res.status(400).json({ error: "Username already exists" });
        }
        res.status(500).json({ error: "Database error", details: error.message });
    }
});
///////////////////////////////////////
router.post("/login", async (req, res) => {
    const {username, password} = req.body;
    console.log('\n=== LOGIN ATTEMPT ===');
    console.log('Username:', username);
    
    try {
        // 1. Get user from database
        const { rows } = await pool.query(
            "SELECT * FROM users WHERE username = $1", 
            [username]
        );
        
        if (rows.length === 0) {
            console.log('User not found');
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const user = rows[0];
        console.log('Stored hash:', user.password);
        
        // 2. Manual hash verification (temporary debug)
        const isBcryptHash = user.password.startsWith('$2a$') || 
                            user.password.startsWith('$2b$') ||
                            user.password.startsWith('$2y$');
        
        if (!isBcryptHash) {
            console.error('INVALID HASH FORMAT:', user.password);
            return res.status(500).json({ 
                error: "Server configuration error",
                details: `Hash format invalid: ${user.password.substring(0, 20)}...`
            });
        }

        // 3. Compare passwords
        const validPass = await bcrypt.compare(password, user.password.trim());
        console.log('Password match:', validPass);
        
        if (!validPass) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // 4. Generate token
        const token = jwt.sign(
            { id: user.id, username: user.username, store_id: user.store_id },
            PRIVATE_KEY,
            { expiresIn: "1h" }
        );
        
        res.json({ token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: "Login failed",
            details: error.message 
        });
    }
});

// Bcrypt test endpoint
router.post("/test-hash", async (req, res) => {
    try {
        const testPass = "pass123";
        const hash = await bcrypt.hash(testPass, 10);
        const match = await bcrypt.compare(testPass, hash);
        
        res.json({
            testPassword: testPass,
            generatedHash: hash,
            comparisonResult: match,
            hashStartsWith: hash.substring(0, 4),
            hashLength: hash.length
        });
    } catch (error) {
        res.status(500).json({ 
            error: "Bcrypt test failed",
            details: error.message 
        });
    }
});

module.exports = router;