// -------------------------------
// index.js - main file in Filmfounder Telegram bot by siakinnik
// -------------------------------

// Dependencies
const { GoogleGenAI } = require('@google/genai'); // Gemeni API library
const createConn = require('./db'); // MySQL-like sqlite wrapper
const bot = require("./utils/bot"); // Telegram bot(Telegraf bot with some node-telegram-bot-api functions)
const logger = require("./utils/Logger");

// Config
const {
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
} = require('./config');

// Language packs
const ru = require('./ru.json');
const en = require('./en.json');
const de = require('./de.json');

const memory = require("./store/memory");
const findCount = require("./store/findCount");

// Init
const ai = new GoogleGenAI({ apiKey: `${apiKey}` });
// console.log(ai)

// Constants & helper functions
const { menuButton } = require("./utils/menuButton");
const { Lang } = require("./utils/Lang");
const { menu } = require("./utils/menu");
const { preInit } = require("./utils/preInit");
const { getLineNumber } = require("./utils/getLineNumber");
const { memoryCleaner } = require("./utils/memoryCleaner");

setInterval(memoryCleaner, 60000);

// Handlers

bot.on('message', async (ctx) => {
    if (!ctx.message || !ctx.message.text) return;
    if (ctx.message.text.startsWith('/lang')) return Lang(ctx);

    let conn
    try {
        const chatId = ctx.message.chat.id;
        conn = await createConn();
        let userLang;
        const [rows] = await conn.query(`SELECT * FROM users WHERE id = ?`, [chatId]);

        if (rows.length === 0) {
            userLang = ctx.message.from.language_code || 'en';
            await conn.query(`INSERT INTO users (id, lang) VALUES (?, ?)`, [chatId, ctx.message.from.language_code || 'en']);
        } else {
            userLang = rows[0].lang || 'en';
        }

        const lang      = userLang.startsWith('ru') ? ru : userLang.startsWith('de') ? de : en;

        if (memory.find(m => m.chatId === ctx.message.chat.id)) return ctx.reply(lang.session.sessionExists, {
            parse_mode: 'Markdown', reply_markup: {
                inline_keyboard: [[
                    { text: `${lang.session.buttons.sessionStop}`, callback_data: 'session_stop' }
                ]]
            }
        });

        await menu(lang, chatId, ctx.message);
    } catch (err) {
        ctx.reply('An error occurred while processing your message. Please try again later.');
        logger.log(`index.js (bot.on('message.../line ${getLineNumber()}) | Unknown Error ${err.message}`, {
            level: 'error',
            error: err
        });
    } finally {
        if (conn) {
            conn.close();
        };
    };
});

bot.action('menu', async (ctx) => {
    try {
        const chatId = ctx.callbackQuery.message.chat.id;
        const userLang = ctx.callbackQuery.from.language_code || 'en';
        const lang = userLang.startsWith('ru') ? ru : userLang.startsWith('de') ? de : en;
        await menu(lang, chatId, ctx.callbackQuery.message);
    } catch (err) {
        logger.log(`index.js (menu action/line ${getLineNumber()}) | Unknown Error ${err.message}`, {
            level: 'error',
            error: err
        });
    }
});

bot.action('lang', async (ctx) => {
    try {
        await Lang(ctx);
    } catch (err) {
        logger.log(`index.js (lang action/line ${getLineNumber()}) | Unknown Error ${err.message}`, {
            level: 'error',
            error: err
        });
    }
});

bot.action('RU', async (ctx) => {
    let conn
    try {
        const chatId = ctx.callbackQuery.message.chat.id;
        conn = await createConn();
        await conn.query(`UPDATE users SET lang = ? WHERE id = ?`, ['ru', chatId]);
        await menu(ru, chatId, ctx.callbackQuery.message);
    } catch (err) {
        logger.log(`index.js (RU action/line ${getLineNumber()}) | Unknown Error ${err.message}`, {
            level: 'error',
            error: err
        });
    } finally {
        if (conn) {
            conn.close();
        }
        await ctx.answerCbQuery();
    };
});

bot.action('DE', async (ctx) => {
    let conn;
    try {
        const chatId = ctx.callbackQuery.message.chat.id;
        conn = await createConn();
        await conn.query(`UPDATE users SET lang = ? WHERE id = ?`, ['de', chatId]);
        await menu(de, chatId, ctx.callbackQuery.message);
    } catch (err) {
        logger.log(`index.js (DE action/line ${getLineNumber()}) | Unknown Error ${err.message}`, {
            level: 'error',
            error: err
        });
    } finally {
        if (conn) {
            conn.close();
        }
        await ctx.answerCbQuery();
    };
});

