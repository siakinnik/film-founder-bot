// ------------------------------
// config.js - all settings
// ------------------------------

// Dependencies
// env config
require("dotenv").config();

const token = process.env.BOT_TOKEN; // Telegram bot toke
const owner = +process.env.OWNER; // Owner's telegram chat id(not username)
const logChannel = +process.env.LOGCN; // Channel for errors & other logs
const dbPath = process.env.DB_PATH; // Path to database
const apiKey = process.env.API_KEY; // Gemeni api key

const MAX_MEMORY_AGE = 10 * 60 * 1000; // 10 minutes
const MAX_SESSIONS_PER_DAY = 2; // 2 sessions per day
const MAX_TRIES_PER_SESSION = 3; // 3 tries per session

// AI settings 
const model = "gemini-2.5-flash-lite"; // Gemeni API model
// AI system instruction strict mode, no offtop
const aiInstruction = '';

module.exports = {
    token,
    owner,
    logChannel,
    dbPath,
    apiKey,
    MAX_MEMORY_AGE,
    MAX_SESSIONS_PER_DAY,
    MAX_TRIES_PER_SESSION,
    model,
    aiInstruction
};