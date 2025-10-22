import { prisma } from '../config/prismaConfig';
import { IUser } from '../interfaces/interface';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/appError';
import { generateWalletRef } from '../utils/helper';

export class AuthService {
  private prisma = prisma;

  async RegisterUser(data: IUser['register']) {
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

      const walletRef = generateWalletRef();

      const wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          walletRef,
        },
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

      return { user, wallet };
    });

    return {
      message: 'User has been created successfully!',
    };
  }
}
