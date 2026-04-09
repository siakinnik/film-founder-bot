# FilmFounder Bot 🎬

<!-- ![Status](https://img.shields.io/badge/status-alpha-orange) -->
![Status](https://img.shields.io/badge/status-production-green)
![License](https://img.shields.io/badge/license-MIT-blue)

FilmFounder is an AI-powered Telegram bot built on Google Gemini that helps you find movies based on even the vaguest descriptions.

## Key Features

- AI Movie Search: Deep integration with Gemini 2.5 Flash Lite to accurately identify movies by plot, actors, or specific scenes.
- Smart Sessions: Context-aware conversation management that remembers your search history within a session for better results.
- Multi-language Support: Full localization for English, Russian, and German (including UI and AI responses).
- Rate Limiting: Built-in quota system (sessions per day) to optimize API usage and prevent abuse.
- Auto-Cleanup: Automated memory management that clears inactive sessions to ensure 24/7 stability.
- Daily Analytics: Automated daily reports sent to the owner (success rates, timeouts, and error stats).

## Admin Panel & Control

The bot includes an admin toolkit:

- **Universal Broadcast System**:
  - **Quick Text**: Send instant announcements to all users via `/sendall <text>`.
  - **Forward Mode**: Send complex messages (images, videos with captions, or interactive posts) by simply forwarding them to the bot after a `/sendall` prompt.
  - **Confirmation Step**: Integrated safety mechanism with `✅ SEND` and `❌ CANCEL` inline buttons to prevent accidental broadcasts.
- **Audience Management**:
  - **Ban System**: Instantly restrict access for specific users via `/ban <userId>` or unban via `/unban <userId>`.
  - **Live Analytics**: View detailed 24-hour performance stats (active sessions, success rates, and last searched films) via `/stats`.

### Tech Stack

- Runtime: Node.js
- Framework: Telegraf.js (Telegram Bot API)
- AI Engine: Google Gemini API (Flash Lite model)
- Database: SQLite (User settings, usage limits, and ban system)
- Logger: Custom multi-level logging with source tracking.
