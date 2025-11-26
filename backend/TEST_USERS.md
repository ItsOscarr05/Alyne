# Test Users

## Development Test User

For development and testing purposes, a special test user is available:

**Email:** `test@alyne.com`  
**Password:** Any password (ignored in development mode)

This test user will:
- Automatically be created on first login if it doesn't exist
- Allow login with any password (only in development mode)
- Be created as a CLIENT user type by default

### Usage

Simply use these credentials in the login screen:
- Email: `test@alyne.com`
- Password: `anything` (or any value)

### Security Note

⚠️ **This only works in development mode** (`NODE_ENV=development`). In production, normal authentication is required.

### Creating Additional Test Users

You can also create test users manually through registration, or modify the test user creation logic in `backend/src/services/auth.service.ts` to create different user types.

