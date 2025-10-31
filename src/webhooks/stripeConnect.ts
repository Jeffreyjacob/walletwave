import { Request, Response } from 'express';
import Stripe from 'stripe';
import getConfig from '../config/config';
import { stripe } from '../utils/stripe';
import { prisma } from '../config/prismaConfig';
import { AppError } from '../utils/appError';

const config = getConfig();

const handleAccountUpdated = async (account: Stripe.Account) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        stripeAccountId: account.id,
      },
    });

    if (!user) {
      throw new AppError("user with account id can't be found", 404);
    }

    await prisma.wallet.update({
      where: {
        userId: user.id,
      },
      data: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailSubmitted: account.details_submitted,
        status:
          account.details_submitted &&
          account.charges_enabled &&
          account.payouts_enabled
            ? 'ACTIVE'
            : 'LOCKED',
      },
    });
  } catch (error: any) {
    console.error('Error handling account update:', error);
  }
};

const handleCapabilityUpdated = async (capability: Stripe.Capability) => {
  try {
    const account = await stripe.accounts.retrieve(
      capability.account as string
    );

    await handleAccountUpdated(account);
  } catch (error: any) {
    console.error('Error handling capability update:', error);
  }
};

const handlePayoutPaid = async (event: Stripe.Payout) => {
  const { transactionId, walletId } = event.metadata!;

  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
  });

  if (!transaction) {
    console.log('Unable to find transaction');
    return;
  }

  const wallet = await prisma.wallet.findUnique({
    where: {
      id: walletId,
    },
  });

  if (!wallet) {
    console.log('Unable to find wallet');
    return;
  }

  await prisma.$transaction(async (tx) => {
    tx.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: 'SUCCESS',
      },
    });

    tx.ledger.create({
      data: {
        walletId,
        transactionId: transaction.id,
        change: event.amount / 100,
        balanceBefore: wallet.balance.plus(event.amount / 100),
        balanceAfter: wallet.balance,
      },
    });

    tx.auditLog.create({
      data: {
        userId: wallet.userId,
        action: 'WITHDRAW_SUCCESS',
        details: {
          payoutId: event.id,
        },
      },
    });
  });
  console.log(`Payout ${event.id} marked as SUCCESS`);
};

const handlePayoutFailed = async (event: Stripe.Payout) => {
  const { transactionId, walletId } = event.metadata!;

  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
  });

  if (!transaction) {
    console.log('Unable to find transaction');
    return;
  }

  const wallet = await prisma.wallet.findUnique({
    where: {
      id: walletId,
    },
  });

  if (!wallet) {
    console.log('Unable to find wallet');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: 'FAILED',
      },
    });

    await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: { increment: transaction.amount },
      },
    });

    await tx.ledger.create({
      data: {
        walletId: wallet.id,
        transactionId: transaction.id,
        change: event.amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance.plus(transaction.amount),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: wallet.userId,
        action: 'FAILED WITHDRAW',
        details: {
          payoutid: event.id,
        },
      },
    });
  });

  const metadata = (transaction.metadata ?? {}) as Record<string, any>;
  const transferId = metadata?.transferId;

  if (!transferId) {
    throw new Error('Transfer ID not found in transaction metadata');
  }

  await stripe.transfers.createReversal(transferId, {
    amount: Math.round(Number(transaction.amount) * 100),
    metadata: { reason: 'Payout failed - reversed to platform' },
  });
  console.log(`Payout ${event.id} failed - transfer reversed`);
};

export const handleStripeConnectWebhook = async (
  req: Request,
  res: Response
) => {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  const endpointSecret = config.stripe.stripe_connect_webhook;

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
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object as Stripe.Capability);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
        break;
    }

    return res.status(200).json({ recieved: true });
  } catch (error: any) {
    console.error('Webhook handler failed', error);
    res.status(500).json({
      error: 'Webhook handler failed',
    });
  }
};
