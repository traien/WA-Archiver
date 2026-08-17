# WA Archiver — WhatsApp Chat & Media Vault

[![Version](https://img.shields.io/badge/version-1.0.0-00a884.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg?logo=express&logoColor=black)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WASM-003B57.svg?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**WA Archiver** is a self-hosted, privacy-first web application designed to parse, view, search, and analyze WhatsApp exported chats with complete multimedia support (photos, videos, voice notes, stickers, documents, and vCards).

All data is stored directly on your local machine in a physical SQLite database (`./data/whatsapp.db`) and a local media directory (`./data/media/<chat_id>/`), ensuring zero cloud uploads and 100% offline privacy.

---

## Highlights

- **Authentic WhatsApp Web Interface**: Pixel-accurate light and dark themes, background doodle wallpapers, chat bubble tails, read receipts, and participant group color palettes.
- **High-Scale Virtualization**: Custom sliding-window pagination architecture capable of rendering chats with **100,000+ messages** seamlessly with sub-10ms render cycles and minimal memory footprint.
- **Pixel-Anchor Scroll Restoration**: Synchronous scroll anchor calculation (`useLayoutEffect`) that preserves reading coordinates across chat switches and browser reloads without visual jitter.
- **Multi-Platform & Multi-Language Ingestion**: Ingests exports from WhatsApp Desktop (macOS / Windows), iOS, and Android across English, Arabic, and mixed locales. Recognizes timestamps down to the second, dotAll multiline captions, CAD/DWG engineering files, and vCards.
- **Seekable Voice Note Player**: Custom audio player with dynamic waveform bars, track scrubber, one-click playback speed toggling (`1x`, `1.5x`, `2x`), and single-instance playback coordination.
- **Rich Media Lightbox & Smart Matcher**: Fullscreen photo and video lightbox (with zoom, rotate, and download), PDF/document viewer, and vCard contact cards. Automatically correlates unlinked media filenames to their message timestamps down to the second.
- **Authentic Omitted Media Placeholders**: When older messages or selective exports omit binary media files (`audio omitted`, `image omitted`, `video omitted`, `document omitted`), the app renders structured WhatsApp placeholder cards instead of raw text.
- **Unicode Whole-Word Search**: Real-time in-chat search with keyboard navigation (`Enter` / `Shift+Enter`), jumping across sliding windows, and a dedicated `\b Whole Word` mode supporting multilingual text, symbols, and numbers.
- **Contact Book & Multi-"Me" Identity Manager**: Rename chats, edit participant aliases and phone numbers, and register multiple personal identifiers (old numbers, new numbers, device aliases) to automatically format your outgoing messages in green on the right side.
- **Settings & Typography Suite**: Configure 12h vs 24h time format, customizable date formatting, message bubble scaling, doodle wallpaper opacity, and typography selection (WhatsApp Standard, Cairo, Tajawal, IBM Plex Sans, System UI, Monospace).
- **Analytics & Insights Dashboard**: Visual breakdown of message counts, word statistics, active participant share, 24-hour activity distribution, and top emojis with instant 0ms hover tooltips.
- **Admin Authentication**: Built-in login screen with configurable credentials to keep your private archives secure.

---

## Architecture

```
                               ┌────────────────────────┐
                               │  WhatsApp Export .zip  │
                               └───────────┬────────────┘
                                           │ Upload
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Express Server (Node.js + TypeScript)                                       │
│                                                                             │
│  ┌───────────────────────┐   Extracts Files   ┌──────────────────────────┐  │
│  │ Chat Parser Engine    ├───────────────────►│ Media Storage            │  │
│  │ (Regex / Multi-Format)│                    │ (./data/media/<chat_id>) │  │
│  └──────────┬────────────┘                    └──────────────────────────┘  │
│             │ Indexes Messages                                              │
│             ▼                                                               │
│  ┌───────────────────────┐                    ┌──────────────────────────┐  │
│  │ SQLite Database       │◄───────────────────┤ REST API Endpoints       │  │
│  │ (./data/whatsapp.db)  │  Queries & Search  │ (/api/chats, /api/auth)  │  │
│  └───────────────────────┘                    └────────────▲─────────────┘  │
└────────────────────────────────────────────────────────────┼────────────────┘
                                                             │ JSON / Media Streams
                                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Client Application (React 18 + Vite + TypeScript)                          │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │ Sliding Window Canvas │  │ Contact Info Drawer   │  │ Voice Note &    │  │
│  │ & Pixel-Anchor Engine │  │ & Media Gallery       │  │ Waveform Player │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │ Live In-Chat Search   │  │ Chat Analytics        │  │ Settings &      │  │
│  │ (\b Whole Word Match) │  │ Dashboard             │  │ Typography Hub  │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Option 1: Run with Docker (Pre-built Image)

Run the pre-built multi-arch image directly from GitHub Container Registry:

```bash
docker run -d \
  --name wa-archiver \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ghcr.io/traien/wa-archiver:latest
```

Open `http://localhost:3000` (Default: `admin` / `admin123`).

---

### Option 2: Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/traien/WA-Archiver.git
   cd WA-Archiver
   ```

2. Start the container:
   ```bash
   docker compose up -d
   ```

3. Open your browser and go to `http://localhost:3000`.

> **Note**: All SQLite databases, media files, and configurations are stored in `./data` on the host machine and persist across container updates.

---

### Option 3: Local Development

#### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

#### Installation
```bash
# Clone repository
git clone https://github.com/traien/WA-Archiver.git
cd WA-Archiver

# Install dependencies
npm install

# Start development servers (Vite frontend + Express backend)
npm run dev
```

- **Frontend UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

#### Production Build & Run
```bash
# Build client and server bundles
npm run build

# Start production server
npm start
```

---

## How to Export WhatsApp Chats

### On iOS (iPhone)
1. Open the chat or group you wish to export in WhatsApp.
2. Tap the contact or group name at the top to open **Contact Info** / **Group Info**.
3. Scroll down and tap **Export Chat**.
4. Select **Attach Media**.
5. Save the generated `.zip` file to your Files or share it to your computer.

### On Android
1. Open the chat or group in WhatsApp.
2. Tap the three dots (`⋮`) in the top right corner > **More** > **Export chat**.
3. Choose **Include media**.
4. Save the `.zip` export to your device and transfer it to your computer.

### On WhatsApp Desktop (macOS / Windows)
1. In the chat view, open conversation settings > **Export chat history**.
2. Save the `.zip` file with full multimedia.

### Importing
Drag and drop the `.zip` file directly into the application's **Import Modal** (`+` button in the sidebar header).

---

## Configuration

You can customize runtime behavior by creating a `.env` file or configuring environment variables in `docker-compose.yml`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `3000` (Docker) / `3001` (Dev) |
| `NODE_ENV` | Environment mode (`development` \| `production`) | `production` |
| `ADMIN_USERNAME` | Administrator login username | `admin` |
| `ADMIN_PASSWORD` | Administrator login password | `admin123` |

---

## API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate and obtain session token |
| `POST` | `/api/auth/logout` | Revoke session token |
| `GET` | `/api/chats` | List all imported chats with preview metadata |
| `POST` | `/api/chats/upload` | Upload and extract WhatsApp `.zip` export |
| `PATCH` | `/api/chats/:id` | Rename chat |
| `DELETE` | `/api/chats/:id` | Delete chat and remove associated media |
| `GET` | `/api/chats/:id/messages` | Fetch paginated messages with search & whole-word filters |
| `GET` | `/api/chats/:id/dates` | Get available dates and message distribution |
| `GET` | `/api/chats/:id/media` | Fetch chat media items categorized by type |
| `GET` | `/api/chats/:id/analytics` | Generate conversation statistics and charts |
| `PATCH` | `/api/chats/:chatId/participants/:id` | Update participant alias, phone, color, and "Me" state |
| `POST` | `/api/settings/apply-me-identity` | Bulk sync "Me" identities across SQLite records |
| `GET` | `/api/settings/storage` | Retrieve physical disk and media directory footprint |

---

## Privacy & Security

- **100% Offline & Local**: WA Archiver does not connect to external analytics, tracking, or cloud services.
- **Physical SQLite Database**: All data is written to `./data/whatsapp.db` on your local disk.
- **Direct File Access**: Extracted media files remain on your local storage and are served only through local authenticated routes.

---

## Disclaimer

**WA Archiver** is an independent open-source project and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp LLC, Meta Platforms, Inc., or any of their subsidiaries or affiliates.

The official WhatsApp website is located at [https://whatsapp.com](https://whatsapp.com). The names "WhatsApp", "WhatsApp Web", and related marks, logos, and emblems are registered trademarks of WhatsApp LLC and Meta Platforms, Inc.

---

## License

This project is licensed under the [MIT License](LICENSE).


