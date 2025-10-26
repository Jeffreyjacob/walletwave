import { Router } from 'express';
import { AuthController } from '../controller/authController';
import { Protect } from '../middleware/authMiddleware';

const authRoutes = Router();

authRoutes.route('/register').post(AuthController.RegisterController);
authRoutes.route('/login').post(AuthController.LoginController);
authRoutes
  .route('/refresh')
  .post(Protect, AuthController.RefreshAccessTokenController);

export default authRoutes;
