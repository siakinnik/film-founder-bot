// -----------------------------------------------------------------------
// index.js - Main entry point for Filmfounder Bot
// Logic: Language-aware search, AI movie identification, and Session limits
// -----------------------------------------------------------------------

// Dependencies
const { GoogleGenAI } = require('@google/genai'); // Gemeni API library
const createConn = require('./db'); // MySQL-like sqlite wrapper
const bot = require("./utils/bot"); // Telegram bot(Telegraf bot with some node-telegram-bot-api functions)
const logger = require("./utils/Logger");

// Config
const {
    owner,
    apiKey,
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
const { escapeMarkdown } = require("./utils/escapeMarkdown");

setInterval(memoryCleaner, 60000);
setInterval(async () => {
    if (findCount.length === 0) return;
    const success = findCount.filter(f => f.findStatus === 'success').length;
    const report = `📢 *Daily report*\n\nTotal requests: ${findCount.length}\nSuccess: ${success}`;
    try {
        await bot.telegram.sendMessage(owner, report, { parse_mode: 'Markdown' });
        findCount.length = 0;
        logger.log("index.js | Daily stats cleared and sent to owner.");
    } catch (err) {
        logger.log(`index.js | Failed to send daily report: ${err.message}`, { level: 'error' });
    }
}, 24 * 60 * 60 * 1000);

// Variables
let isWaitingForSendallMessage = false;
let sendAllPending = { users: [], copyMessageId: 0, messageText: "" };

// Handlers

bot.on('message', async (ctx) => {
    if (!ctx.message || !ctx.message.text) return;
    if (ctx.message.text.startsWith('/lang')) return Lang(ctx);

    const text = ctx.message.text;
    const chatId = ctx.message.from.id;
    const isOwner = chatId === owner;

    if (isOwner && isWaitingForSendallMessage) {
        isWaitingForSendallMessage = false;
        const copyMessageId = ctx.message.message_id;
        sendAllPending = { users: sendAllPending.users, copyMessageId, messageText: "" }
        return ctx.reply(`⚠️ *Confirm Broadcast*`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ SEND", callback_data: "broadcast_yes" },
                        { text: "❌ CANCEL", callback_data: "broadcast_no" }
                    ]
                ]
            }
        });
    };
    if (!(isOwner && (text === '/stats' || text.startsWith('/ban') || text.startsWith('/unban') || text.startsWith('/sendall')))) {
        let conn
        try {
            conn = await createConn();
            let userLang;
            const [rows] = await conn.query(`SELECT * FROM users WHERE id = ?`, [chatId]);

            if (rows.length > 0 && rows[0].isBanned === 1) {
                return ctx.reply("🚫 *You are banned.*", { parse_mode: 'Markdown' });
            }

            if (rows.length === 0) {
                // console.log(`New user ${chatId}!`);
                await conn.query(`INSERT INTO users (id, lang, isBanned) VALUES (?, NULL, 0)`, [chatId]);
                return Lang(ctx);
            };

            if (!rows[0].lang) {
                return Lang(ctx);
            }
            userLang = rows[0].lang || 'en';

            const lang = userLang.startsWith('ru') ? ru : userLang.startsWith('de') ? de : en;
            const session = memory.find(m => m.chatId === chatId);

            if (session) {
                if (session.waitingForText === false) {
                    return ctx.reply(lang.session.sessionExists, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: lang.session.buttons.continue, callback_data: 'session_continue' }],
                                [{ text: lang.session.buttons.stop, callback_data: 'session_stop' }]
                            ]
                        }
                    });
                }
                session.lastMessage = Date.now();
                session.tries++;

                if (session.tries > MAX_TRIES_PER_SESSION) {
                    return ctx.reply(lang.session.limitReached, {
                        reply_markup: { inline_keyboard: [[{ text: lang.session.buttons.stop, callback_data: 'session_stop' }]] }
                    });
                }

                await ctx.sendChatAction('typing');

                let result;
                try {
                    result = await ai.models.generateContent({
                        model: model,
                        config: {
                            systemInstruction: aiInstruction
                        },
                        contents: [
                            ...session.memory.flatMap(m => [
                                { role: "user", parts: [{ text: m.user }] },
                                { role: "model", parts: [{ text: m.bot }] }
                            ]),
                            { role: "user", parts: [{ text: text }] }
                        ]
                    });
                } catch (err) {
                    if (err.message && err.message.includes('429')) {
                        logger.log(`index.js (bot.on('message.../line ${getLineNumber()}) | Daily quota exceeded: ${err.message}`, {
                            level: 'error',
                            error: err
                        });
                        return ctx.reply(lang.errors.quota_exceeded, { parse_mode: 'Markdown' });
                    };
                    if (err.message && (err.message.includes('503') || err.message.includes('overloaded'))) {
                        logger.log(`index.js (bot.on('message.../line ${getLineNumber()}) | Model overloaded: ${err.message}`, {
                            level: 'error',
                            error: err
                        });
                        return ctx.reply(lang.errors.overloaded, { parse_mode: 'Markdown' });
                    };
                    ctx.reply('An error occurred while processing your message. Please try again later.');
                    logger.log(`index.js (bot.on('message.../line ${getLineNumber()}) | Unknown Error ${err.message}`, {
                        level: 'error',
                        error: err
                    });
                }

                const response = result.candidates[0]?.content?.parts[0]?.text || "";

                const rawAiResponse = escapeMarkdown(response);

                const titleMatch = rawAiResponse.match(/Title:\s*(.*?)\s*\|/i);
                const confidenceMatch = rawAiResponse.match(/Confidence:\s*(\d+)%/i);
                const descriptionMatch = rawAiResponse.match(/Description:\s*([\s\S]*)/i);

                const movieTitle = titleMatch ? titleMatch[1] : "Unknown";
                const confidence = confidenceMatch ? confidenceMatch[1] : "0";
                const finalText = descriptionMatch ? descriptionMatch[1] : rawAiResponse;

                if (!session.detectedMovie || session.detectedMovie === "Unknown") {
                    session.detectedMovie = movieTitle;
                }

                session.memory.push({ user: text, bot: rawAiResponse });
                session.waitingForText = false;

                return await ctx.reply(`*${movieTitle}\n\n${finalText}*\n\n*${lang.session.confidence}: ${confidence}%*`, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: lang.session.buttons.found, callback_data: 'session_stop_success' }],
                            [{ text: lang.session.buttons.continue, callback_data: 'session_continue' }],
                            [{ text: lang.session.buttons.stop, callback_data: 'session_stop' }]
                        ]
                    }
                });
            }

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
    } else {
        if (text === '/stats') {
            if (findCount.length === 0) {
                return ctx.reply("📊 *Stats empty*", { parse_mode: 'Markdown' });
            }
            const total = findCount.length;
            const success = findCount.filter(f => f.findStatus === 'success').length;
            const canceled = findCount.filter(f => f.findStatus === 'canceled').length;
            const unknown = findCount.filter(f => f.findStatus === 'unknown').length;

            let report = `📊 *24 hours stats:*\n\n`;
            report += `Total sessions: ${total}\n`;
            report += `✅ Success: ${success}\n`;
            report += `❌ Canceled: ${canceled}\n`;
            report += `⏳ Timeout: ${unknown}\n\n`;

            report += `🎬 *Last films:* \n`;
            findCount.slice(-5).forEach(f => {
                report += `- ${escapeMarkdown(f.film)} (${f.findStatus})\n`;
            });

            await ctx.reply(report, { parse_mode: 'Markdown' });
        } else if (text.startsWith('/ban')) {
            const parts = text.split(' ');
            if (parts.length < 2) return ctx.reply("Usage: /ban <chatId>");

            const targetId = parts[1];
            let conn;
            try {
                conn = await createConn();
                await conn.query(`UPDATE users SET isBanned = ? WHERE id = ?`, [1, targetId]);
                return ctx.reply(`User ${targetId} banned.`);
            } catch (e) {
                logger.log(`index.js (line ${getLineNumber()}) | Error updating user status: ${e.message}`, {
                    level: 'error',
                    error: e
                });
                return ctx.reply("Error updating user status.");
            } finally {
                if (conn) conn.close();
            };
        } else if (text.startsWith('/unban')) {
            const parts = text.split(' ');
            if (parts.length < 2) return ctx.reply("Usage: /unban <chatId>");

            const targetId = parts[1];
            let conn;
            try {
                conn = await createConn();
                await conn.query(`UPDATE users SET isBanned = ? WHERE id = ?`, [0, targetId]);
                return ctx.reply(`User ${targetId} unbanned.`);
            } catch (e) {
                logger.log(`index.js (line ${getLineNumber()}) | Error updating user status: ${e.message}`, {
                    level: 'error',
                    error: e
                });
                return ctx.reply("Error updating user status.");
            } finally {
                if (conn) conn.close();
            };
        } else if (text.startsWith('/sendall')) {
            const parts = text.split(' ');
            // if (parts.length < 2) return ctx.reply("Usage: /unban <chatId>");

            const targetId = parts[1];
            let conn;
            try {
                conn = await createConn();
                const [rows] = await conn.query(`SELECT id FROM users WHERE isBanned = ?`, [0]);
                const users = [];
                rows.forEach((user) => {
                    if (!isNaN(+user.id)) users.push(+user.id);
                });

                if (parts.length >= 2) {
                    const messageText = parts.slice(1).join(' ');

                    sendAllPending = { users, copyMessageId: 0, messageText }
                    ctx.reply(`⚠️ *Confirm Broadcast*:\n\n"${messageText}"`, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ SEND", callback_data: "broadcast_yes" },
                                    { text: "❌ CANCEL", callback_data: "broadcast_no" }
                                ]
                            ]
                        }
                    });
                } else {
                    sendAllPending = { users, copyMessageId: 0, messageText: "" }
                    ctx.reply("*Message to send all users*", {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "❌ CANCEL", callback_data: "broadcast_no" }
                                ]
                            ]
                        }
                    })
                    isWaitingForSendallMessage = true;
                };
            }
            catch (err) {
                logger.log(`index.js (line ${getLineNumber()}) | Error sending messages to users(part 1): ${err.message}`, {
                    level: 'error',
                    error: err
                });
                return ctx.reply("Error sending messages to users(part 1)");
            }
            finally {
                if (conn) conn.close();
            }
        };
    };
});

