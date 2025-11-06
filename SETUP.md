# Alyne - Setup Guide

This guide will help you set up the Alyne project for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and pnpm (`npm install -g pnpm`)
- **PostgreSQL** 14+ (or use a cloud service like Supabase)
- **Redis** 6+ (or use Redis Cloud)
- **Expo CLI** (optional, but helpful): `pnpm add -g expo-cli`
- **Git**
- **PowerShell** (Windows default shell)

## Initial Setup

### 1. Navigate to Project Directory

```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne"
```

### 2. Backend Setup

#### Quick Setup (Using Script)

```powershell
cd backend
.\scripts\setup.ps1
```

#### Manual Setup

```powershell
cd backend
pnpm install
```

#### Configure Environment Variables

```powershell
Copy-Item .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - A secure random string for JWT tokens
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- Other service credentials as needed

#### Set Up Database

```powershell
# Generate Prisma Client
pnpm exec prisma generate

# Run migrations
pnpm exec prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
pnpm exec prisma studio
```

#### Start Backend Server

```powershell
pnpm run dev
```

The backend will run on `http://localhost:3000`

### 3. Mobile App Setup

#### Quick Setup (Using Script)

```powershell
cd ..\mobile
.\scripts\setup.ps1
```

#### Manual Setup

```powershell
cd ..\mobile
pnpm install
```

#### Configure Environment Variables

```powershell
Copy-Item .env.example .env
```

Edit `.env` and configure:
- `API_BASE_URL` - Backend API URL (e.g., `http://localhost:3000/api`)
- `FIREBASE_API_KEY` - Firebase configuration
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `GOOGLE_MAPS_API_KEY` - Google Maps API key

#### Start Mobile App

```powershell
pnpm start
```

This will start the Expo development server. You can then:
- Press `i` to open iOS simulator (Mac only)
- Press `a` to open Android emulator
- Press `w` to open in web browser
- Scan QR code with Expo Go app on your phone

## Project Structure

```
Alyne/
├── mobile/              # React Native Expo app
│   ├── app/            # Expo Router pages
│   │   ├── (auth)/     # Authentication screens
│   │   └── (tabs)/     # Main app tabs
│   ├── components/     # Reusable components
│   ├── services/       # API services
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   └── scripts/        # PowerShell setup scripts
│
├── backend/            # Node.js API server
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── controllers/# Route controllers
│   │   ├── services/   # Business logic
│   │   ├── middleware/ # Express middleware
│   │   └── utils/      # Utility functions
│   ├── prisma/         # Prisma schema and migrations
│   └── scripts/        # PowerShell setup scripts
│
├── PRD.md              # Product Requirements Document
├── TECH_STACK.md       # Technology stack
└── README.md           # Project overview
```

## Development Workflow

### Running Both Services

1. **PowerShell Terminal 1 - Backend:**
   ```powershell
   cd backend
   pnpm run dev
   ```

2. **PowerShell Terminal 2 - Mobile:**
   ```powershell
   cd mobile
   pnpm start
   ```

### Database Migrations

When you modify the Prisma schema:

```powershell
cd backend
pnpm exec prisma migrate dev --name your-migration-name
pnpm exec prisma generate
```

### Code Quality

Both projects use ESLint and Prettier:

```powershell
# Mobile
cd mobile
pnpm run lint

# Backend
cd backend
pnpm run lint
```

## PowerShell-Specific Notes

### Running Scripts

If you encounter execution policy errors when running PowerShell scripts:

```powershell
# Check current execution policy
Get-ExecutionPolicy

# If needed, set execution policy for current user (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Path Handling

- Use backslashes (`\`) for Windows paths: `cd ..\mobile`
- Use quotes for paths with spaces: `cd "C:\Users\oscar\Computer Science\Projects\Alyne"`
- PowerShell supports both `/` and `\` for navigation, but `\` is more Windows-native

### Environment Variables

PowerShell environment variables can be set temporarily:

```powershell
$env:NODE_ENV = "development"
```

Or permanently in your PowerShell profile:

```powershell
[System.Environment]::SetEnvironmentVariable("NODE_ENV", "development", "User")
```

## Next Steps

1. **Set up third-party services:**
   - Create Firebase project for authentication
   - Set up Stripe account for payments
   - Get Google Maps API key
   - Configure AWS S3 for file storage

2. **Implement core features:**
   - Authentication flow
   - Provider profile creation
   - Client discovery
   - Booking system
   - Messaging
   - Reviews and ratings
   - Payment processing

3. **Testing:**
   - Set up unit tests
   - Set up integration tests
   - Test on real devices

## Troubleshooting

### Backend Issues

- **Database connection errors:** Check `DATABASE_URL` in `.env`
- **Prisma errors:** Run `pnpm exec prisma generate` after schema changes
- **Port already in use:** Change `PORT` in `.env` or kill the process:
  ```powershell
  # Find process using port 3000
  Get-NetTCPConnection -LocalPort 3000 | Select-Object -Property OwningProcess
  # Kill process (replace PID with actual process ID)
  Stop-Process -Id <PID> -Force
  ```

### Mobile Issues

- **Expo errors:** Clear cache with `expo start -c`
- **Module not found:** Run `pnpm install` again
- **Metro bundler issues:** Reset with `pnpm start -- --reset-cache`

### PowerShell Issues

- **Script execution disabled:** See "PowerShell-Specific Notes" above
- **Path not found:** Ensure you're using correct path separators (`\` for Windows)
- **Permission denied:** Run PowerShell as Administrator if needed

### Common Issues

- **Environment variables not loading:** Ensure `.env` files are in the correct directories
- **TypeScript errors:** Run `pnpm install` to ensure all types are installed
- **iOS build issues:** Ensure Xcode and CocoaPods are properly set up (Mac only)

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/)

---

**Need help?** Refer to the PRD.md for feature specifications and TECH_STACK.md for technology details.
