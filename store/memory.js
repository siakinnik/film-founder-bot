// --------------------------------------
// memory.js - memory array
// --------------------------------------

/**
 * Ai memory array
 * Format: { 
 * chatId,          // Unique Telegram Chat ID
 * memory: [],      // Array of {user, bot} messages for Gemini context
 * lastMessage,     // Timestamp of last activity (for cleaner)
 * tries,           // Current attempt count (Max: MAX_TRIES_PER_SESSION)
 * waitingForText,  // Boolean: true if bot expects user input, false if waiting for button click
 * detectedMovie    // Last parsed movie title from AI response for statistics
 * }
 */
const memory = [];

module.exports = memory;