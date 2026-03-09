# Alyne - Technology Stack

## Mobile Application (Cross-Platform)

### **React Native with Expo**
- **Why:** Single codebase for iOS, Android, and web
- **Key Libraries:**
  - `expo-router` - File-based routing
  - `@react-navigation/native` - Navigation
  - `expo-location` - Geolocation services
  - `react-native-maps` - Map integration
  - `@stripe/stripe-react-native` - Payment processing
  - `expo-notifications` - Push notifications
  - `@react-native-async-storage/async-storage` - Local storage
  - `react-native-calendars` - Calendar UI
  - `socket.io-client` - Real-time messaging

## Backend API

### **Node.js with TypeScript**
- **Framework:** Express.js or Fastify
- **Why:** Excellent for real-time features, large ecosystem, TypeScript for type safety
- **Key Libraries:**
  - `express` or `fastify` - Web framework
  - `socket.io` - Real-time communication
  - `jsonwebtoken` - JWT authentication
  - `bcrypt` - Password hashing
  - `joi` or `zod` - Input validation
  - `multer` - File uploads
  - `stripe` - Payment processing
  - `nodemailer` - Email sending
  - `googleapis` - Google Calendar integration

## Database

### **PostgreSQL** (Primary Database)
- **Why:** Relational data structure, ACID compliance for payments, excellent querying
- **ORM:** Prisma or TypeORM
- **Schema:** Users, Providers, Clients, Bookings, Reviews, Messages, Payments

### **Redis** (Caching & Real-time)
- **Why:** Fast caching, pub/sub for real-time features, session management
- **Use Cases:**
  - Session storage
  - Real-time messaging pub/sub
  - Rate limiting
  - Caching frequently accessed data

## Authentication & Security

### **Firebase Authentication**
- Email/Phone verification
- Social login (Google, Apple)
- JWT token management
- Secure password handling

## File Storage

### **AWS S3**
- Profile photos
- Certification documents
- Service photos
- CDN via CloudFront for fast delivery

## Third-Party Integrations

### **Maps & Location**
- **Google Maps API** - Map display, geocoding, distance calculation
- **Native GPS** - Device location services

### **Payments**
- **Stripe** - Payment processing, subscription management, refunds

### **Calendar**
- **Google Calendar API** - Calendar integration
- **Apple CalendarKit** - iOS calendar integration

### **Push Notifications**
- **Firebase Cloud Messaging (FCM)** - Cross-platform push notifications

### **Email**
- **SendGrid** or **AWS SES** - Transactional emails

## Development Tools

### **Version Control**
- Git & GitHub

### **Package Management**
- **Mobile:** npm/yarn
- **Backend:** npm/yarn

### **Code Quality**
- ESLint - Linting
- Prettier - Code formatting
- TypeScript - Type safety

### **Testing**
- Jest - Unit testing
- React Native Testing Library - Component testing
- Supertest - API testing

## Deployment & DevOps

### **Mobile App**
- **Expo Application Services (EAS)** - Build and deployment
- Alternative: GitHub Actions for CI/CD

### **Backend**
- **AWS (EC2/ECS/Lambda)** - Scalable cloud hosting
- Alternative: Railway, Render, or Heroku for faster setup

### **Database**
- **AWS RDS** (PostgreSQL) or **Supabase** (managed PostgreSQL)
- **Redis Cloud** or **AWS ElastiCache**

### **CI/CD**
- GitHub Actions - Automated testing and deployment

## Environment Variables

Required environment variables will be documented in `.env.example` files for both mobile and backend projects.

---

**Last Updated:** December 2024