bot.action('menu', async (ctx) => {
    let conn;
    try {
        const chatId = ctx.callbackQuery.message.chat.id;
        conn = await createConn();
        const [rows] = await conn.query(`SELECT lang FROM users WHERE id = ?`, [chatId]);
        const userLang = (rows.length > 0 && rows[0].lang) ? rows[0].lang : '';
        if (!userLang) {
            return Lang(ctx)
        };
        const lang = userLang.startsWith('ru') ? ru : userLang.startsWith('de') ? de : en;
        await menu(lang, chatId, ctx.callbackQuery.message);
        await ctx.answerCbQuery();
    } catch (err) {
        logger.log(`index.js (menu action/line ${getLineNumber()}) | DB/Menu Error: ${err.message}`, {
            level: 'error',
            error: err
        });
        await ctx.answerCbQuery('Error loading menu');
    } finally {
        if (conn) {
            await conn.close();
        }
    };
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

        if (rows.length > 0 && rows[0].isBanned === 1) {
            return ctx.reply("🚫 *You are banned.*", { parse_mode: 'Markdown' });
        }

        if (rows.length === 0) {
            await conn.query(`INSERT INTO users (id, lang, isBanned) VALUES (?, NULL, 0)`, [chatId]);
            return Lang(ctx);
        };

        if (!rows[0].lang) {
            return Lang(ctx);
        }

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
            tries: 0,
            waitingForText: true,
            detectedMovie: null
        });

        await ctx.editMessageText(lang.session.startPrompt, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: lang.session.buttons.stop, callback_data: 'session_stop' }]]
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
        const [rows] = await connection.query(`SELECT find_count, lang FROM users WHERE id = ?`, [chatId]);

        const userLang = rows.length > 0 ? rows[0].lang : 'en';
        const lang = userLang.startsWith('ru') ? ru : userLang.startsWith('de') ? de : en;

        const memIndex = memory.findIndex(m => m.chatId === chatId);

        if (memIndex !== -1) {
            await connection.query(`UPDATE users SET find_count = find_count + 1, find_count_set = CURRENT_TIMESTAMP WHERE id = ?`, [chatId]);
            const session = memory[memIndex];
            findCount.push({
                chatId,
                film: session.detectedMovie || 'not_found',
                findStatus: 'canceled',
                timestamp: new Date()
            });
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
bot.action('session_continue', async (ctx) => {
    const chatId = ctx.callbackQuery.message.chat.id;
    const session = memory.find(m => m.chatId === chatId);
    if (session) {
        session.waitingForText = true;
        await ctx.editMessageReplyMarkup();
        const userLang = ctx.callbackQuery.from.language_code || 'en';
        const lang = userLang.startsWith('ru') ? ru : userLang.startsWith('de') ? de : en;
        await ctx.reply(lang.session.continuePrompt, { parse_mode: "Markdown" });
    }
    await ctx.answerCbQuery();
});

bot.action('session_stop_success', async (ctx) => {
    let connection;
    try {
        const chatId = ctx.callbackQuery.message.chat.id;
        const memIndex = memory.findIndex(m => m.chatId === chatId);

        if (memIndex === -1) return ctx.answerCbQuery();

        const session = memory[memIndex];
        connection = await createConn();

        const [rows] = await connection.query(`SELECT lang FROM users WHERE id = ?`, [chatId]);

        const lang = rows[0]?.lang?.startsWith('ru') ? ru : rows[0]?.lang?.startsWith('de') ? de : en;

        findCount.push({
            chatId,
            film: session.detectedMovie || 'unknown',
            findStatus: 'success',
            timestamp: new Date()
        });

        await connection.query(`UPDATE users SET find_count = find_count + 1, find_count_set = CURRENT_TIMESTAMP WHERE id = ?`, [chatId]);
        memory.splice(memIndex, 1);
        await ctx.reply(`🎉 ${lang.session.sessionStoped}`, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [menuButton(lang)] }
        });
    } catch (err) {
        logger.log(`index.js (stop_success) | ${err.message}`, { level: 'error' });
    } finally {
        if (connection) await connection.close();
        await ctx.answerCbQuery();
    }
});

