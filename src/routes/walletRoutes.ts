import { NextFunction, Request, Response, Router } from 'express';
import { CheckWalletStatus, Protect } from '../middleware/authMiddleware';
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

/**
 * @openapi
 * /api/v1/wallet/fund:
 *   post:
 *     summary: fund wallet
 *     tags: [Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FundWalletRequest'
 *     responses:
 *       200:
 *         description: process has been initialed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FundWalletResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
walletRoutes
  .route('/fund')
  .post(Protect, CheckWalletStatus, WalletController.FundWalletController);

export default walletRoutes;
