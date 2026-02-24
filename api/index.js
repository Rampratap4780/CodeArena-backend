const express = require('express');
const app = express();
require('dotenv').config();

const main = require('../src/config/db');
const redisClient = require('../src/config/redis');

const cookieParser = require('cookie-parser');
const authRouter = require("../src/routes/userAuth");
const problemRouter = require("../src/routes/problemCreator");
const submitRouter = require("../src/routes/submit");
const aiRouter = require("../src/routes/aiChatting");
const videoRouter = require("../src/routes/videoCreator");
const cors = require('cors');

// ✅ CORS (local + production)
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://code-arena-frontend-rho.vercel.app/"
    ],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());


// ✅ DB + Redis connection control
let isConnected = false;

async function initializeConnection() {
    if (isConnected) return;

    try {
        await Promise.all([
            main(),
            redisClient.connect()
        ]);
        console.log("✅ DB Connected");
        isConnected = true;
    } catch (err) {
        console.log("❌ Connection Error:", err);
    }
}

// ✅ IMPORTANT: DB middleware BEFORE routes
app.use(async (req, res, next) => {
    await initializeConnection();
    next();
});


// ✅ Routes
app.use('/user', authRouter);
app.use('/problem', problemRouter);
app.use('/submission', submitRouter);
app.use('/ai', aiRouter);
app.use('/video', videoRouter);


// ❌ Do NOT use app.listen() here
module.exports = app;
