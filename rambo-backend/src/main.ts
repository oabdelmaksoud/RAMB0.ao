import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { AppModule } from './app.module';

async function bootstrap() {
  // Initialize Firebase Admin SDK
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  // Create NestJS application
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false },
    }),
  );

  // Security middleware
  app.use(helmet());

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests, please try again later',
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:3000'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: [
      'Origin', 
      'X-Requested-With', 
      'Content-Type', 
      'Accept', 
      'Authorization'
    ],
  });

  // Get port from configuration
  const port = configService.get('API_PORT', 3000);
  const host = configService.get('API_HOST', 'localhost');

  // Start the server
  await app.listen(port, host, () => {
    console.log(`Backend server running on http://${host}:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
});
