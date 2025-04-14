const pool = require("./config/db");

console.log("ℹ️ Starting database connection test...");

async function testConnection() {
    try {
        console.log("ℹ️ Attempting to connect to the database...");
        const [rows] = await pool.query("SELECT 1");
        console.log("✅ Database connection successful!");
    } catch (error) {
        console.error("❌ Database connection failed:", error);
    } finally {
        process.exit();  // Ensure the script exits after running
    }
}

testConnection();
