import { TransactionType, User } from '@prisma/client';
import getConfig from '../config/config';
import { prisma } from '../config/prismaConfig';
import { IWallet } from '../interfaces/interface';
import { stripe } from '../utils/stripe';
import { AppError } from '../utils/appError';
import { getExpiredCheckoutQueue } from '../jobs/queue/expiredCheckoutSession';

const config = getConfig();
export class WalletService {
  private prisma = prisma;
  private stripe = stripe;
  async generateOnBoardingLink({ accountId }: { accountId: string }) {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${config.urls.backend_url}${config.apiPrefix}/wallet/onBoardingLink?accountId=${accountId}`,
      return_url: `${config.urls.frontend_url}`,
      type: 'account_onboarding',
    });

    return {
      url: link.url,
    };
  }

  async fundWallet({
    userId,
    data,
  }: {
    userId: User['id'];
    data: IWallet['fundWallet'];
  }) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        userId,
      },
      include: {
        user: true,
      },
    });

    if (!wallet) {
      throw new AppError("user wallet can't be found", 404);
    }

    const amount = Math.round(Number(data.amount) * 100);

    const transaction = await this.prisma.transaction.create({
      data: {
        amount: amount,
        userId,
        type: TransactionType.FUND,
        walletId: wallet.id,
        metadata: {
          currency: 'usd',
        },
      },
    });

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        customer: wallet.user.stripeCustomerId ?? undefined,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Wallet Funding',
                description: `Funding wallet #${wallet.walletRef}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        success_url: `${config.urls.backend_url}/checkout/success`,
        cancel_url: `${config.urls.frontend_url}/cancel`,
        metadata: {
          transactionId: transaction.id,
          walletId: wallet.id,
          userId,
        },
      },
      {
        idempotencyKey: transaction.id,
      }
    );

    await this.prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        stripeSessionId: session.id,
      },
    });

    const expiredCheckSession = getExpiredCheckoutQueue();
    const expiredCheckSessionJob = await expiredCheckSession.add(
      'expiredCheckout',
      {
        transactionId: transaction.id,
      },
      {
        delay: 24 * 60 * 60 * 1000,
      }
    );

    await this.prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        expiredCheckoutSessionJobId: expiredCheckSessionJob.id,
      },
    });

    return {
      url: session.url,
    };
  }
}
