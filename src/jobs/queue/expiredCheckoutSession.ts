import { Queue } from 'bullmq';
import getConfig from '../../config/config';
import { bullmqRedis } from '../../config/redisConfig';

const config = getConfig();

let expiredCheckoutQueue: Queue | null = null;

export const getExpiredCheckoutQueue = () => {
  if (!expiredCheckoutQueue) {
    expiredCheckoutQueue = new Queue('expiredCheckout', {
      connection: bullmqRedis,
      defaultJobOptions: {
        ...config.bullmq.defaultJobOptions,
      },
    });
  }
  return expiredCheckoutQueue;
};
