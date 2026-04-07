// -----------------------------------
// bot.js - bot object
// -----------------------------------

// Dependencies
const { Telegraf } = require('telegraf');
const { token } = require('../config');

const bot = new Telegraf(token);
bot.sendMessage = (...args) => bot.telegram.sendMessage(...args);
bot.editMessageText = (...args) => bot.telegram.editMessageText(...args);
bot.deleteMessage = (...args) => bot.telegram.deleteMessage(...args);
bot.answerCallbackQuery = (...args) => bot.telegram.answerCbQuery(...args);
bot.sendPhoto = (...args) => bot.telegram.sendPhoto(...args);
bot.sendInvoice = (...args) => bot.telegram.sendInvoice(...args);
bot.copyMessage = (...args) => bot.telegram.copyMessage(...args);
bot.editMessageReplyMarkup = (...args) => bot.telegram.editMessageReplyMarkup(...args);

module.exports = bot;