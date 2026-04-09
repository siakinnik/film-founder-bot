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
const MAX_SESSIONS_PER_DAY = 4; // 2 sessions per day
const MAX_TRIES_PER_SESSION = 3; // 3 tries per session

// AI settings 
const model = "gemini-2.5-flash-lite"; // Gemeni API model

// AI system instruction
const aiInstruction = `
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
`;

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