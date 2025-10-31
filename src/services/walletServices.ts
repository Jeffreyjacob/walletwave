import { TransactionType, User, WalletStatus } from '@prisma/client';
import getConfig from '../config/config';
import { prisma } from '../config/prismaConfig';
import { IWallet } from '../interfaces/interface';
import { stripe } from '../utils/stripe';
import { AppError } from '../utils/appError';
import { getExpiredCheckoutQueue } from '../jobs/queue/expiredCheckoutSession';
import { Decimal } from '@prisma/client/runtime/library';

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

    const transaction = await this.prisma.transaction.create({
      data: {
        amount: data.amount,
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
              unit_amount: Math.round(Number(data.amount) * 100),
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

  async internalTransfer({
    data,
    userId,
  }: {
    data: IWallet['transferToWallet'];
    userId: User['id'];
  }) {
    const transferAmount = new Decimal(data.amount);

    return await this.prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findUnique({
        where: { userId },
        include: { user: true },
      });

      const recieveWallet = await tx.wallet.findUnique({
        where: { walletRef: data.recieveWalletRef },
        include: { user: true },
      });

      if (!senderWallet) {
        throw new AppError(
          'Something went wrong, Please check your wallet',
          400
        );
      }

      if (!recieveWallet) {
        throw new AppError(
          'Invalid walletRef, Please check reciever wallet ref and try again',
          400
        );
      }

      if (recieveWallet.status !== WalletStatus.ACTIVE) {
        throw new AppError(
          "Reciever wallet can't recieve any money right now, Please try again",
          400
        );
      }

      if (senderWallet.balance.lt(transferAmount)) {
        throw new AppError('Insufficient balance', 400);
      }

      const senderTx = await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          userId: senderWallet.userId,
          amount: transferAmount.negated(),
          type: 'TRANSFER',
          status: 'SUCCESS',
          description: data.description ? data.description : '',
          metadata: {
            direction: 'debit',
            to: data.recieveWalletRef,
          },
        },
      });

      const recieverTx = await tx.transaction.create({
        data: {
          walletId: recieveWallet.id,
          userId: recieveWallet.userId,
          amount: transferAmount,
          type: 'TRANSFER',
          status: 'SUCCESS',
          description: data.description ? data.description : '',
          metadata: {
            direction: 'credit',
            from: senderWallet.walletRef,
          },
        },
      });

      const senderNewBalance = senderWallet.balance.minus(transferAmount);
      const receiverNewBalance = recieveWallet.balance.plus(transferAmount);

      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: senderNewBalance },
      });

      await tx.wallet.update({
        where: { id: recieveWallet.id },
        data: { balance: receiverNewBalance },
      });

      await tx.ledger.createMany({
        data: [
          {
            walletId: senderWallet.id,
            transactionId: senderTx.id,
            change: transferAmount.negated(),
            balanceBefore: senderWallet.balance,
            balanceAfter: senderNewBalance,
          },
          {
            walletId: recieveWallet.id,
            transactionId: recieverTx.id,
            change: transferAmount,
            balanceBefore: recieveWallet.balance,
            balanceAfter: receiverNewBalance,
          },
        ],
      });

      await tx.auditLog.createMany({
        data: [
          {
            userId: senderWallet.userId,
            action: 'TRANSFER_SENT',
            details: {
              amount: data.amount,
              to: data.recieveWalletRef,
              transactionId: senderTx.id,
            },
          },
          {
            userId: recieveWallet.userId,
            action: 'TRANSFER_RECIEVED',
            details: {
              amount: data.amount,
              from: senderWallet.walletRef,
              transactionId: recieverTx.id,
            },
          },
        ],
      });

      return {
        message: 'Transfer successful',
        senderBalance: senderNewBalance,
        recieveBalance: receiverNewBalance,
      };
    });
  }

  async getWallet({ userId }: { userId: User['id'] }) {
    const wallet = this.prisma.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      throw new AppError('Unable to find wallet', 400);
    }

    return wallet;
  }

  async verifyWallet({ userId }: { userId: User['id'] }) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new AppError('Unable to find wallet', 404);
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: wallet.userId,
      },
    });

    if (!user?.stripeAccountId) {
      throw new AppError('Unable to find stripe account id', 404);
    }

    if (wallet.status === 'ACTIVE') {
      throw new AppError('wallet is already active', 400);
    }

    const link = await this.stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${config.urls.backend_url}${config.apiPrefix}/wallet/onBoardingLink?accountId=${user.stripeAccountId}`,
      return_url: `${config.urls.frontend_url}`,
      type: 'account_onboarding',
    });

    return {
      url: link.url,
    };
  }

  async WalletPayout({
    data,
    userId,
  }: {
    data: IWallet['walletPayout'];
    userId: User['id'];
  }) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!wallet) {
      throw new AppError('unable to find wallet', 404);
    }

    if (!wallet.payoutsEnabled) {
      throw new AppError(
        'Enable payout in your wallet by adding a payout account',
        400
      );
    }

    if (wallet.balance.lt(data.amount)) {
      throw new AppError('Insufficient balance', 400);
    }

    if (!wallet.user.stripeAccountId) {
      throw new AppError('Unable to find stripe account Id', 404);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          status: 'PENDING',
          amount: data.amount,
          type: 'WITHDRAW',
          description: data.description ? data.description : '',
          metadata: {
            direction: 'withdraw',
          },
        },
      });

      const newBalance = wallet.balance.minus(data.amount);

      await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: newBalance,
        },
      });

      return transaction;
    });

    try {
      const transfer = await this.stripe.transfers.create(
        {
          amount: Math.round(Number(data.amount) * 100),
          currency: 'usd',
          destination: wallet.user.stripeAccountId,
          description: data.description ? data.description : '',
        },
        {
          idempotencyKey: result.id,
        }
      );

      const payout = await this.stripe.payouts.create(
        {
          amount: Math.round(data.amount * 100),
          currency: 'usd',
          description: 'Manual wallet withdrawal',
          metadata: {
            transactionId: result.id,
            walletId: wallet.id,
            userId,
          },
        },
        {
          stripeAccount: wallet.user.stripeAccountId,
        }
      );

      await this.prisma.transaction.update({
        where: {
          id: result.id,
        },
        data: {
          metadata: {
            transferId: transfer.id,
            payoutId: payout.id,
            walletId: wallet.id,
          },
        },
      });
    } catch (error: any) {
      await this.prisma.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: { increment: data.amount },
        },
      });

      await this.prisma.transaction.update({
        where: {
          id: result.id,
        },
        data: {
          status: 'FAILED',
        },
      });

      throw new AppError('Unable to payout at the moment', 400);
    }

    return {
      message: 'Transfer has been initiated and being processed',
    };
  }
}
