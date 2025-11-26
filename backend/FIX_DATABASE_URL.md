# Fixing Database URL Connection String

## Common Issue: Invalid Port Number Error

This error usually means your **password contains special characters** that need to be URL-encoded.

## Solution

### Step 1: Check Your Password

If your Supabase database password contains any of these characters, they need to be encoded:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`
- `:` → `%3A`

### Step 2: URL-Encode Your Password

**Option A: Use an online URL encoder**
1. Go to https://www.urlencoder.org/
2. Paste your password
3. Copy the encoded result
4. Replace `[YOUR_PASSWORD]` in the connection string with the encoded version

**Option B: Use PowerShell to encode it**

```powershell
$password = "your-actual-password-here"
[System.Web.HttpUtility]::UrlEncode($password)
```

### Step 3: Format Your Connection String

Your connection string should look like this:

```
DATABASE_URL=postgresql://postgres:ENCODED_PASSWORD@db.yubpexlhgguhdawxlsas.supabase.co:5432/postgres
```

**Example:**
If your password is `MyP@ss#123`, it should be encoded as `MyP%40ss%23123`, so:
```
DATABASE_URL=postgresql://postgres:MyP%40ss%23123@db.yubpexlhgguhdawxlsas.supabase.co:5432/postgres
```

### Step 4: Alternative - Use Session Pooler (Recommended)

If you're having issues with the direct connection, use the **Session Pooler** instead:

1. In Supabase, go to the "Connection String" tab
2. Switch to **"Session Pooler"** (instead of "Direct connection")
3. Copy that connection string
4. It will use port **6543** instead of 5432
5. This also solves IPv4 compatibility issues

The Session Pooler connection string format:
```
postgresql://postgres.yubpexlhgguhdawxlsas:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Step 5: Test the Connection

After updating your `.env` file, test it:

```powershell
cd backend
pnpm exec prisma migrate dev --name init
```

If it works, you'll see the migration succeed!

