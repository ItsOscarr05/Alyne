# Monitoring & Logging Guide

## Overview
This document outlines the monitoring and logging infrastructure for the Alyne application.

## 1. Error Tracking (Sentry)

### Setup
1. Install Sentry:
   ```bash
   pnpm add @sentry/node
   ```

2. Set environment variable:
   ```env
   SENTRY_DSN=your_sentry_dsn_here
   ```

3. Uncomment Sentry initialization in `backend/src/utils/errorTracking.ts`

### Features
- Automatic exception capture
- User context tracking
- Custom context for debugging
- Performance monitoring (traces)

### Usage
```typescript
import { errorTracker, captureError } from './utils/errorTracking';

// Capture exception
try {
  // some code
} catch (error) {
  errorTracker.captureException(error, { context: 'additional info' });
}

// Capture message
errorTracker.captureMessage('Something went wrong', 'error', { userId: '123' });

// Set user context
errorTracker.setUser(userId, email);

// Set custom context
errorTracker.setContext('booking', { bookingId: 'abc123' });
```

## 2. Application Performance Monitoring (APM)

### Implementation
- Request/response time tracking
- Error rate monitoring
- Average response time calculation
- Slow request detection (>1 second)

### Metrics Tracked
- Total requests
- Error count
- Error rate percentage
- Average response time
- Uptime

### Access Metrics
```bash
# Get current metrics
GET /metrics

# Response:
{
  "success": true,
  "data": {
    "startTime": 1234567890,
    "requestCount": 1500,
    "errorCount": 5,
    "averageResponseTime": 125,
    "uptime": 3600000,
    "uptimeFormatted": "1h 0m 0s",
    "errorRate": 0.33
  }
}
```

## 3. Log Aggregation (Winston)

### Configuration
- **Development**: Console output with colors
- **Production**: JSON format with file rotation
- **Log Levels**: debug, info, warn, error

### Log Files (Production)
- `logs/error.log` - Error level logs only
- `logs/combined.log` - All logs
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Log Rotation
- Max file size: 5MB
- Max files: 5 (keeps last 5 rotated files)

### Usage
```typescript
import { logger } from './utils/logger';

logger.debug('Debug message', { additional: 'data' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error, { context: 'data' });
```

## 4. Health Check Endpoints

### `/health`
Comprehensive health check including:
- Database connectivity
- Redis connectivity (if configured)
- Application metrics
- Service status

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "connected",
      "responseTime": "5ms"
    },
    "redis": {
      "status": "connected"
    }
  },
  "metrics": {
    "uptime": "2h 30m 15s",
    "totalRequests": 1500,
    "errorCount": 5,
    "errorRate": "0.33%",
    "averageResponseTime": "125ms"
  }
}
```

### `/metrics`
Detailed application metrics for monitoring tools.

## 5. Uptime Monitoring

### Implementation
- Tracks application start time
- Calculates uptime in human-readable format
- Included in health check endpoint

### External Monitoring
Recommended services:
- **UptimeRobot**: Free tier available
- **Pingdom**: Comprehensive monitoring
- **StatusCake**: Free tier available
- **AWS CloudWatch**: If using AWS

### Setup Example (UptimeRobot)
1. Create account at uptimerobot.com
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://your-api.com/health`
   - Interval: 5 minutes
   - Alert contacts: Your email

## 6. Analytics Integration

### Backend Analytics
Currently implemented:
- Request metrics
- Error tracking
- Performance monitoring

### Frontend Analytics (Recommended)
Consider integrating:
- **Google Analytics**: Web analytics
- **Mixpanel**: User behavior tracking
- **Amplitude**: Product analytics
- **PostHog**: Open-source alternative

### Implementation Example (Google Analytics)
```typescript
// In mobile app
import { Analytics } from '@react-native-firebase/analytics';

// Track screen view
await Analytics().logScreenView({
  screen_name: 'ProviderDetail',
  screen_class: 'ProviderDetailScreen',
});

// Track event
await Analytics().logEvent('booking_created', {
  provider_id: providerId,
  service_id: serviceId,
  price: price,
});
```

## 7. Log Retention Policy

### Development
- Logs to console only
- No file retention needed

### Production
- **Error logs**: Retain for 30 days
- **Combined logs**: Retain for 7 days
- **Exception logs**: Retain for 90 days
- **Rejection logs**: Retain for 90 days

### Log Rotation
- Automatic rotation at 5MB
- Keeps last 5 files
- Oldest files automatically deleted

## 8. Monitoring Checklist

### Backend
- [x] Winston logger configured
- [x] Error tracking setup (Sentry ready)
- [x] Performance monitoring
- [x] Health check endpoint
- [x] Metrics endpoint
- [ ] Sentry DSN configured (when ready)
- [ ] External uptime monitoring
- [ ] Log aggregation service (optional)

### Frontend
- [ ] Error boundary with error tracking
- [ ] Analytics integration
- [ ] Performance monitoring
- [ ] User behavior tracking

## 9. Alerting

### Recommended Alerts
1. **High Error Rate**: >5% error rate
2. **Slow Response Time**: Average >500ms
3. **Service Down**: Health check fails
4. **Database Issues**: Database connection fails
5. **High Memory Usage**: >80% memory usage

### Alert Channels
- Email
- Slack
- PagerDuty (for critical alerts)
- SMS (for production incidents)

## 10. Performance Monitoring

### Key Metrics
- **Response Time**: Tracked per request
- **Error Rate**: Calculated from total requests
- **Uptime**: Tracked since server start
- **Slow Requests**: Logged when >1 second

### Monitoring Tools
- **Application Metrics**: Built-in `/metrics` endpoint
- **Database Performance**: Prisma query logging
- **Cache Performance**: Redis monitoring
- **External APM**: Consider New Relic, Datadog, or similar

## 11. Log Analysis

### Tools
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Loki**: Grafana's log aggregation
- **CloudWatch Logs**: AWS native solution
- **Papertrail**: Simple log aggregation

### Query Examples
```bash
# Find all errors in last hour
grep "ERROR" logs/combined.log | grep "$(date -d '1 hour ago' +%Y-%m-%d)"

# Find slow requests
grep "Slow request" logs/combined.log

# Count errors by endpoint
grep "ERROR" logs/error.log | awk '{print $NF}' | sort | uniq -c
```

## 12. Best Practices

1. **Structured Logging**: Always use structured data in logs
2. **Log Levels**: Use appropriate log levels (debug, info, warn, error)
3. **Error Context**: Include context when logging errors
4. **Performance**: Don't log sensitive data (passwords, tokens)
5. **Monitoring**: Set up alerts for critical metrics
6. **Retention**: Follow log retention policy
7. **Privacy**: Ensure logs comply with privacy regulations

## Updates
This document should be reviewed quarterly and updated as monitoring needs evolve.

