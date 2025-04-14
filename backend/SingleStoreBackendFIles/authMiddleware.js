const jwt = require("jsonwebtoken");
const PRIVATE_KEY = process.env.JWT_SECRET;

const auth_JWT = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied, token missing or malformed" });
    }
    
    const token = authHeader.split(" ")[1];
    
    try {
        const decoded = jwt.verify(token, PRIVATE_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ 
            error: "Invalid token",
            details: err.message 
        });
    }
};


module.exports = { auth_JWT }; 