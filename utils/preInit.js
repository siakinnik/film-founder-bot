// ---------------------------------
// preInit.js - preInit function
// ---------------------------------

// Dependencies
const createConn = require('../db'); // MySQL-like sqlite wrapper
const logger = require('./Logger'); // Telegram bot(Telegraf bot with some node-telegram-bot-api functions)
const { getLineNumber } = require("./getLineNumber");
const fs = require('fs');
const path = require('path');

// Main function
const preInit = async () => {
    try {
        const conn = await createConn();
        const schemaPath = path.join(__dirname, '../schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await conn.query(sql);
        await conn.close();
    } catch (err) {
        console.error(err);
        logger.log(`preInit.js (line ${getLineNumber()}) | Unknown Error ${err.message}`, {
            level: 'error',
            error: err
        });
    }
};

module.exports = {
    preInit
};