// --------------------------------------
// memory.js - memory array
// --------------------------------------

// Ai memory
// Format: { chatId, memory, lastMessage}
// If last message is older than 10 minutes, 
// memory will be cleared and session be added to finalCount.
// Max session tries is 3, then user will be asked if film was found or not,
// if user do not answer in 10 minutes, session will be added to finalCount with 'unknown' status.
// After every sesson, the count of sessions will be added to DB
// Normally, the count of sessions for users should not be more than 2 per day,
// to avoid abuse and make an api usage lower.
const memory = [];

module.exports = memory;