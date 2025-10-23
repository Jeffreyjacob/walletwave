import { User } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError';
import {
  GenerateToken,
  setTokenCookie,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/token.utils';
import { prisma } from '../config/prismaConfig';

declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

export const Protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      throw new AppError('Invalid zccess token, Please login again', 401);
    }

    const payload = verifyAccessToken(accessToken);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    req.user = user;
    next();
  } catch (error: any) {
    next(error);
  }
};

export const SaveRefreshToken = async ({
  userId,
  refreshToken,
}: {
  userId: User['id'];
  refreshToken: string;
}) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('Unable to find user', 404);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.token.create({
    data: {
      userId: user.id,
      token: refreshToken,
      isExpiredAt: expiresAt,
    },
  });
};

export const RefreshAccessToken = async ({
  req,
  res,
  next,
}: {
  req: Request;
  res: Response;
  next: NextFunction;
}) => {
  try {
    const refresh = req.cookies.refreshToken;

    if (!refresh) {
      throw new AppError('Invalid or expired refresh token', 400);
    }

    const decoded = verifyRefreshToken(refresh);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!user) {
      throw new AppError('Unable to find user', 404);
    }

    const storedToken = await prisma.token.findFirst({
      where: {
        token: refresh,
        userId: user.id,
        isRevoked: false,
        isExpiredAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new AppError('Invalid or expired refresh token', 400);
    }

    const { accessToken, refreshToken } = GenerateToken(user);

    // save refresh token

    await SaveRefreshToken({ userId: user.id, refreshToken });

    // revoked the old token

    await prisma.token.update({
      where: {
        id: storedToken.id,
      },
      data: {
        isRevoked: true,
      },
    });

    // delete all user revoked refresh token

    await prisma.token.deleteMany({
      where: {
        userId: user.id,
        isRevoked: true,
      },
    });

    // set new access and refresh token in response
    setTokenCookie(res, accessToken, refreshToken);
    req.user = user;
    next();
  } catch (error: any) {
    next(error);
  }
};
