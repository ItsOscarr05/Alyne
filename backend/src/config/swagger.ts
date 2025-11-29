/**
 * Swagger/OpenAPI configuration
 */
import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Alyne API',
      version: '1.0.0',
      description: 'API documentation for Alyne wellness marketplace platform',
      contact: {
        name: 'Alyne Support',
        email: 'support@alyne.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.alyne.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Error message',
                },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Providers', description: 'Provider discovery and management' },
      { name: 'Bookings', description: 'Booking management' },
      { name: 'Messages', description: 'In-app messaging' },
      { name: 'Reviews', description: 'Reviews and ratings' },
      { name: 'Payments', description: 'Payment processing' },
      { name: 'Plaid', description: 'Bank account integration' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API files
};

export const swaggerSpec = swaggerJsdoc(options);

