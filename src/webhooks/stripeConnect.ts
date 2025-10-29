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
    }

    return res.status(200).json({ recieved: true });
  } catch (error: any) {
    console.error('Webhook handler failed', error);
    res.status(500).json({
      error: 'Webhook handler failed',
    });
  }
};
