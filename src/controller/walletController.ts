import { NextFunction, Request, Response } from 'express';
import { WalletService } from '../services/walletServices';
import { AsyncHandler } from '../utils/asyncHandler';
import {
  fundWalletValidators,
  generateOnBoardingLinkValidators,
} from '../validators/wallet.Validators';

export class WalletController {
  private static walletServices = new WalletService();

  static GenerateOnBoardingLinkController = AsyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const accountId = req.query.accountId as string;
      const body = {
        accountId: accountId ? accountId : '',
      };

      const validatedBody = await generateOnBoardingLinkValidators(body);

      const result =
        await WalletController.walletServices.generateOnBoardingLink({
          accountId: validatedBody.accountId,
        });

      return res.redirect(result.url);
    }
  );

  static FundWalletController = AsyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validatedBody = await fundWalletValidators(req.body);

      const result = await WalletController.walletServices.fundWallet({
        userId: req.user.id,
        data: validatedBody,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    }
  );
}
