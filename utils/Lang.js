// ------------------------
// Lang.js - Lang function
// ------------------------

const en = require('../en.json'); // English language package
const { menuButton } = require("./menuButton");
// main function
const Lang = async (ctx) => {
    ctx.reply(`Select a language:`, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🇷🇺RU', callback_data: 'RU' },
                    { text: '🇩🇪DE', callback_data: 'DE' },
                    { text: '🇬🇧EN', callback_data: 'EN' },
                ],
                menuButton(en)
            ]
        }
    });
};

module.exports = {
    Lang
};