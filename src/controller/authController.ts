import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AsyncHandler } from '../utils/asyncHandler';
import {
  loginValidators,
  registerValidator,
} from '../validators/auth.validators';
import { RefreshAccessToken } from '../middleware/authMiddleware';
import { prisma } from '../config/prismaConfig';
import { clearTokenCookie } from '../utils/token.utils';

export class AuthController {
  private static authService = new AuthService();

  static RegisterController = AsyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validatedBody = await registerValidator(req.body);

      const result = await AuthController.authService.RegisterUser({
        data: validatedBody,
      });

      return res.status(201).json({
        success: true,
        ...result,
      });
    }
  );

  static LoginController = AsyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validatedBody = await loginValidators(req.body);

      const result = await AuthController.authService.LoginUser({
        data: validatedBody,
        res,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    }
  );

  static RefreshAccessTokenController = AsyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      console.log(req);
      await RefreshAccessToken({ req, res, next });

      return res.status(200).json({
        success: true,
        message: 'access token refreshed ',
      });
    }
  );

  static LogOutController = AsyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const refresh = req.cookies.refreshToken;

      if (refresh) {
        await prisma.token.updateMany({
          where: {
            userId: req.user.id,
            token: refresh,
          },
          data: {
            isRevoked: true,
          },
        });
      }

      clearTokenCookie(res);

      return res.status(200).json({
        success: true,
        message: 'User has been Logged out',
      });
    }
  );
}
