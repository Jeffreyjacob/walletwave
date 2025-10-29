import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import getConfig, { AppConfig } from './config/config';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ErrorHandler } from './middleware/errorHandler';
import { prisma } from './config/prismaConfig';
import swaggerJSDoc from 'swagger-jsdoc';
import { swaggerOptions } from './config/swaggerConfig';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/authRoutes';
import { handleStripeConnectWebhook } from './webhooks/stripeConnect';
import walletRoutes from './routes/walletRoutes';
import { handleStripePaymentWebhook } from './webhooks/stripePayment';

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

  app.post(
    `${config.apiPrefix}/webhook/stripe/connect`,
    express.raw({ type: 'application/json' }),
    handleStripeConnectWebhook
  );

  app.post(
    `${config.apiPrefix}/webhook/stripe/payment`,
    express.raw({ type: 'application/json' }),
    handleStripePaymentWebhook
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

  const swaggerSpec = swaggerJSDoc(swaggerOptions);

  app.use(
    `${config.apiPrefix}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'Wallet wave',
    })
  );

  app.get(`${config.apiPrefix}/swagger.json`, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json'), res.send(swaggerSpec);
  });
  app.use(`${config.apiPrefix}/auth`, authRoutes);
  app.use(`${config.apiPrefix}/wallet`, walletRoutes);

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
