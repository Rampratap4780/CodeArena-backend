const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const main = require("../src/config/db");
const redisClient = require("../src/config/redis");

const authRouter = require("../src/routes/userAuth");
const problemRouter = require("../src/routes/problemCreator");
const submitRouter = require("../src/routes/submit");
const aiRouter = require("../src/routes/aiChatting");
const videoRouter = require("../src/routes/videoCreator");

const app = express();

/* ===========================
   ✅ MIDDLEWARE
=========================== */

app.use(express.json());
app.use(cookieParser());

/* ===========================
   ✅ CORS (LOCAL + PRODUCTION SAFE)
=========================== */

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL, // production frontend url
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Preflight fix
app.options("*", cors());

/* ===========================
   ✅ DB + REDIS CONNECTION (ONLY ONCE)
=========================== */

let isConnected = false;

async function initializeConnection() {
  if (isConnected) return;

  try {
    await Promise.all([main(), redisClient.connect()]);
    console.log("DB & Redis Connected");
    isConnected = true;
  } catch (err) {
    console.error("Connection Error:", err);
  }
}

// DB middleware
app.use(async (req, res, next) => {
  await initializeConnection();
  next();
});

/* ===========================
   ✅ ROUTES
=========================== */

app.use("/user", authRouter);
app.use("/problem", problemRouter);
app.use("/submission", submitRouter);
app.use("/ai", aiRouter);
app.use("/video", videoRouter);

app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

/* ===========================
   ❌ DO NOT USE app.listen() (Vercel)
=========================== */

module.exports = app;