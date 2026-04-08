// --------------------------------------
// findCount.js - findCount array
// --------------------------------------

/**
 * Found films and session results for analytics
 * Format: { 
 * chatId, 
 * film,            // Movie title from session.detectedMovie
 * findStatus,      // 'success' (user found it), 'canceled' (manual stop), 'unknown' (timeout)
 * timestamp        // Date of session closure
 * }
 * Cleared every 24 hours after report is sent to owner.
 */

const findCount = [];

module.exports = findCount;