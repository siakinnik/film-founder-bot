# FilmFounder Bot 🎬

![Status](https://img.shields.io/badge/status-production-green)
![License](https://img.shields.io/badge/license-MIT-blue)

FilmFounder is an AI-powered Telegram bot that helps you find movies based on even the vaguest descriptions. Now featuring a highly flexible architecture supporting multiple AI providers and proxy configurations.

Running instanse: [@FilmFounderAI_bot](https://t.me/FilmFounderAI_bot)

## Key Features

- **Flexible AI Engine**: Support for multiple AI providers including native **Google Gemini** and any **OpenAI-compatible API** (OpenRouter, DeepSeek, custom reverse proxies, etc.).
- **Smart Sessions**: Context-aware conversation management that remembers your search history within a session for better results.
- **Censorship & Block Resistance**: Built-in support for HTTPS/SOCKS5 proxies and custom API endpoints to bypass regional restrictions.
- **Multi-language Support**: Full localization for English, Russian, and German (including UI and AI responses).
- **Rate Limiting**: Built-in quota system (sessions per day) to optimize API usage and prevent abuse.
- **Auto-Cleanup**: Automated memory management that clears inactive sessions to ensure 24/7 stability.
- **Daily Analytics**: Automated daily reports sent to the owner (success rates, timeouts, and error stats).

## Admin Panel & Control

The bot includes a robust admin toolkit:

- **Universal Broadcast System**:
  - **Quick Text**: Send instant announcements to all users via `/sendall <text>`.
  - **Forward Mode**: Send complex messages (images, videos with captions, or interactive posts) by simply forwarding them to the bot after a `/sendall` prompt.
  - **Confirmation Step**: Integrated safety mechanism with `✅ SEND` and `❌ CANCEL` inline buttons to prevent accidental broadcasts.
- **Audience Management**:
  - **Ban System**: Instantly restrict access for specific users via `/ban <userId>` or unban via `/unban <userId>`.
  - **Live Analytics**: View detailed 24-hour performance stats (active sessions, success rates, and last searched films) via `/stats`.

## Tech Stack & Architecture

- **Runtime**: Node.js
- **Framework**: `telegraf-hardened` (Enhanced Telegram Bot API wrapper with built-in proxy support)
- **AI Integration**: Unified multi-provider AI class (`@google/genai` & `openai` SDKs)
- **Database**: SQLite (User settings, session memory, usage limits, and ban system)
- **Logger**: Custom multi-level logging with source tracking.
