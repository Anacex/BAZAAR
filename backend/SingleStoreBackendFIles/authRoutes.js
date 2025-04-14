const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { auth_JWT } = require("../middleware/authMiddleware");

const router = express.Router();
const PRIVATE_KEY = process.env.JWT_SECRET;

//registing a new user upon access
router.post("/register", async (req, res)=>{
    const {username, password}= req.body;
    if(!username|| !password){
        return res.status(400).json({error: "Username and password required"});
    }
    try{
        //hashing the password for added security
        const hashedPass = await bcrypt.hash(password, 10);
        await pool.query("Insert into users (username, password) values (?,?)", [username, hashedPass]);
        res.status(201).json({message: "User registered"});

    }
    catch(error){
        console.error(error);
        res.status(500).json({error: "Database error",details: error.message});
    }
});

//verifying via jwt token upon logins
router.post("/login", async (req, res)=>{
    const{username, password}=req.body;
    if(!username ||!password){
        return res.status(400).json({error: "USername and password required"});

    }
    try{
        //check for user in registered users in DB
        const[users]= await pool.query("Select * from users where username =?", [username]);
        if(users.length===0){
            return res.status(401).json({error: "Invalid username or password"});

        }
        const user = users[0];

        //verify password with hashed password form earlier
        const validPass = await bcrypt.compare(password, user.password);
        if(!validPass){
            return res.status(401).json({error: "Invalid username or password"});

        }

        //everything goes well: generate JWT token for the session
        const token = jwt.sign({id: user.id, username: user.username}, PRIVATE_KEY, {expiresIn: "1h"});

        res.json({token});

    }
    catch(error){
        console.error(error);
        res.status(500).json({error: "Login failed", details: error.message});

    }
});

module.exports=router;
