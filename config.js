// ------------------------------
// config.js - all settings
// ------------------------------

// Dependencies
require("dotenv").config();

const config = {
    // Telegram Bot Settings
    token: process.env.BOT_TOKEN, // Telegram bot token
    owner: +process.env.OWNER, // Owner's telegram chat id (number)
    logChannel: +process.env.LOGCN, // Channel for errors & other logs
    dbPath: process.env.DB_PATH || './movies.db', // Path to database

    // Network Proxy (for telegraf-hardened)
    telegramProxy: process.env.TELEGRAM_PROXY || null,

    // Anti-abuse & Session Limits
    MAX_MEMORY_AGE: 10 * 60 * 1000, // 10 minutes
    MAX_SESSIONS_PER_DAY: 4, // 4 sessions per day
    MAX_TRIES_PER_SESSION: 3, // 3 tries per session

    // AI Engine Architecture (Unified for Gemini / OpenAI-like proxies)
    aiType: process.env.AI_TYPE || 'gemini', // 'gemini' or 'openaiLike' (for c5y.moe)
    apiKey: process.env.API_KEY, // API Key for selected provider
    baseURL: process.env.AI_BASE_URL || null, // Custom endpoint for reverse proxies
    model: process.env.AI_MODEL || "gemini-2.5-flash-lite", // AI model name
    // aiStreaming: false, // Streaming toggle if needed later

    // AI System Instruction (Strict Filmfounder Engine)
    aiInstruction: `
You are a specialized Movie Discovery Engine. Your internal logic is strictly limited.

STRICT RULES:
1. NEVER engage in conversation. NEVER explain what a "matrix" is in math or biology.
2. If the user input is a movie title or description, identify it.
3. If the user input is too broad (like just one word "Matrix"), set Title: Unknown, Confidence: 0% and ask for movie-related details in the Description.
4. If you are 100% sure, provide the title. If not, provide the most likely candidate.

STRICT OUTPUT FORMAT (MANDATORY):
Title: [Movie Name or Unknown] | Confidence: [0-100]% | Description: [Your brief movie analysis or request for more details]

LANGUAGE RULE:
Always respond in the language used by the user.

FORMATTING RULE:
Use ONLY plain text in the Description. No bold, no italics, no markdown symbols.
`
};

// Strict Validation Layer (Everything here is mandatory for the bot to function)
const requiredFields = ['token', 'owner', 'logChannel', 'apiKey'];

const missing = requiredFields.filter(field => !config[field]);

if (missing.length > 0) {
    console.error("\x1b[31m%s\x1b[0m", "===============================================");
    console.error("\x1b[31m%s\x1b[0m", "   CRITICAL ERROR: MISSING PARAMETERS          ");
    console.error("\x1b[31m%s\x1b[0m", "===============================================");
    console.error("Missing architecture fields:", missing.join(", "));
    console.error("Please check your .env file. The bot cannot start without these.");
    process.exit(1);
}

module.exports = config;