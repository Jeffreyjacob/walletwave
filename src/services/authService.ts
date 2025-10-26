import { prisma } from '../config/prismaConfig';
import { IUser } from '../interfaces/interface';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/appError';
import { generateWalletRef } from '../utils/helper';
import { GenerateToken, setTokenCookie } from '../utils/token.utils';
import { SaveRefreshToken } from '../middleware/authMiddleware';
import { Response } from 'express';
import { stripe } from '../utils/stripe';

export class AuthService {
  private prisma = prisma;
  private stripe = stripe;

  async RegisterUser({ data }: { data: IUser['register'] }) {
    const findExistingUser = await this.prisma.user.findFirst({
      where: {
        email: data.email,
      },
    });

    if (findExistingUser) {
      throw new AppError('email already exist', 400);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // hashPassword
      const hashPassword = bcrypt.hashSync(data.password, 10);

      const user = await tx.user.create({
        data: {
          ...data,
          password: hashPassword,
        },
      });

      const customer = await this.stripe.customers.create({
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
      });

      const account = await this.stripe.accounts.create({
        type: 'express',
        email: data.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
      });

      const walletRef = generateWalletRef();

      const wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          walletRef,
        },
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          stripeAccountId: account.id,
          stripeCustomerId: customer.id,
        },
      });

      const link = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: ``,
        return_url: ``,
        type: 'account_onboarding',
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER',
          details: {
            email: data.email,
          },
        },
      });

      return { link };
    });

    return {
      message:
        'User has been created, also your wallet, click on the link to finish your kyc and verify your wallet for transfer and withdrawal',
      data: result.link,
    };
  }

  async LoginUser({ res, data }: { res: Response; data: IUser['login'] }) {
    const findUser = await this.prisma.user.findFirst({
      where: {
        email: data.email,
      },
    });

    if (!findUser) {
      throw new AppError('Invalid credentials, Try again', 400);
    }

    const comparedPassword = bcrypt.compare(data.password, findUser.password);

    if (!comparedPassword) {
      throw new AppError('Invalid credentials, Try again', 400);
    }

    const { accessToken, refreshToken } = GenerateToken(findUser);

    await SaveRefreshToken({
      userId: findUser.id,
      refreshToken,
    });

    setTokenCookie(res, accessToken, refreshToken);

    return {
      message: 'Login successful',
    };
  }
}
