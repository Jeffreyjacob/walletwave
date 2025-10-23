import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import getConfig from '../config/config';
import { Response } from 'express';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  id: string;
}

const config = getConfig();

export const GenerateToken = (user: User): TokenResponse => {
  const accessToken = jwt.sign(
    {
      userId: user.id,
    },
    config.tokens.accessToken.token_key,
    {
      expiresIn: '15m',
    }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
    },
    config.tokens.refreshToken.token_key,
    {
      expiresIn: '7d',
    }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (accessToken: string): TokenPayload => {
  const payload = jwt.verify(
    accessToken,
    config.tokens.accessToken.token_key
  ) as TokenPayload;

  return payload;
};

export const verifyRefreshToken = (refreshToken: string): TokenPayload => {
  const payload = jwt.verify(
    refreshToken,
    config.tokens.refreshToken.token_key
  ) as TokenPayload;

  return payload;
};

export const setTokenCookie = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  res.cookie('accessToken', accessToken, {
    secure: config.env === 'production' ? true : false,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    secure: config.env === 'production' ? true : false,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

export const clearTokenCookie = (res: Response) => {
  res.clearCookie('accessToken', {
    secure: config.env === 'production' ? true : false,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  res.clearCookie('refreshToken', {
    secure: config.env === 'production' ? true : false,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};
