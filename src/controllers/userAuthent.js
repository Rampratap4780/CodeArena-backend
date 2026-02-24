const redisClient = require("../config/redis");
const User =  require("../models/user")
const validate = require('../utils/validator');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const Submission = require("../models/submission")

// 🚀 VERCEL/PRODUCTION COOKIE SETTINGS
const cookieOptions = {
    maxAge: 60 * 60 * 1000, // 1 hour
    httpOnly: true,    // Client-side JS se bachane ke liye
    secure: true,      // Vercel (HTTPS) ke liye compulsory
    sameSite: 'none'   // Cross-domain (Frontend to Backend) ke liye compulsory
};

const register = async (req, res) => {
    try {
        // Validate the data
        validate(req.body); 
        const { firstName, emailId, password } = req.body;

        req.body.password = await bcrypt.hash(password, 10);
        req.body.role = 'user';
        
        const user = await User.create(req.body);
        const token = jwt.sign(
            { _id: user._id, emailId: emailId, role: 'user' }, 
            process.env.JWT_KEY, 
            { expiresIn: 60 * 60 }
        );
        
        const reply = {
            firstName: user.firstName,
            emailId: user.emailId,
            _id: user._id,
            role: user.role,
        };
        
        // 🚨 Cookie Setup
        res.cookie('token', token, cookieOptions);
        
        res.status(201).json({
            user: reply,
            message: "Registered Successfully"
        });
    } catch (err) {
        res.status(400).send("Error: " + err.message);
    }
}

const login = async (req, res) => {
    try {
        const { emailId, password } = req.body;

        if (!emailId || !password) throw new Error("Invalid Credentials");

        const user = await User.findOne({ emailId });
        if (!user) throw new Error("Invalid Credentials");

        const match = await bcrypt.compare(password, user.password);
        if (!match) throw new Error("Invalid Credentials");

        const reply = {
            firstName: user.firstName,
            emailId: user.emailId,
            _id: user._id,
            role: user.role,
        };

        const token = jwt.sign(
            { _id: user._id, emailId: emailId, role: user.role }, 
            process.env.JWT_KEY, 
            { expiresIn: 60 * 60 }
        );
        
        // 🚨 Cookie Setup
        res.cookie('token', token, cookieOptions);
        
        res.status(200).json({
            user: reply,
            message: "Logged In Successfully"
        });
    } catch (err) {
        res.status(401).send("Error: " + err.message);
    }
}

// logOut feature
const logout = async (req, res) => {
    try {
        const { token } = req.cookies;
        
        // 🚀 Redis Blocklist Logic
        if (token) {
            const payload = jwt.decode(token);
            await redisClient.set(`token:${token}`, 'Blocked');
            await redisClient.expireAt(`token:${token}`, payload.exp);
        }

        // 🚨 Clear Cookie properly for Vercel
        res.cookie("token", "", { 
            expires: new Date(0), 
            httpOnly: true, 
            secure: true, 
            sameSite: 'none' 
        });
        
        res.status(200).json({ message: "Logged Out Successfully" }); 
    } catch (err) {
       res.status(503).send("Error: " + err.message);
    }
}

const adminRegister = async (req, res) => {
    try {
        validate(req.body); 
        const { firstName, emailId, password } = req.body;

        req.body.password = await bcrypt.hash(password, 10);
        req.body.role = 'admin';
        
        const user = await User.create(req.body);
        const token = jwt.sign(
            { _id: user._id, emailId: emailId, role: user.role }, 
            process.env.JWT_KEY, 
            { expiresIn: 60 * 60 }
        );
        
        // 🚨 Cookie Setup
        res.cookie('token', token, cookieOptions);
        
        res.status(201).json({ message: "Admin Registered Successfully" });
    } catch (err) {
        res.status(400).send("Error: " + err.message);
    }
}

const deleteProfile = async (req, res) => {
    try {
       const userId = req.result._id;
      
       // Delete user from DB
       await User.findByIdAndDelete(userId);

       // Uncomment below if you want to delete their submissions too
       // await Submission.deleteMany({ userId });
       
       // Clear cookie so they are logged out after profile deletion
       res.cookie("token", "", { 
           expires: new Date(0), 
           httpOnly: true, 
           secure: true, 
           sameSite: 'none' 
       });
       
       res.status(200).json({ message: "Profile Deleted Successfully" });
    } catch (err) {
        res.status(500).send("Internal Server Error: " + err.message);
    }
}

module.exports = { register, login, logout, adminRegister, deleteProfile };