bot.action('EN', async (ctx) => {
    let conn;
    try {
        const chatId = ctx.callbackQuery.message.chat.id;
        conn = await createConn();
        await conn.query(`UPDATE users SET lang = ? WHERE id = ?`, ['en', chatId]);
        await menu(en, chatId, ctx.callbackQuery.message);
    } catch (err) {
        logger.log(`index.js (EN action/line ${getLineNumber()}) | Unknown Error ${err.message}`, {
            level: 'error',
            error: err
        });
    } finally {
        if (conn) {
            conn.close();
        }
        await ctx.answerCbQuery();
    };
});

bot.action('session_start', async (ctx) => {
    let conn;
    try {
        const chatId = ctx.callbackQuery.message.chat.id;

        conn = await createConn();
        const [rows] = await conn.query(`SELECT * FROM users WHERE id = ?`, [chatId]);
        const userLang = rows[0]?.lang || 'en';
        const lang = userLang.startsWith('ru') ? ru : userLang.startsWith('de') ? de : en;

        if (memory.find(m => m.chatId === chatId)) {
            return ctx.answerCbQuery(lang.session.sessionExists, { show_alert: true });
        }

        const lastUpdate = new Date(rows[0].find_count_set);
        const isToday = lastUpdate.toDateString() === new Date().toDateString();

        if (isToday && rows[0].find_count >= MAX_SESSIONS_PER_DAY) {
            return ctx.answerCbQuery(lang.session.limitDayReached, { show_alert: true });
        }

        memory.push({
            chatId: chatId,
            memory: [],
            lastMessage: Date.now(),
            tries: 0
        });

        await ctx.editMessageText(lang.session.startPrompt, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: lang.session.buttons.sessionStop, callback_data: 'session_stop' }]]
            }
        });

    } catch (err) {
        logger.log(`index.js (session_start) | Error: ${err.message}`, { level: 'error' });
    } finally {
        if (conn) await conn.close();
        await ctx.answerCbQuery();
    };
});

bot.action('session_stop', async (ctx) => {
    let connection;
    try {
        const chatId = ctx.callbackQuery.message.chat.id;
        connection = await createConn();
        const [rows] = await connection.query(`SELECT find_count FROM users WHERE id = ?`, [chatId]);
        const userLang = rows.length > 0 ? rows[0].lang : 'en';
        const lang = userLang.startsWith('ru') ? ru : userLang.startsWith('de') ? de : en;

        const memIndex = memory.findIndex(m => m.chatId === chatId);

        await connection.query(`UPDATE users SET find_count = find_count + 1, find_count_set = CURRENT_TIMESTAMP WHERE id = ?`, [chatId]);
        findCount.push({ chatId, film: memory[memIndex]?.memory[0] || 'unknown', findStatus: memory[memIndex] ? 'success' : 'unknown' });
        if (memIndex !== -1) {
            memory.splice(memIndex, 1);
            ctx.reply(lang.session.sessionStoped, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [menuButton(lang)] } });
        } else {
            ctx.reply(lang.session.noActiveSession, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [menuButton(lang)] } });
        }
    } catch (err) {
        logger.log(`index.js (settion_stop/line ${getLineNumber()}) | Unknown Error ${err.message}`, {
            level: 'error',
            error: err
        });
    } finally {
        if (connection) {
            await connection.close();
        };
        await ctx.answerCbQuery()
    }
});

// Start bot
(async () => {
    await logger.startup();
    await preInit();
    bot.launch().then(() => {
        logger.log(`index.js | Bot running.`, {
            level: 'info'
        });
    }).catch((err) => {
        logger.log(`index.js (bot start/line ${getLineNumber()}) | Unknown Error ${err.message}`, {
            level: 'error',
            error: err
        });
    });
})();

// Error handling
process.on('uncaughtException', err => {
    logger.log(`index.js (uncaughtException/line ${getLineNumber()}) | UncaughtException: ${err.message}`, {
        level: 'error',
        error: err
    });
});

process.on('unhandledRejection', err => {
    logger.log(`index.js (unhandledRejection/line ${getLineNumber()}) |UnhandledRejection: ${err.message}`, {
        level: 'error',
        error: err
    });
});