// -----------------------------
// menuBotton.js - menuButton function
// -----------------------------

// main function
const menuButton = (lang) => [{ text: `${lang.menu.buttons.text}`, callback_data: 'menu' }];

module.exports = {
    menuButton
};