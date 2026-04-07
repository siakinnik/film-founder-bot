// -----------------------------------
// memoryCleaner.js - memoryCleaner function
// -----------------------------------

// Dependencies
const memory = require("../store/memory");
const logger = require("./Logger");
const { MAX_MEMORY_AGE } = require("../config");
const { getLineNumber } = require("./getLineNumber");

// Main function
const memoryCleaner = () => {
    const now = Date.now();
    for (let i = memory.length - 1; i >= 0; i--) {
        if (now - memory[i].lastMessage > MAX_MEMORY_AGE) {
            const chatId = memory[i].chatId;
            memory.splice(i, 1);
            logger.log(`memoryCleaner.js(line ${getLineNumber()}) | Session expired for ${chatId}`, { level: 'info' });
        }
    }
}

module.exports = { memoryCleaner };