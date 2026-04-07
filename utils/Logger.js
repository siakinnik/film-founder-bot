// ------------------------------------------
// Logger.js - Logger module by siakinnik 
// ------------------------------------------

/**
 * Logger module by siakinnik
 * NOT RELEASE VERSION, PLEASE
 * IF YOU WANT TO USE IT IN YOUR PROJECT
 * WAIT FOR PUBLIC REPOSITORY RELEASE
 * Features:
 * - multi-level logging
 * - file output with rotation
 * - console colors
 * - Telegram/Slack integration
 */

// Dependencies 

// Node.js built-in
const fs = require('fs');
const path = require('path');
const { errChannel } = require('../config');
const bot = require('./bot');

// External packages
// if telegram.enabled is true - npm i telegraf

// End - Dependencies

// Colors for console
const COLORS = {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    reset: "\x1b[0m"
};

// Main class
class Logger {
    constructor(options = {}) {
        this.startupCalled = false; // is startup function called
        this.levels = options.levels || ['debug', 'info', 'warn', 'error', 'critical']; // debugger levels
        // Default level is used when log has no level in meta or this level is not in this.levels
        this.defaultLevel = options.defaultLevel || 'info';

        // log files settings(is enabled, file paths)
        this.files = {
            enabled: options.files?.enabled ?? true,
            levelFiles: options.files?.levelFiles || {
                debug: './logs/debug.log',
                info: './logs/info.log',
                warn: './logs/warn.log',
                error: './logs/error.log',
                critical: './logs/critical.log',
                other: './logs/other.log'
            },
            rotate: {
                enabled: options.files?.rotate?.enabled ?? true,
                maxSize: options.files?.rotate?.maxSize || '10MB',
                method: options.files?.rotate?.method || 'deleteFromTop', // also can be 'renameAndCreate' or 'archiveAndCreate'
                // maxFiles: options.files?.rotate?.maxFiles || 5
            }
        };

        // console sttings(colors, is enabled, etc...)
        this.console = {
            enabled: options.console?.enabled ?? true,
            colors: options.console?.colors ?? true,
            levelColors: options.console?.levelColors || {
                debug: 'blue',
                info: 'green',
                warn: 'yellow',
                error: 'red',
                critical: 'magenta'
            }
        };

        // Telegram
        this.telegram = {
            enabled: options.telegram?.enabled ?? false,
            botToken: options.telegram?.botToken || '',
            // levelChats: options.telegram?.levelChats || {},
            owners: options.telegram?.owners || [],
            hashtags: options.telegram?.hashtags ?? false  // Add hashtag of the log level at the end of the log
        };

        // siakinnik - TODO
        // Slack
        // this.slack = {
        //   enabled: options.slack?.enabled ?? false,
        //   botToken: options.slack?.botToken || '',
        //   levelChannels: options.slack?.levelChannels || {},
        //   owners: options.slack?.owners || []
        // };

        // foramting settings
        this.format = {
            timestamp: options.format?.timestamp ?? true,
            order: options.format?.order || ['timestamp', 'level', 'msg', 'meta'],
            json: options.format?.json ?? true,
            jsonConsole: options.format?.json ?? false,
            jsonLogFile: options.format?.json ?? true,
            jsonTelegram: options.format?.json ?? false,
            jsonSlack: options.format?.json ?? false,
            pretty: options.format?.pretty ?? false
        };
        if (this.telegram.enabled) {
            const { Telegraf } = require("telegraf");
            try {
                // this.bot = new Telegraf(this.telegram.botToken);
                this.constructorLogs = this.constructorLogs || [];
                // siakinnik - deleted, additional check on startup added
                // this.constructorLogs.push(['Telegram bot started successfuly up', { level: 'info' }]);
            } catch (err) {
                this.telegram.enabled = false;
                this.constructorLogs = this.constructorLogs || [];
                this.constructorLogs.push(['LOGGER SETUP | Unknown error', { level: 'error', error: err }]);
            };
        }
    };

    // Startup function
    // Telegram bot token checker + sending logs from constructor
    // To be called on project init(if not - will be automaticly called on first log)
    async startup() {
        if (this.startupCalled) return;
        this.startupCalled = true;
        // if (this.telegram.enabled && this.bot) {
        try {
            // await bot.telegram.getMe();
            this.log('LOGGER SETUP | Telegram bot connected!', { level: 'info' });
        } catch (err) {
            this.telegram.enabled = false;
            this.log('LOGGER SETUP | Invalid Telegram token - telegram logging turned off.', {
                level: 'error',
                error: err
            });
            // }
        };

        if (this.constructorLogs) {
            this.constructorLogs.forEach(e => this.log(...e));
        };
    }

