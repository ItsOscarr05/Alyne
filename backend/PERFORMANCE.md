# Performance Optimization Guide

## Overview
This document outlines the performance optimizations implemented in the Alyne application.

## 1. Database Query Optimization

### Indexes Added
The following composite indexes have been added to improve query performance:

#### Booking Model
- `@@index([clientId, status])` - Optimizes queries filtering by client and status
- `@@index([providerId, status])` - Optimizes queries filtering by provider and status
- `@@index([scheduledDate, status])` - Optimizes date range queries with status

#### Message Model
- `@@index([senderId, receiverId])` - Optimizes conversation queries
- `@@index([receiverId, status])` - Optimizes unread message queries
- `@@index([receiverId, createdAt])` - Optimizes message ordering by user

#### Review Model
- `@@index([providerId, isVisible])` - Optimizes visible reviews query
- `@@index([providerId, rating])` - Optimizes rating-based queries

#### Service Model
- `@@index([providerId, isActive])` - Optimizes active services query

### Query Optimizations
1. **Selective Field Loading**: Using `select` instead of `include` where possible to reduce data transfer
2. **Pagination**: All list endpoints now support pagination to limit result sets
3. **Eager Loading**: Using Prisma `include` strategically to avoid N+1 queries

## 2. Caching (Redis)

### Implementation
- Redis client initialized on server startup
- Graceful degradation if Redis is unavailable
- Cache utilities in `backend/src/utils/cache.ts`

### Cached Data
- **Provider Details**: 5-minute cache for individual provider lookups
- **Provider Lists**: Can be cached based on filter parameters
- **Booking Lists**: User-specific booking lists (future enhancement)

### Cache Keys
- `provider:{id}` - Individual provider data
- `providers:list:{filters}` - Provider discovery results
- `booking:{id}` - Individual booking data
- `bookings:{userId}:{role}:{status}` - User booking lists

### Cache Invalidation
- Provider cache invalidated when profile is updated
- Booking cache invalidated when booking status changes
- Manual cache clearing via `deleteCache()` or `deleteCachePattern()`

## 3. Pagination

### Implementation
- Pagination utilities in `backend/src/utils/pagination.ts`
- Default: 20 items per page
- Maximum: 100 items per page
- Applied to:
  - Provider discovery endpoint
  - User bookings endpoint

### Pagination Response Format
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Usage
```typescript
// Query parameters
GET /api/providers/discover?page=1&limit=20
GET /api/bookings?page=2&limit=10&status=CONFIRMED
```

## 4. Image Optimization

### Current Status
- Static assets documented in `mobile/assets/OPTIMIZATION.md`
- User-uploaded images (profile photos) stored as URLs
- No CDN currently configured

### Recommendations
1. **CDN Setup**: Use Cloudflare, AWS CloudFront, or similar for image delivery
2. **Image Compression**: Compress images before upload
3. **Responsive Images**: Serve different sizes based on device
4. **Lazy Loading**: Implement lazy loading for images in lists

## 5. Bundle Size Optimization

### Frontend (Mobile/Web)
- **Expo**: Uses Metro bundler with tree-shaking
- **Code Splitting**: Routes are automatically code-split in Expo Router
- **Lazy Loading**: Implemented via Expo Router's file-based routing

### Recommendations
1. **Analyze Bundle**: Run `npx expo export` and analyze bundle size
2. **Remove Unused Dependencies**: Regularly audit `package.json`
3. **Dynamic Imports**: Use dynamic imports for heavy libraries
4. **Image Optimization**: Use WebP format where possible

## 6. Lazy Loading for Routes

### Current Implementation
- **Expo Router**: Automatically implements code splitting
- **File-based Routing**: Each route file is a separate bundle
- **On-demand Loading**: Routes load when navigated to

### Verification
Routes in `mobile/app/` are automatically lazy-loaded by Expo Router. No additional configuration needed.

## 7. Performance Monitoring

### Metrics to Track
1. **API Response Times**: Monitor endpoint performance
2. **Database Query Times**: Use Prisma query logging
3. **Cache Hit Rates**: Monitor Redis cache effectiveness
4. **Bundle Size**: Track frontend bundle size over time
5. **Page Load Times**: Monitor frontend performance

### Tools
- **Backend**: Winston logger with performance timestamps
- **Database**: Prisma query logging
- **Frontend**: React Native Performance Monitor
- **APM**: Consider Sentry or similar for production monitoring

## 8. Future Optimizations

### High Priority
1. **Database Query Optimization**: Review slow queries and optimize
2. **CDN for Images**: Set up CDN for user-uploaded images
3. **Connection Pooling**: Optimize database connection pool
4. **API Response Compression**: Already using `compression` middleware

### Medium Priority
1. **GraphQL**: Consider GraphQL for more efficient data fetching
2. **Service Workers**: Implement service workers for offline support
3. **Database Read Replicas**: For high-traffic scenarios
4. **Elasticsearch**: For advanced search capabilities

### Low Priority
1. **WebSocket Optimization**: Optimize Socket.io message delivery
2. **Background Jobs**: Move heavy operations to background jobs
3. **Microservices**: Consider splitting into microservices at scale

## Performance Checklist

### Backend
- [x] Database indexes added
- [x] Redis caching implemented
- [x] Pagination on list endpoints
- [x] Query optimization (selective fields)
- [x] Response compression
- [x] Database connection pooling (configured via centralized Prisma client)
- [x] Query performance monitoring (slow query detection, query stats endpoint)

### Frontend
- [x] Route lazy loading (automatic with Expo Router)
- [x] Bundle size analysis (script: `pnpm analyze-bundle`)
- [x] Image lazy loading (implemented with expo-image)
- [x] Code splitting verification (script: `backend/scripts/verify-code-splitting.ps1`)
- [ ] Performance monitoring (recommended for production)

### Infrastructure
- [ ] CDN setup
- [ ] Image optimization pipeline
- [ ] Caching strategy review
- [ ] Load testing

## Notes
- Performance optimizations should be measured before and after implementation
- Regular performance audits recommended (quarterly)
- Monitor production metrics continuously
- Adjust caching strategies based on usage patterns

