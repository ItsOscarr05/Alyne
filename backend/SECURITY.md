# Security Documentation

## Overview
This document outlines the security measures implemented in the Alyne backend application.

## 1. Rate Limiting

### Implementation
- **Global Rate Limiter**: 100 requests per 15 minutes per IP
- **Auth Rate Limiter**: 5 requests per 15 minutes (login/register)
- **Payment Rate Limiter**: 20 requests per 15 minutes
- **Plaid Rate Limiter**: 10 requests per 15 minutes

### Configuration
Rate limiters are configured in `backend/src/middleware/rateLimiter.ts` and applied to routes as needed.

## 2. Input Validation and Sanitization

### Validation
- All endpoints use Zod schemas for input validation
- Validation middleware: `backend/src/middleware/validateRequest.ts`
- Validates: request body, query parameters, route parameters

### Sanitization
- XSS prevention middleware: `backend/src/middleware/sanitizeInput.ts`
- Removes:
  - Script tags (`<script>`)
  - Event handlers (`onclick`, `onerror`, etc.)
  - JavaScript protocol (`javascript:`)
  - Data URIs with HTML content
- Applied globally to all requests

## 3. SQL Injection Prevention

### Prisma ORM
- All database queries use Prisma ORM
- Prisma uses parameterized queries, preventing SQL injection
- No raw SQL queries without proper sanitization

## 4. XSS Prevention

### Measures
1. **Input Sanitization**: All user input is sanitized before processing
2. **Helmet.js**: Security headers to prevent XSS attacks
3. **Content Security Policy**: Configured via Helmet (currently disabled for Socket.io compatibility)
4. **Output Encoding**: React/React Native automatically escape output

### Configuration
- Helmet middleware configured in `backend/src/index.ts`
- Sanitization middleware applied globally

## 5. CORS Configuration

### Production Settings
```typescript
{
  origin: process.env.FRONTEND_URL?.split(',') || [], // Multiple origins supported
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}
```

### Development Settings
- Allows `http://localhost:8081` by default
- Can be configured via `FRONTEND_URL` environment variable

## 6. Environment Variable Security

### Best Practices
1. **Never commit `.env` files** to version control
2. **Use `.env.example`** to document required variables
3. **Rotate secrets regularly** (see API Key Rotation Strategy)
4. **Use different values** for development, staging, and production
5. **Restrict access** to production environment variables

### Required Environment Variables
See `.env.example` for complete list. Key variables:
- `JWT_SECRET`: Used for token signing (keep secret!)
- `DATABASE_URL`: Database connection string
- `STRIPE_SECRET_KEY`: Stripe API key
- `PLAID_SECRET`: Plaid API secret
- `FRONTEND_URL`: Allowed CORS origins

## 7. API Key Rotation Strategy

### Rotation Schedule
- **JWT Secret**: Every 90 days
- **Stripe Keys**: Every 180 days (or when compromised)
- **Plaid Keys**: Every 180 days (or when compromised)
- **Database Credentials**: Every 90 days

### Rotation Process

#### 1. JWT Secret Rotation
```bash
# 1. Generate new secret
openssl rand -base64 32

# 2. Update environment variable
# 3. Deploy new version
# 4. Old tokens will expire naturally (based on expiration time)
```

#### 2. Stripe Key Rotation
1. Generate new API key in Stripe Dashboard
2. Update `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in environment
3. Deploy new version
4. Revoke old key after 24 hours (ensure no pending transactions)

#### 3. Plaid Key Rotation
1. Generate new API key in Plaid Dashboard
2. Update `PLAID_SECRET` and `PLAID_CLIENT_ID` in environment
3. Deploy new version
4. Revoke old key after 24 hours

#### 4. Database Credentials Rotation
1. Create new database user with same permissions
2. Update `DATABASE_URL` in environment
3. Deploy new version
4. Delete old user after 24 hours

### Emergency Rotation
If a key is compromised:
1. **Immediately** generate and deploy new key
2. Revoke old key
3. Notify affected users if necessary
4. Review access logs for suspicious activity

## 8. Authentication & Authorization

### JWT Tokens
- Tokens expire after 7 days
- Refresh tokens can be implemented for longer sessions
- Tokens are signed with `JWT_SECRET`

### Password Security
- Passwords are hashed using bcrypt (10 rounds)
- Minimum password length: 8 characters
- Passwords are never logged or stored in plain text

## 9. Security Headers

### Helmet.js Configuration
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production with HTTPS)

## 10. Logging and Monitoring

### Security Events Logged
- Failed authentication attempts
- Rate limit violations
- Validation errors
- Payment processing errors
- Database connection errors

### Monitoring
- Set up alerts for:
  - Multiple failed login attempts
  - Unusual API usage patterns
  - Payment processing failures
  - Database connection issues

## 11. Security Audit Checklist

### Regular Audits
- [ ] Review all environment variables
- [ ] Check for exposed secrets in code/logs
- [ ] Review rate limiting effectiveness
- [ ] Test input validation on all endpoints
- [ ] Verify CORS configuration
- [ ] Review authentication/authorization logic
- [ ] Check for dependency vulnerabilities (`npm audit`)
- [ ] Review database access patterns
- [ ] Test XSS prevention measures
- [ ] Verify HTTPS in production

### Tools
- `npm audit` - Dependency vulnerability scanning
- OWASP ZAP - Security testing
- Snyk - Continuous security monitoring

## 12. Incident Response

### If a Security Breach is Detected
1. **Immediately** rotate all API keys and secrets
2. Review access logs to identify scope
3. Notify affected users if personal data was compromised
4. Document the incident
5. Implement additional security measures to prevent recurrence

## 13. Compliance Considerations

### Data Protection
- User data is encrypted at rest (database encryption)
- User data is encrypted in transit (HTTPS)
- PII (Personally Identifiable Information) is handled according to privacy policies

### Payment Data
- Payment data is handled by Stripe (PCI DSS compliant)
- No payment card data is stored on our servers
- Bank account data is handled by Plaid (secure tokenization)

## Updates
This document should be reviewed and updated quarterly or after any security-related changes.

