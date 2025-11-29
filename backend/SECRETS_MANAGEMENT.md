# Secrets Management Guide

## Overview
This document outlines best practices for managing secrets in production environments. While the application currently uses environment variables, production deployments should use a dedicated secrets management service.

## Current Implementation

### Development
- Secrets stored in `.env` files
- `.env` files are in `.gitignore`
- `.env.example` provided as template

### Production Recommendations
- Use a secrets management service
- Never commit secrets to version control
- Rotate secrets regularly
- Use different secrets for each environment

## Secrets Management Services

### Option 1: AWS Secrets Manager (Recommended for AWS Deployments)

**Setup:**
```bash
# Install AWS CLI
# Configure credentials: aws configure

# Store a secret
aws secretsmanager create-secret \
  --name alyne/production/jwt-secret \
  --secret-string "your-secret-value"

# Retrieve a secret
aws secretsmanager get-secret-value \
  --secret-id alyne/production/jwt-secret \
  --query SecretString --output text
```

**Integration:**
```typescript
// backend/src/utils/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

export async function getSecret(secretName: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return response.SecretString || '';
}
```

**Cost:** ~$0.40 per secret per month + $0.05 per 10,000 API calls

### Option 2: HashiCorp Vault

**Setup:**
```bash
# Install Vault
# Start Vault server (dev mode for testing)
vault server -dev

# Store a secret
vault kv put secret/alyne/production jwt_secret="your-secret-value"

# Retrieve a secret
vault kv get -field=jwt_secret secret/alyne/production
```

**Integration:**
```typescript
// backend/src/utils/secrets.ts
import Vault from 'node-vault';

const vault = Vault({
  endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
  token: process.env.VAULT_TOKEN,
});

export async function getSecret(path: string, key: string): Promise<string> {
  const result = await vault.read(path);
  return result.data.data[key];
}
```

**Cost:** Open source (self-hosted) or HashiCorp Cloud Platform (managed)

### Option 3: Railway Secrets (For Railway Deployments)

**Setup:**
```bash
# Using Railway CLI
railway variables set JWT_SECRET=your-secret-value

# Or via Railway Dashboard
# Project Settings > Variables
```

**Integration:**
- Automatically available as environment variables
- No code changes needed

**Cost:** Included with Railway hosting

### Option 4: Render Secrets (For Render Deployments)

**Setup:**
- Via Render Dashboard: Environment > Environment Variables
- Or via Render API

**Integration:**
- Automatically available as environment variables
- No code changes needed

**Cost:** Included with Render hosting

### Option 5: Google Cloud Secret Manager

**Setup:**
```bash
# Create a secret
gcloud secrets create jwt-secret --data-file=- <<< "your-secret-value"

# Access a secret
gcloud secrets versions access latest --secret="jwt-secret"
```

**Integration:**
```typescript
// backend/src/utils/secrets.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export async function getSecret(secretName: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/${process.env.GCP_PROJECT_ID}/secrets/${secretName}/versions/latest`,
  });
  return version.payload?.data?.toString() || '';
}
```

**Cost:** $0.06 per secret per month + $0.03 per 10,000 operations

## Migration Strategy

### Step 1: Choose a Service
- **AWS deployments**: Use AWS Secrets Manager
- **GCP deployments**: Use Google Cloud Secret Manager
- **Railway deployments**: Use Railway Secrets
- **Render deployments**: Use Render Secrets
- **Self-hosted**: Use HashiCorp Vault

### Step 2: Create Secrets
Store all sensitive environment variables:
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `PLAID_SECRET`
- `PLAID_CLIENT_ID`
- `DATABASE_URL`
- `REDIS_URL`
- Any other sensitive credentials

### Step 3: Update Application Code
Create a secrets loader utility that:
1. Checks for secrets management service first
2. Falls back to environment variables for development
3. Caches secrets to avoid repeated API calls

### Step 4: Update Deployment
- Remove secrets from deployment environment variables
- Configure secrets management service access
- Update CI/CD to use secrets service

## Best Practices

### 1. Secret Rotation
- Rotate secrets regularly (see `apiKeyRotation.ts`)
- Use versioned secrets when possible
- Test rotation process in staging first

### 2. Access Control
- Use IAM roles/policies to restrict access
- Follow principle of least privilege
- Audit secret access regularly

### 3. Encryption
- Secrets should be encrypted at rest
- Use TLS for secrets in transit
- Enable encryption in transit for all API calls

### 4. Monitoring
- Log secret access (without logging values)
- Alert on unusual access patterns
- Monitor for secret leaks

### 5. Backup
- Backup secret configurations
- Document secret locations
- Have recovery procedures

## Implementation Example

```typescript
// backend/src/utils/secrets.ts
import { logger } from './logger';

let secretsCache: Map<string, string> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps: Map<string, number> = new Map();

export async function getSecret(key: string): Promise<string> {
  // Check cache first
  const cached = secretsCache.get(key);
  const timestamp = cacheTimestamps.get(key);
  if (cached && timestamp && Date.now() - timestamp < CACHE_TTL) {
    return cached;
  }

  // Try secrets management service
  if (process.env.SECRETS_SERVICE === 'aws') {
    const value = await getAwsSecret(key);
    secretsCache.set(key, value);
    cacheTimestamps.set(key, Date.now());
    return value;
  }

  if (process.env.SECRETS_SERVICE === 'vault') {
    const value = await getVaultSecret(key);
    secretsCache.set(key, value);
    cacheTimestamps.set(key, Date.now());
    return value;
  }

  // Fall back to environment variables
  const envValue = process.env[key];
  if (!envValue) {
    throw new Error(`Secret ${key} not found in environment or secrets service`);
  }
  return envValue;
}

// Usage in application
const jwtSecret = await getSecret('JWT_SECRET');
```

## Security Considerations

1. **Never log secrets**: Always mask secrets in logs
2. **Use separate secrets per environment**: Dev, staging, production
3. **Rotate compromised secrets immediately**: Have a rotation plan
4. **Limit secret access**: Only grant access to necessary services
5. **Monitor secret usage**: Track who accesses what secrets

## Next Steps

1. Choose a secrets management service based on deployment platform
2. Migrate secrets from environment variables to secrets service
3. Update application code to use secrets service
4. Test in staging environment
5. Deploy to production
6. Document secret locations and access procedures

---

**Last Updated:** November 2024

