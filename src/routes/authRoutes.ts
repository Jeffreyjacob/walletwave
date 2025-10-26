import { Router } from 'express';
import { AuthController } from '../controller/authController';
import { Protect } from '../middleware/authMiddleware';

const authRoutes = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUserRequest'
 *     responses:
 *       200:
 *         description: User Registration Successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterUserResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.route('/register').post(AuthController.RegisterController);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: User Registration Successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.route('/login').post(AuthController.LoginController);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh expired access token
 *     description: |
 *       Uses the `refresh_token` cookie to issue a new access token.
 *       The client does not need to pass the refresh token manually.
 *     tags:
 *       - Auth
 *     security:
 *       - RefreshToken: []
 *     responses:
 *       200:
 *         description: A new access token was issued.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token.
 */
authRoutes
  .route('/refresh')
  .post(Protect, AuthController.RefreshAccessTokenController);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout authenticated user
 *     tags:
 *       - Auth
 *     security:
 *       - AccessToken: []
 *     responses:
 *       200:
 *         description: Log out authenticated users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Unable to logout user at the moment
 */
authRoutes.route('/logout').post(Protect, AuthController.LogOutController);

export default authRoutes;
