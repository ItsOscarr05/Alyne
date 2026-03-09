# Alyne Web App

Web application for the Alyne wellness marketplace platform.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **pnpm** - Package manager

## Setup

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Installation

```powershell
cd web-app
pnpm install
```

### Environment Variables

```powershell
Copy-Item .env.example .env
```

Edit `.env` and configure:
- `VITE_API_BASE_URL` - Backend API URL (default: `http://localhost:3000/api`)

### Development

```powershell
pnpm dev
```

The web app will run on `http://localhost:5173`

### Build

```powershell
pnpm build
```

### Preview Production Build

```powershell
pnpm preview
```

## Project Structure

```
web-app/
├── src/
│   ├── main.tsx      # React entry point
│   ├── App.tsx       # Root component
│   └── index.css     # Base styles
├── index.html        # HTML template
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
└── package.json      # Dependencies and scripts
```

## Backend Integration

The web app connects to the backend API running at `http://localhost:3000/api` (configurable via `VITE_API_BASE_URL`).

Vite's dev server is configured to proxy `/api` requests to the backend, so you can use relative URLs like `/api/auth/login` in your code.
