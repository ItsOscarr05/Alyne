# Alyne - Wellness Marketplace Mobile Application

A two-sided marketplace mobile application connecting wellness service providers (fitness trainers, yoga instructors, nutritionists, etc.) with clients seeking these services within their local geographic area.

## 📋 Project Overview

Alyne solves the dual-sided marketplace problem: professionals struggle to find consistent clients, while clients don't know where to find qualified, local wellness providers.

## 🏗️ Architecture

This project consists of three main components:

- **Mobile App** (`/mobile`) - React Native with Expo (iOS, Android, Web)
- **Web App** (`/web-app`) - React with Vite and TypeScript
- **Backend API** (`/backend`) - Node.js with TypeScript and Express

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm (`npm install -g pnpm`)
- PostgreSQL 14+
- Redis 6+
- Expo CLI (`pnpm add -g expo-cli`)
- iOS Simulator (for Mac) or Android Studio (for Android development)

### Mobile App Setup

```powershell
cd mobile
pnpm install
Copy-Item .env.example .env
# Edit .env with your configuration
pnpm start
```

### Web App Setup

```powershell
cd web-app
pnpm install
Copy-Item .env.example .env
# Edit .env with your configuration
pnpm dev
```

### Backend Setup

```powershell
cd backend
pnpm install
Copy-Item .env.example .env
# Edit .env with your configuration

# Set up database
pnpm exec prisma migrate dev
pnpm exec prisma generate

# Start development server
pnpm run dev
```

## 📁 Project Structure

```
Alyne/
├── mobile/                 # React Native Expo app
│   ├── app/                # Expo Router pages
│   ├── components/         # Reusable components
│   ├── services/          # API services
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
│
├── web-app/                # React web application
│   ├── src/               # Source code
│   │   ├── main.tsx       # Entry point
│   │   └── App.tsx        # Root component
│   ├── index.html         # HTML template
│   └── vite.config.ts     # Vite configuration
│
├── backend/               # Node.js API server
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   └── prisma/            # Prisma schema and migrations
│
├── PRD.md                 # Product Requirements Document
└── TECH_STACK.md          # Technology stack documentation
```

## 🔑 Key Features (MVP)

- ✅ User authentication (email/phone, social login)
- ✅ Provider and client profiles
- ✅ Location-based provider discovery
- ✅ Search and filtering
- ✅ Booking system (request/accept/decline)
- ✅ In-app messaging
- ✅ Reviews and ratings
- ✅ Payment processing (Stripe)
- ✅ Push notifications
- ✅ Calendar integration

## 🛠️ Technology Stack

See [TECH_STACK.md](./TECH_STACK.md) for detailed technology choices.

## 📱 Development

### Running the Mobile App

```powershell
cd mobile
pnpm start
# Press 'i' for iOS simulator, 'a' for Android emulator, 'w' for web
```

### Running the Web App

```powershell
cd web-app
pnpm dev
# Web app runs on http://localhost:5173
```

### Running the Backend

```powershell
cd backend
pnpm run dev
# Server runs on http://localhost:3000
```

## 🧪 Testing

```powershell
# Mobile app tests
cd mobile
pnpm test

# Backend tests
cd backend
pnpm test
```

## 📝 Environment Variables

Copy `.env.example` to `.env` in `mobile/`, `web-app/`, and `backend/` directories using PowerShell:

```powershell
# Backend
cd backend
Copy-Item .env.example .env

# Mobile
cd ..\mobile
Copy-Item .env.example .env

# Web App
cd ..\web-app
Copy-Item .env.example .env
```

Then fill in your configuration values in the `.env` files.

## 💻 Development Environment

**Important:** This project uses **PowerShell syntax** for all terminal commands. When running commands in the terminal or generating commands for this project, always use PowerShell syntax (not bash/Linux syntax).

- Use `Get-ChildItem` or `dir` instead of `ls`
- Use `Select-String` instead of `grep`
- Use `;` instead of `&&` for chaining commands
- Use `Copy-Item` instead of `cp`
- Use PowerShell-native syntax for all operations

The `.vscode/settings.json` file is configured to use PowerShell as the default terminal profile.

## 📚 Documentation

- [Product Requirements Document](./PRD.md)
- [Technology Stack](./TECH_STACK.md)

## 🤝 Contributing

This is a private project. Follow the PRD specifications for all development.

## 📄 License

Private - All Rights Reserved

---

**Version:** 1.0.0  
**Last Updated:** December 2024

