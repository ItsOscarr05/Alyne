# Developer Onboarding Guide

## Welcome to the Alyne Development Team!

This guide will help you get set up and productive with the Alyne codebase.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **pnpm** package manager (`npm install -g pnpm`)
- **PostgreSQL** 14+ (or access to cloud database)
- **Redis** 6+ (optional but recommended)
- **Git** installed and configured
- **Code Editor** (VS Code recommended)
- **PowerShell** (Windows) or **Bash** (Mac/Linux)

## Initial Setup

### 1. Clone the Repository

```powershell
git clone <repository-url>
cd Alyne
```

### 2. Backend Setup

```powershell
cd backend

# Install dependencies
pnpm install

# Copy environment file
Copy-Item .env.example .env

# Edit .env with your local configuration
# See ENVIRONMENT_SETUP.md for details

# Set up database
pnpm exec prisma generate
pnpm exec prisma migrate dev

# (Optional) Seed database
pnpm exec prisma db seed

# Start development server
pnpm run dev
```

### 3. Mobile App Setup

```powershell
cd ..\mobile

# Install dependencies
pnpm install

# Copy environment file
Copy-Item .env.example .env

# Edit .env with your local configuration

# Start Expo development server
pnpm start
```

## Project Structure

### Backend Structure

```
backend/
├── src/
│   ├── routes/          # API route definitions
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── config/          # Configuration files
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── tests/               # Test files
└── scripts/             # Utility scripts
```

### Mobile Structure

```
mobile/
├── app/                 # Expo Router pages
│   ├── (auth)/         # Authentication screens
│   ├── (tabs)/         # Main app tabs
│   ├── provider/       # Provider-related screens
│   ├── booking/        # Booking screens
│   ├── messages/       # Messaging screens
│   └── payment/        # Payment screens
├── components/          # Reusable components
├── services/           # API services
├── hooks/              # Custom React hooks
└── utils/              # Utility functions
```

## Development Workflow

### Making Changes

1. **Create a Feature Branch**
   ```powershell
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow coding standards
   - Write tests for new features
   - Update documentation

3. **Test Your Changes**
   ```powershell
   # Backend tests
   cd backend
   pnpm test
   
   # Mobile tests
   cd ..\mobile
   pnpm test
   ```

4. **Commit Your Changes**
   ```powershell
   git add .
   git commit -m "Description of changes"
   ```

5. **Push and Create Pull Request**
   ```powershell
   git push origin feature/your-feature-name
   # Create PR on GitHub/GitLab
   ```

### Code Standards

#### TypeScript
- Use TypeScript for all new code
- Avoid `any` types
- Use proper interfaces and types
- Enable strict mode

#### Naming Conventions
- **Files**: `camelCase.ts` or `kebab-case.ts`
- **Components**: `PascalCase.tsx`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Classes**: `PascalCase`

#### Code Style
- Use ESLint and Prettier
- Run `pnpm lint` before committing
- Follow existing code patterns
- Write self-documenting code

### Database Changes

When modifying the database schema:

1. **Update Prisma Schema**
   ```powershell
   cd backend
   # Edit prisma/schema.prisma
   ```

2. **Create Migration**
   ```powershell
   pnpm exec prisma migrate dev --name describe-your-change
   ```

3. **Generate Prisma Client**
   ```powershell
   pnpm exec prisma generate
   ```

4. **Update Types**
   - TypeScript types are auto-generated
   - Update service/controller code as needed

## Key Concepts

### Authentication Flow

1. User registers/logs in via `/api/auth`
2. Backend returns JWT token
3. Frontend stores token
4. Token sent in `Authorization: Bearer <token>` header
5. Backend validates token via `authenticate` middleware

### Payment Flow

1. Client creates booking
2. Provider accepts booking
3. Client pays via Stripe (platform fee)
4. Provider receives payment via Plaid (service fee)
5. Both payments processed automatically

### Real-Time Features

- Uses Socket.io for real-time messaging
- WebSocket connection established on app start
- Messages sent/received in real-time
- Falls back to HTTP if WebSocket unavailable

## Testing

### Running Tests

```powershell
# Backend
cd backend
pnpm test

# Mobile
cd ..\mobile
pnpm test
```

### Writing Tests

- Unit tests for services/utilities
- Integration tests for API endpoints
- E2E tests for critical flows

## Debugging

### Backend Debugging

1. **Enable Debug Logging**
   ```powershell
   $env:LOG_LEVEL = "debug"
   pnpm run dev
   ```

2. **Use Prisma Studio**
   ```powershell
   pnpm exec prisma studio
   # Opens at http://localhost:5555
   ```

3. **Check Logs**
   - Development: Console output
   - Production: `logs/` directory

### Mobile Debugging

1. **React Native Debugger**
   - Enable remote debugging in Expo
   - Use React DevTools

2. **Console Logs**
   - Check Expo console
   - Use `logger` utility (not `console.log`)

3. **Network Debugging**
   - Use React Native Debugger
   - Check Network tab

## Common Tasks

### Adding a New API Endpoint

1. **Create Route**
   ```typescript
   // backend/src/routes/your-feature.routes.ts
   router.post('/endpoint', validateRequest(schema), controller.handler);
   ```

2. **Create Controller**
   ```typescript
   // backend/src/controllers/your-feature.controller.ts
   export const controller = {
     async handler(req, res, next) { ... }
   };
   ```

3. **Create Service**
   ```typescript
   // backend/src/services/your-feature.service.ts
   export const service = {
     async method() { ... }
   };
   ```

4. **Add Validation Schema**
   ```typescript
   const schema = z.object({ ... });
   ```

5. **Register Route**
   ```typescript
   // backend/src/index.ts
   app.use('/api/your-feature', yourFeatureRoutes);
   ```

### Adding a New Screen

1. **Create Screen File**
   ```typescript
   // mobile/app/your-feature/index.tsx
   export default function YourFeatureScreen() { ... }
   ```

2. **Add Navigation**
   ```typescript
   // mobile/app/_layout.tsx
   <Stack.Screen name="your-feature" />
   ```

3. **Create Service (if needed)**
   ```typescript
   // mobile/services/your-feature.ts
   export const yourFeatureService = { ... };
   ```

## Documentation

### Code Documentation

- Use JSDoc comments for functions
- Document complex logic
- Keep README files updated

### API Documentation

- Swagger/OpenAPI docs at `/api-docs`
- Update Swagger annotations when adding endpoints
- Document request/response schemas

## Resources

### Internal Documentation
- [Environment Setup Guide](../backend/ENVIRONMENT_SETUP.md)
- [Deployment Guide](../backend/DEPLOYMENT.md)
- [Security Guide](../backend/SECURITY.md)
- [Performance Guide](../backend/PERFORMANCE.md)
- [Troubleshooting Guide](../backend/TROUBLESHOOTING.md)

### External Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js Docs](https://expressjs.com/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

## Getting Help

### Questions?
- Check existing documentation
- Review similar code in the codebase
- Ask team members
- Check GitHub issues

### Reporting Issues
- Use GitHub issues
- Include:
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details
  - Error messages/logs

## Next Steps

1. **Explore the Codebase**
   - Read through key files
   - Understand the architecture
   - Review existing patterns

2. **Set Up Your Environment**
   - Configure all services
   - Test the application
   - Verify everything works

3. **Start with Small Tasks**
   - Fix bugs
   - Add small features
   - Improve documentation

4. **Familiarize Yourself**
   - Payment flow
   - Messaging system
   - Booking system
   - Authentication

Welcome to the team! 🎉

---

**Last Updated:** November 2024