    /**
     * Formats log message into string representation.
     * Supports conditional JSON embedding depending on output target.
     *
     * @param {string} msg - Main log message
     * @param {object} meta - Additional metadata (level, error, etc.)
     * @param {string} formatFor - Target output (console | file | telegram | slack)
     * @returns {string}
     */
    formatMessage(msg, meta = {}, formatFor) {
        const parts = {};
        // Timestamp
        if (this.format.timestamp) parts.timestamp = new Date().toISOString();
        parts.msg = msg;

        // meta
        if (meta && Object.keys(meta).length > 0 && this.format.json && !meta.noJson) {
            if (
                (formatFor == 'console' && this.format.jsonConsole) ||
                (formatFor == 'file' && this.format.jsonLogFile) ||
                (formatFor == 'telegram' && this.format.jsonTelegram) ||
                (formatFor == 'slack' && this.format.jsonSlack)
            ) {
                parts.meta = meta;
            };
        }

        const level = meta.level || this.defaultLevel;
        const levelPart = `| ${level.toUpperCase()}`;

        const orderedParts = this.format.order
            .filter(key => key !== 'level')
            .map(key => {
                if (parts[key] !== undefined) {
                    if (typeof parts[key] === 'object') return JSON.stringify(parts[key]);
                    return parts[key];
                }
                return null;
            })
            .filter(Boolean);

        const hashtagPart = formatFor == 'telegram' && this.telegram.hashtags ? `\n#${level}` : '';
        const str = [levelPart, ...orderedParts].join(' | ') + hashtagPart;

        // If JSON is on - add it to string
        if (this.format.json && !meta.noJson) {
            if (
                (formatFor == 'console' && this.format.jsonConsole) ||
                (formatFor == 'file' && this.format.jsonLogFile) ||
                (formatFor == 'telegram' && this.format.jsonTelegram) ||
                (formatFor == 'slack' && this.format.jsonSlack)
            ) {
                return str + '\nJSON:\n' + (this.format.pretty
                    ? JSON.stringify(parts, null, 2)
                    : JSON.stringify(parts)) + '\n\n';
            };
            return str;
        } else {
            return str;
        }
    }

    // helper-function - writer function - writes message in correct file depending on level
    writeToFile(level, message) {
        if (!this.files.enabled) return;
        const filePath =
            this.files.levelFiles[level] ?
                this.files.levelFiles[level] :
                this.files.levelFiles.other ?
                    this.files.levelFiles.other :
                    '';
        if (!filePath) return;
        const fullPath = path.resolve(filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.appendFileSync(fullPath, message);
    }

    // Main log function 
    // params - ('strings', 'strings'......, {object}}
    async log(...params) {
        // Making sure startup function was called before
        if (!this.startupCalled) {
            await this.startup();
        };
        const logParams = typeof params[params.length - 1] === 'object' && !Array.isArray(params[params.length - 1])
            ? params.pop()
            : {};

        const level = logParams.level || this.defaultLevel;
        logParams.level = level;
        const message = params.join(' ');

        // Console output if enabled
        if (this.console.enabled) {
            // color text if enabled
            const formatted = this.formatMessage(message, logParams, 'console');
            if (this.console.colors && this.console.levelColors[level]) {
                const colorCode = COLORS[this.console.levelColors[level]] || COLORS.reset;
                console.log(colorCode + formatted + COLORS.reset);
            } else {
                console.log(formatted);
            }
        };

        // Telegram output if enabled
        if (this.telegram.enabled) {
            const formatted = this.formatMessage(message, logParams, 'telegram');
            await bot.sendMessage(errChannel, formatted);
        }
        // Writing to file
        const formatted = this.formatMessage(message, logParams, 'file');
        this.writeToFile(level, formatted);
    }
};

// If you need it to be initialized inside your project file
// module.exports = {
//     Logger
// }

module.exports = new Logger({
    format: { jsonConsole: false, pretty: true },
    telegram: {
        enabled: true, botToken: "noneed", hashtags: true
    }
});