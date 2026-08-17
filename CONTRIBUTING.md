# Contributing to WhatsApp Chat & Media Viewer

Thank you for your interest in contributing to WhatsApp Chat & Media Viewer! We welcome pull requests, bug reports, and suggestions.

---

## Development Setup

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

### 2. Clone and Install
```bash
git clone https://github.com/your-username/whatsapp-viewer.git
cd whatsapp-viewer
npm install
```

### 3. Start Development Servers
```bash
npm run dev
```
- Frontend (Vite): `http://localhost:5173`
- Backend (Express): `http://localhost:3001`

### 4. Build and Type Check
Before submitting changes, ensure the TypeScript compiler and production bundles build without errors:
```bash
npm run build
```

---

## Code Guidelines

- **TypeScript**: Strict type-checking is enabled across both client and server codebases.
- **Privacy First**: Ensure no chat logs, SQLite data, or extracted media are transmitted over the network or logged externally.
- **Component Architecture**: Keep UI components modular, accessible, and aligned with WhatsApp Web aesthetics.
- **Commit Messages**: Write clear, descriptive commit messages describing the rationale and scope of your changes.

---

## Reporting Issues

When reporting bugs, please include:
- Operating system and browser version.
- Export format / device type (iOS or Android).
- Language / locale of the WhatsApp export (e.g., English, Arabic 12h/24h, etc.).
- Steps to reproduce and relevant terminal/browser console logs (with personal data redacted).