bot.action('donation', async (ctx) => {
    let conn;
    try {
        const chatId = ctx.callbackQuery.message.chat.id;
        conn = await createConn();
        const [rows] = await conn.query(`SELECT lang FROM users WHERE id = ?`, [chatId]);
        const userLang = (rows.length > 0 && rows[0].lang) ? rows[0].lang : '';
        if (!userLang) {
            return Lang(ctx)
        };
        const lang = userLang.startsWith('ru') ? ru : userLang.startsWith('de') ? de : en;
        await ctx.reply(lang.menu.donate_text, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [[{ text: "⭐ GitHub", url: "https://github.com/siakinnik/film-founder-bot" }], menuButton(lang)]
            }
        });
        await ctx.answerCbQuery();
    } catch (err) {
        logger.log(`index.js (menu action/line ${getLineNumber()}) | DB/Menu Error: ${err.message}`, {
            level: 'error',
            error: err
        });
        await ctx.answerCbQuery('Error loading menu');
    } finally {
        if (conn) {
            await conn.close();
        }
    };
});

bot.action('broadcast_yes', async (ctx) => {
    const userId = ctx.from.id;
    const isOwner = userId === owner;

    if (!isOwner) return;

    const { users, copyMessageId, messageText } = sendAllPending;
    const isCopy = copyMessageId !== 0;
    if (!isCopy && !messageText) return ctx.answerCbQuery("Nothing to send.");

    try {
        if (!isCopy) {
            for (const user of users) {
                await bot.sendMessage(user, messageText).catch((e) => {
                    if (e.message.includes("bot was blocked by the user")) {
                        logger.log(`index.js (line ${getLineNumber()}) | User ${user} blocked the bot. Skipping.`, { level: 'warn' });
                    } else {
                        logger.log(`index.js (line ${getLineNumber()}) | Error sending message to user: ${e.message}`, { level: 'error', error: e });
                    };
                });
            };
        } else {
            for (const user of users) {
                await bot.copyMessage(user, owner, copyMessageId).catch((e) => {
                    if (e.message.includes("bot was blocked by the user")) {
                        logger.log(`index.js (line ${getLineNumber()}) | User ${user} blocked the bot. Skipping.`, { level: 'warn' });
                    } else {
                        logger.log(`index.js (line ${getLineNumber()}) | Error copying message to user: ${e.message}`, { level: 'error', error: e });
                    };
                });
            };
        };
    } catch (err) {
        logger.log(`index.js (line ${getLineNumber()}) | Error sending message to users(part 2): ${err.message}`, { level: 'error', error: err });
        return ctx.reply("Error sending messages to users(part 2)");
    } finally {
        ctx.editMessageText("✅*Sent!*", { parse_mode: "Markdown" })
        ctx.answerCbQuery("✅Sent!");
    };
});

bot.action('broadcast_no', async (ctx) => {
    const userId = ctx.from.id;
    const isOwner = userId === owner;

    if (!isOwner) return;

    try {
        isWaitingForSendallMessage = false;
        sendAllPending = { users: [], copyMessageId: 0, messageText: "" };
    } catch (err) {
        logger.log(`index.js (line ${getLineNumber()}) | Unknown error: ${err.message}`, { level: 'error', error: err });
        return ctx.reply("❌Unknown error");
    } finally {
        ctx.editMessageText("❌*Cancelled!*", { parse_mode: "Markdown" })
        ctx.answerCbQuery("❌Cancelled!");
    };
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