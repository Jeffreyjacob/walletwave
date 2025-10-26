import { SwaggerDefinition } from 'swagger-jsdoc';
import { SwaggerOptions } from 'swagger-ui-express';

export const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Wallet Wave Api',
    version: '1.0.0',
    description: 'API documentation for Wallet wave',
  },
  servers: [
    {
      url:
        process.env.NODE_ENV === 'production'
          ? 'https://18.214.18.120.nip.io'
          : 'http://localhost:8000',
      description:
        process.env.NODE_ENV === 'production' ? 'Production' : 'Local',
    },
  ],
  componets: {
    securitySchemes: {
      AccessToken: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
      },
      RefreshToken: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
      },
    },
    schemas: {
      RegisterUserRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'test@example.com',
          },
          firstName: {
            type: 'string',
            example: 'john',
          },
          lastName: {
            type: 'string',
            example: 'doe',
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'password1234',
          },
        },
      },
      RegisterUserResponse: {
        type: 'object',
        properies: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'User Created Successfully!',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'test@example.com',
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'password1234',
          },
        },
      },
      LoginResponse: {
        type: 'object',
        properites: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Login successfully!',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Something went wrong' },
          status: { type: 'integer', example: 400 },
        },
      },
    },
  },
};

export const swaggerOptions: SwaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/routes/*.js', './dist/routes/*.js'],
};
