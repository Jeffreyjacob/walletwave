import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AsyncHandler } from '../utils/asyncHandler';

export class AuthController {
  private static authService = new AuthService();

  static RegisterController = AsyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {}
  );
}
