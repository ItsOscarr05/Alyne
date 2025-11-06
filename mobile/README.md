# Alyne Mobile App

## Setup

### Install Dependencies

```powershell
pnpm install
```

**Note:** If you encounter pnpm errors, try:
```powershell
# Clear pnpm cache
pnpm store prune

# Or reinstall
Remove-Item -Recurse -Force node_modules
pnpm install
```

### TypeScript Configuration

The `tsconfig.json` is configured to work with Expo. After installing dependencies, Expo will generate additional type definitions.

If you see TypeScript errors about missing modules before installing dependencies, that's expected. Run `npm install` first.

### Development

```powershell
npm start
```

## Troubleshooting TypeScript Errors

If you see errors like "Cannot find module 'react-native'":

1. **Install dependencies:**
   ```powershell
   pnpm install
   ```

2. **If using Expo, ensure Expo types are generated:**
   ```powershell
   pnpm exec expo install --fix
   ```

3. **Restart your TypeScript server** in your IDE (VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server")

4. **Clear Expo cache if needed:**
   ```powershell
   npx expo start -c
   ```

