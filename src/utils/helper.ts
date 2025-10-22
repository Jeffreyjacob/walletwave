import { randomBytes } from 'crypto';

export const generateWalletRef = () => {
  const prefix = 'WALLET';
  const randomPort = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${randomPort}`;
};
