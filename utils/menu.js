// ------------------------
// menu.js - menu function
// ------------------------

// Dependencies
const bot = require('./bot'); // Telegram bot(Telegraf bot with some node-telegram-bot-api functions)

// main function
const menu = async (lang, chatId, msg) => {
    const params = { chat_id: chatId, message_id: msg.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: `${lang.menu.buttons.search}`, callback_data: 'session_start' }], [{ text: `${lang.menu.buttons.language}`, callback_data: 'lang' }, { text: `${lang.menu.buttons.donate}`, callback_data: 'donation' }]] } };
    bot.sendMessage(chatId, `${lang.menu.welcome.replace('{{firstName}}', msg.chat.first_name)}`, params);
};

module.exports = {
    menu
};