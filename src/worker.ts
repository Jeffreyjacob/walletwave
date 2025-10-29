import { prisma } from './config/prismaConfig';
import { createExpiredSessionWorker } from './jobs/workers/expiredCheckoutSession';

const startWorker = async () => {
  try {
    await prisma.$connect();
    const expiredCheckoutSessionWorker = createExpiredSessionWorker();

    console.log('👷 Worker process started and connected to Rediss');

    expiredCheckoutSessionWorker.on('ready', () => {
      console.log('Expiring checkout session worker connected');
    });

    expiredCheckoutSessionWorker.on('error', (error) => {
      console.error('Expiring checkout session', error);
    });

    process.on('SIGINT', async () => {
      console.log('Shutting down worker');
      expiredCheckoutSessionWorker.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('Worker failed to start:', error);
    process.exit(1);
  }
};

startWorker();
