export interface IUser {
  register: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
  login: {
    email: string;
    password: string;
  };
}

export interface IWallet {
  generateOnBoardingLink: {
    accountId: string;
  };
  fundWallet: {
    amount: number;
  };
  transferToWallet: {
    amount: number;
    recieveWalletRef: string;
    description?: string;
  };
  walletPayout: {
    amount: number;
    description?: string;
  };
}
