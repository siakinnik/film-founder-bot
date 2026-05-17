// -----------------------------------
// bot.js - bot object
// -----------------------------------

// Dependencies
const { Telegraf } = require("telegraf-hardened");
const { token, telegramProxy } = require("../config");
const { FetchClient } = require('@telegraf-hardened/fetch'); // Install this separately


const params = {};
if (telegramProxy) {
  params.telegram = {
    proxy: {
      proxy: telegramProxy,
      FetchClient: FetchClient, // Injecting the client class
    },
  }
}

const bot = new Telegraf(token, params);
bot.sendMessage = (...args) => bot.telegram.sendMessage(...args);
bot.editMessageText = (...args) => bot.telegram.editMessageText(...args);
bot.deleteMessage = (...args) => bot.telegram.deleteMessage(...args);
bot.answerCallbackQuery = (...args) => bot.telegram.answerCbQuery(...args);
bot.sendPhoto = (...args) => bot.telegram.sendPhoto(...args);
bot.sendInvoice = (...args) => bot.telegram.sendInvoice(...args);
bot.copyMessage = (...args) => bot.telegram.copyMessage(...args);
bot.editMessageReplyMarkup = (...args) =>
  bot.telegram.editMessageReplyMarkup(...args);

module.exports = bot;
