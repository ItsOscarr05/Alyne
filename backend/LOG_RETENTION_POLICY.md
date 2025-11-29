# Log Retention Policy

## Overview
This document defines the log retention policy for the Alyne backend application, ensuring compliance with data protection regulations and efficient log management.

## Current Logging Implementation

### Log Types
1. **Application Logs** (Winston)
   - Combined logs: `logs/combined-YYYY-MM-DD.log`
   - Error logs: `logs/error-YYYY-MM-DD.log`
   - Exceptions: `logs/exceptions-YYYY-MM-DD.log`
   - Rejections: `logs/rejections-YYYY-MM-DD.log`

2. **Security Event Logs**
   - Tracked in-memory (last 1000 events)
   - Logged via Winston
   - Available via `/security/stats` endpoint

3. **Access Logs**
   - Request/response logging via monitoring middleware
   - Performance metrics

## Retention Policy

### Development Environment
- **Retention Period**: 7 days
- **Storage**: Local filesystem
- **Rotation**: Daily
- **Cleanup**: Automatic (old files deleted)

### Staging Environment
- **Retention Period**: 30 days
- **Storage**: Local filesystem or cloud storage
- **Rotation**: Daily
- **Cleanup**: Automatic after retention period

### Production Environment
- **Retention Period**: 90 days (minimum)
- **Storage**: Centralized logging service (recommended)
- **Rotation**: Daily
- **Archival**: Long-term storage for compliance (1-7 years)
- **Cleanup**: Automatic after retention period

## Log Categories and Retention

### 1. Application Logs
- **Info/Debug Logs**: 30 days
- **Warning Logs**: 90 days
- **Error Logs**: 1 year
- **Critical/Exception Logs**: 2 years

### 2. Security Logs
- **All Security Events**: 1 year minimum
- **Critical Security Events**: 2 years
- **Compliance Requirements**: 7 years (if applicable)

### 3. Audit Logs
- **Authentication Events**: 1 year
- **Authorization Failures**: 2 years
- **Payment Transactions**: 7 years (compliance)
- **Data Access Logs**: 1 year

### 4. Performance Logs
- **Request Metrics**: 30 days
- **Slow Query Logs**: 90 days
- **Performance Alerts**: 1 year

## Implementation

### Current Configuration (Winston)
```typescript
// backend/src/utils/logger.ts
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: `${logDir}/combined-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '5m',
  maxFiles: '5d', // Keep logs for 5 days (development)
  level: 'info',
});
```

### Production Configuration
```typescript
// Production settings
const productionConfig = {
  maxFiles: '90d', // Keep for 90 days
  maxSize: '20m', // 20MB per file
  zippedArchive: true,
  createSymlink: true, // Create symlink to current log
};
```

## Centralized Logging Services

### Recommended Services

#### 1. AWS CloudWatch Logs
- **Retention**: Configurable (1 day to forever)
- **Cost**: $0.50 per GB ingested, $0.03 per GB stored
- **Features**: Search, alerts, dashboards

#### 2. Datadog
- **Retention**: Configurable
- **Cost**: $0.10 per GB ingested
- **Features**: APM, monitoring, alerting

#### 3. Loggly
- **Retention**: 7 days (free), up to 1 year (paid)
- **Cost**: $79/month for 20GB
- **Features**: Search, alerts, dashboards

#### 4. Papertrail
- **Retention**: 7 days (free), up to 1 year (paid)
- **Cost**: $7/month for 100MB
- **Features**: Search, alerts

#### 5. ELK Stack (Self-hosted)
- **Retention**: Configurable
- **Cost**: Infrastructure costs
- **Features**: Full control, customizable

## Log Rotation Strategy

### File-Based Rotation
1. **Daily Rotation**: New log file each day
2. **Size-Based Rotation**: Rotate when file exceeds size limit
3. **Compression**: Compress old log files
4. **Deletion**: Delete files older than retention period

### Cloud-Based Rotation
1. **Automatic Rotation**: Handled by logging service
2. **Indexing**: Logs indexed for search
3. **Archival**: Old logs moved to cold storage
4. **Deletion**: Automatic after retention period

## Compliance Requirements

### GDPR (General Data Protection Regulation)
- **Personal Data Logs**: 1 year minimum
- **Right to Deletion**: Must be able to delete user data from logs
- **Data Minimization**: Only log necessary data

### PCI DSS (Payment Card Industry)
- **Payment Logs**: 1 year minimum
- **Access Logs**: 1 year minimum
- **Security Logs**: 1 year minimum

### HIPAA (Health Insurance Portability)
- **Access Logs**: 6 years
- **Audit Logs**: 6 years
- **Security Logs**: 6 years

## Log Sanitization

### Sensitive Data
Never log:
- Passwords
- Credit card numbers
- Social Security numbers
- API keys/secrets
- Full JWT tokens (log only token ID)
- Personal identifiable information (PII)

### Sanitization Rules
```typescript
// Example sanitization
function sanitizeLogData(data: any): any {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
  return data;
}
```

## Monitoring and Alerts

### Log Volume Alerts
- Alert if log volume exceeds threshold
- Alert if error rate spikes
- Alert if security events increase

### Retention Alerts
- Alert if logs approaching retention limit
- Alert if archival fails
- Alert if cleanup fails

## Backup and Recovery

### Backup Strategy
1. **Daily Backups**: Backup critical logs daily
2. **Offsite Storage**: Store backups in separate location
3. **Encryption**: Encrypt backup files
4. **Testing**: Regularly test log recovery

### Recovery Procedures
1. Identify logs needed for recovery
2. Restore from backup or archive
3. Verify log integrity
4. Document recovery process

## Implementation Checklist

- [x] Winston logging configured with rotation
- [x] Log retention configured (5 days for dev)
- [ ] Production log retention configured (90 days)
- [ ] Centralized logging service integrated
- [ ] Log sanitization implemented
- [ ] Compliance requirements documented
- [ ] Backup strategy implemented
- [ ] Recovery procedures documented
- [ ] Monitoring and alerts configured

## Next Steps

1. **Immediate**: Update production log retention to 90 days
2. **Short-term**: Integrate centralized logging service
3. **Medium-term**: Implement log sanitization
4. **Long-term**: Set up log archival for compliance

---

**Last Updated:** November 2024  
**Review Date:** Quarterly

