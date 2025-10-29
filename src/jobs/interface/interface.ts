import { Transaction } from '@prisma/client';

export interface IExpiredCheckoutSessionData {
  transactionId: Transaction['id'];
}
