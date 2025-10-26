import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AsyncHandler } from '../utils/asyncHandler';
import {
  loginValidators,
  registerValidator,
} from '../validators/auth.validators';
import { RefreshAccessToken } from '../middleware/authMiddleware';

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
      await RefreshAccessToken({ req, res, next });

      return res.status(200).json({
        success: true,
        message: 'access token refreshed ',
      });
    }
  );
}
