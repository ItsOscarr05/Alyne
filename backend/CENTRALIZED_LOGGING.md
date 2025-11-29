# Centralized Logging Guide

## Overview
This guide outlines options and implementation strategies for centralized logging in production environments. Centralized logging aggregates logs from multiple sources into a single location for easier monitoring, searching, and analysis.

## Current Implementation

### Local Logging (Development)
- Winston with daily rotation
- File-based storage (`logs/` directory)
- In-memory security event tracking
- Suitable for development and small deployments

### Production Needs
- Centralized log aggregation
- Real-time log streaming
- Advanced search and filtering
- Alerting and monitoring
- Long-term storage and archival

## Centralized Logging Services

### Option 1: AWS CloudWatch Logs (Recommended for AWS)

**Setup:**
```bash
# Install AWS SDK
pnpm add @aws-sdk/client-cloudwatch-logs winston-cloudwatch

# Configure Winston transport
```

**Integration:**
```typescript
// backend/src/utils/logger.ts
import CloudWatchTransport from 'winston-cloudwatch';

const cloudwatchTransport = new CloudWatchTransport({
  logGroupName: 'alyne-backend',
  logStreamName: process.env.NODE_ENV || 'development',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  messageFormatter: ({ level, message, meta }) => {
    return `[${level}] ${message} ${meta ? JSON.stringify(meta) : ''}`;
  },
});

// Add to Winston transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(cloudwatchTransport);
}
```

**Features:**
- Real-time log streaming
- Log retention (1 day to forever)
- Log insights and queries
- Integration with AWS services
- Cost: $0.50 per GB ingested, $0.03 per GB stored

### Option 2: Datadog

**Setup:**
```bash
# Install Datadog agent (on server)
# Or use Datadog API

pnpm add winston-datadog-logs
```

**Integration:**
```typescript
// backend/src/utils/logger.ts
import DatadogTransport from 'winston-datadog-logs';

const datadogTransport = new DatadogTransport({
  apiKey: process.env.DATADOG_API_KEY,
  hostname: process.env.HOSTNAME || 'alyne-backend',
  service: 'alyne-backend',
  ddsource: 'nodejs',
  env: process.env.NODE_ENV || 'development',
});

if (process.env.NODE_ENV === 'production') {
  logger.add(datadogTransport);
}
```

**Features:**
- APM integration
- Real-time dashboards
- Alerting
- Log retention (15 days to 1 year)
- Cost: $0.10 per GB ingested

### Option 3: Loggly

**Setup:**
```bash
pnpm add winston-loggly-bulk
```

**Integration:**
```typescript
// backend/src/utils/logger.ts
import Loggly from 'winston-loggly-bulk';

logger.add(new Loggly({
  token: process.env.LOGGLY_TOKEN,
  subdomain: process.env.LOGGLY_SUBDOMAIN,
  tags: ['alyne', 'backend', process.env.NODE_ENV],
  json: true,
}));
```

**Features:**
- Real-time search
- Alerting
- Dashboards
- Log retention (7 days to 1 year)
- Cost: $79/month for 20GB

### Option 4: Papertrail

**Setup:**
```bash
pnpm add winston-papertrail
```

**Integration:**
```typescript
// backend/src/utils/logger.ts
import Papertrail from 'winston-papertrail';

const papertrailTransport = new Papertrail({
  host: process.env.PAPERTRAIL_HOST,
  port: process.env.PAPERTRAIL_PORT,
  program: 'alyne-backend',
  colorize: true,
});

if (process.env.NODE_ENV === 'production') {
  logger.add(papertrailTransport);
}
```

**Features:**
- Real-time search
- Alerting
- Simple setup
- Log retention (7 days to 1 year)
- Cost: $7/month for 100MB

### Option 5: ELK Stack (Self-hosted)

**Components:**
- **Elasticsearch**: Log storage and search
- **Logstash**: Log processing
- **Kibana**: Visualization

**Setup:**
```bash
# Install Filebeat or Logstash
# Configure to ship logs to Elasticsearch
```

**Integration:**
```typescript
// Use Winston with file output, then ship via Filebeat
// Or use winston-elasticsearch
import Elasticsearch from 'winston-elasticsearch';

const esTransport = new Elasticsearch({
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL,
    auth: {
      username: process.env.ELASTICSEARCH_USER,
      password: process.env.ELASTICSEARCH_PASSWORD,
    },
  },
  index: 'alyne-logs',
});

if (process.env.NODE_ENV === 'production') {
  logger.add(esTransport);
}
```

**Features:**
- Full control
- Highly customizable
- Scalable
- Cost: Infrastructure costs

## Implementation Strategy

### Phase 1: Choose Service
1. Evaluate based on:
   - Deployment platform (AWS, GCP, etc.)
   - Budget constraints
   - Feature requirements
   - Team expertise

### Phase 2: Configure Winston
1. Add logging service transport
2. Configure log levels
3. Set up log formatting
4. Test in staging

### Phase 3: Deploy
1. Update environment variables
2. Deploy to staging
3. Verify logs are being sent
4. Deploy to production

### Phase 4: Monitor
1. Set up dashboards
2. Configure alerts
3. Review log retention
4. Optimize costs

## Best Practices

### 1. Log Levels
- **Error**: Application errors, exceptions
- **Warn**: Warnings, deprecations
- **Info**: General information, important events
- **Debug**: Detailed debugging information (development only)

### 2. Log Formatting
- Use structured logging (JSON)
- Include context (user ID, request ID, etc.)
- Add timestamps
- Include environment information

### 3. Log Sanitization
- Never log sensitive data
- Redact passwords, tokens, secrets
- Mask PII when possible
- Follow compliance requirements

### 4. Performance
- Use async logging
- Batch log sends
- Rate limit log volume
- Monitor log ingestion costs

### 5. Alerting
- Alert on error spikes
- Alert on critical errors
- Alert on security events
- Alert on log ingestion failures

## Cost Optimization

### 1. Log Sampling
- Sample debug logs in production
- Only send errors and warnings
- Use log levels effectively

### 2. Log Retention
- Set appropriate retention periods
- Archive old logs to cold storage
- Delete logs after retention period

### 3. Log Filtering
- Filter out noisy logs
- Aggregate similar logs
- Use log levels to control volume

## Migration Checklist

- [ ] Choose centralized logging service
- [ ] Set up service account/credentials
- [ ] Install required packages
- [ ] Configure Winston transport
- [ ] Test in development
- [ ] Deploy to staging
- [ ] Verify logs are being sent
- [ ] Set up dashboards
- [ ] Configure alerts
- [ ] Deploy to production
- [ ] Monitor costs
- [ ] Document configuration

## Next Steps

1. **Immediate**: Choose a centralized logging service
2. **Short-term**: Configure Winston transport
3. **Medium-term**: Deploy to staging and test
4. **Long-term**: Deploy to production and optimize

---

**Last Updated:** November 2024

