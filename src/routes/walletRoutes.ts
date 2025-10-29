import { NextFunction, Request, Response, Router } from 'express';
import { Protect } from '../middleware/authMiddleware';
import { WalletController } from '../controller/walletController';

const walletRoutes = Router();

walletRoutes
  .route('/onBoardingLink')
  .get(WalletController.GenerateOnBoardingLinkController);

walletRoutes
  .route('/checkout/success')
  .get((req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
      success: true,
      message: 'Checkout Session successfully!',
    });
  });

export default walletRoutes;
