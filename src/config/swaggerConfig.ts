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
    schemas: {},
  },
};

export const swaggerOptions: SwaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/routes/*.js', './dist/routes/*.js'],
};
