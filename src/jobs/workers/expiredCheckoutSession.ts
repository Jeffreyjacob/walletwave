import { Job, Worker } from 'bullmq';
import { IExpiredCheckoutSessionData } from '../interface/interface';
import { bullmqRedis } from '../../config/redisConfig';
import getConfig from '../../config/config';
import { prisma } from '../../config/prismaConfig';
import { AppError } from '../../utils/appError';
import { TransactionStatus } from '@prisma/client';

export const config = getConfig();
export const createExpiredSessionWorker = () => {
  const worker = new Worker<IExpiredCheckoutSessionData>(
    'expiredCheckout',
    async (job: Job<IExpiredCheckoutSessionData>) => {
      try {
        const { transactionId } = job.data;

        const transaction = await prisma.transaction.findUnique({
          where: {
            id: transactionId,
          },
        });

        if (!transaction) {
          throw new AppError('Unable to find transaction', 400);
        }

        if (transaction.status === TransactionStatus.PENDING) {
          await prisma.transaction.update({
            where: {
              id: transaction.id,
            },
            data: {
              status: TransactionStatus.FAILED,
              description: 'Checkout session expired',
            },
          });
        }
      } catch (error: any) {
        console.error('Failed to update transaction to failed');
        throw error;
      }
    },
    {
      connection: bullmqRedis,
      concurrency: config.bullmq.concurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(
      `Updated transaction with expired checkoutSession ${job.id} completed`
    );
  });

  worker.on('failed', (job, err) => {
    console.warn(`Expired checkout session job ${job?.id} failed:`, err);
  });

  worker.on('progress', (job, progress) => {
    console.warn(`Expiring checkout session ${job.id} progress`, progress);
  });

  return worker;
};
