# Assets Directory

This directory contains the app icons and images required by Expo.

## Required Assets

The following image files are required:

- **icon.png** (1024x1024) - App icon for iOS and Android
- **splash.png** (2048x2048) - Splash screen image
- **adaptive-icon.png** (1024x1024) - Android adaptive icon foreground
- **favicon.png** (48x48) - Web favicon
- **notification-icon.png** (96x96) - Notification icon

## Quick Setup

You can create placeholder images using:

1. **Online tools:**
   - Use [Expo's asset generator](https://docs.expo.dev/guides/app-icons/)
   - Or any image editor to create simple colored squares with text

2. **Using the PowerShell script:**
   ```powershell
   cd mobile
   .\scripts\create-assets.ps1
   ```

3. **Manual creation:**
   - Create 1024x1024 PNG files for icon.png and adaptive-icon.png
   - Create 2048x2048 PNG for splash.png
   - Create 48x48 PNG for favicon.png
   - Create 96x96 PNG for notification-icon.png
   - Use a solid color background (e.g., #2563eb) with white "A" text

## Temporary Workaround

If you need to start the app immediately without assets, you can temporarily comment out asset references in `app.json` and `app.config.js`, but this is not recommended for production.

