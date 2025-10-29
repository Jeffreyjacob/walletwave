import { Request, Response } from 'express';
import getConfig from '../config/config';
import Stripe from 'stripe';
import { stripe } from '../utils/stripe';
import { AppError } from '../utils/appError';
import { prisma } from '../config/prismaConfig';
import { TransactionStatus } from '@prisma/client';
import { getExpiredCheckoutQueue } from '../jobs/queue/expiredCheckoutSession';

const config = getConfig();

const handleCheckOutSessionCompleted = async (event: Stripe.Event) => {
  const sessions = event.data.object as Stripe.Checkout.Session;
  const { transactionId, walletId, userId } = sessions.metadata!;

  const amountTotal = sessions.amount_total ? sessions.amount_total / 100 : 0;

  try {
    const existing = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    if (!existing || existing.status !== TransactionStatus.PENDING) {
      console.warn(
        'Unable to find transaction or transactio has been processed'
      );
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.SUCCESS,
          stripePaymentIntentId: sessions.payment_intent?.toString(),
        },
      });

      const newBalance = existing.wallet.balance.plus(amountTotal);

      await tx.wallet.update({
        where: { id: existing.walletId },
        data: { balance: newBalance },
      });

      await tx.ledger.create({
        data: {
          walletId: existing.walletId,
          transactionId,
          change: amountTotal,
          balanceBefore: existing.wallet.balance,
          balanceAfter: newBalance,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: existing.userId,
          action: 'WALLET_FUNDED',
          details: {
            amount: amountTotal,
            transactionId,
            stripePaymentIntentId: sessions.payment_intent?.toString(),
          },
        },
      });
    });

    // cancel expiredcheckout session job

    if (existing.expiredCheckoutSessionJobId) {
      const expiredCheckoutSession = getExpiredCheckoutQueue();
      const expiredJob = await expiredCheckoutSession.getJob(
        existing.expiredCheckoutSessionJobId
      );

      if (expiredJob) {
        await expiredJob.remove();
      }
    }
  } catch (error: any) {
    console.error('Error handling paid invoice:', error.message);
    throw error;
  }
};

const handleCheckoutSessionFailed = async (event: Stripe.Event) => {
  const session = event.data.object as Stripe.Checkout.Session;
  const { transactionId } = session.metadata!;

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing || existing.status !== TransactionStatus.PENDING) return;

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.FAILED,
        description: 'Checkout session failed or canceled',
      },
    });

    await tx.auditLog.create({
      data: {
        userId: existing.userId,
        action: 'WALLET_FUND_FAILED',
        details: {
          transactionId,
          stripeSessionId: session.id,
        },
      },
    });
  });

  if (existing.expiredCheckoutSessionJobId) {
    const expiredCheckoutSession = getExpiredCheckoutQueue();
    const expiredJob = await expiredCheckoutSession.getJob(
      existing.expiredCheckoutSessionJobId
    );

    if (expiredJob) {
      await expiredJob.remove();
    }
  }

  console.warn(`Wallet funding failed for transactio ${transactionId}`);
};

const handlePaymentIntentFailed = async (event: Stripe.Event) => {
  const intent = event.data.object as Stripe.PaymentIntent;
  const transactionId = intent.metadata?.transactionId;

  if (!transactionId) return;

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing || existing.status !== TransactionStatus.PENDING) return;

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.FAILED,
        description: 'Payment intent failed',
      },
    });

    await tx.auditLog.create({
      data: {
        userId: existing.userId,
        action: 'WALLET_FUND_FAILED',
        details: {
          transactionId,
          stripePaymentIntentId: intent.id,
          failureReason: intent.last_payment_error?.message || 'unknown',
        },
      },
    });
  });

  if (existing.expiredCheckoutSessionJobId) {
    const expiredCheckoutSession = getExpiredCheckoutQueue();
    const expiredJob = await expiredCheckoutSession.getJob(
      existing.expiredCheckoutSessionJobId
    );

    if (expiredJob) {
      await expiredJob.remove();
    }
  }

  console.warn(`Payment intent failed for Tx ${transactionId}`);
};

const handleAsyncPaymentSucceeded = async (event: Stripe.Event) => {
  await handleCheckOutSessionCompleted(event);
};

export const handleStripePaymentWebhook = async (
  req: Request,
  res: Response
) => {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  const endpointSecret = config.stripe.stripe_payment_webhook;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      endpointSecret
    );
  } catch (error: any) {
    console.log(`Webhook signature verified Failed`, error);
    return res.status(400).send(`Webhook Error: ${error}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckOutSessionCompleted(event);
        break;

      case 'checkout.session.async_payment_succeeded':
        await handleAsyncPaymentSucceeded(event);
        break;

      case 'checkout.session.async_payment_failed':
        await handleCheckoutSessionFailed(event);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
        break;
    }

    res.status(200).json({
      recieved: true,
      eventType: event.type,
      eventId: event.id,
    });
  } catch (error: any) {
    console.error('⚠️ Webhook handler error:', error);
    res.status(500).send('Internal handler error');
  }
};
