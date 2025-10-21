import express, { Application } from 'express';
import dotenv from 'dotenv';
import getConfig, { AppConfig } from './config/config';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ErrorHandler } from './middleware/errorHandler';
import { prisma } from './config/prismaConfig';

dotenv.config();

const startServer = async () => {
  const app: Application = express();
  const config: AppConfig = getConfig();

  app.use(
    cors({
      origin: config.security.cors.origin,
      credentials: config.security.cors.credentials,
    })
  );

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    })
  );
  app.use(morgan('common'));
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(ErrorHandler);

  const PORT = Number(config.port) || 8000;
  await prisma.$connect();
  app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
  });

  process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    process.exit(0);
  });
};

startServer();
