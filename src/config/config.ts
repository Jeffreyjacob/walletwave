export interface AppConfig {
  env: string;
  port: number | string;
  apiPrefix: string;
  urls: {
    frontend_url: string;
    backend_url: string;
  };
  tokens: {
    accessToken: {
      token_key: string;
      expires_in: string;
    };
    refreshToken: {
      token_key: string;
      expires_in: string;
    };
  };
  security: {
    cors: {
      origin: string;
      credentials: boolean;
    };
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
  stripe: {
    stripe_secret_key: string;
    stripe_connect_webhook: string;
    stripe_payment_webhook: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    username?: string;
  };
  bullmq: {
    defaultJobOptions: {
      removeOnComplete: number;
      removeOnFail: number;
      attempts: number;
      backoff: {
        type: string;
        delay: number;
      };
    };
    concurrency: number;
  };
}

const getConfig = (): AppConfig => ({
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  tokens: {
    accessToken: {
      token_key: process.env.ACCESS_TOKEN_KEY!,
      expires_in: process.env.ACCESS_TOKEN_EXPIRES_IN!,
    },
    refreshToken: {
      token_key: process.env.REFRESH_TOKEN_KEY!,
      expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN!,
    },
  },
  urls: {
    frontend_url: process.env.FRONTEND_URL as string,
    backend_url: process.env.BACKEND_URL as string,
  },
  security: {
    cors: {
      origin: '*',
      credentials: true,
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: parseInt(
        process.env.NODE_ENV === 'development' ? '1000' : '100',
        10
      ),
    },
  },
  stripe: {
    stripe_secret_key: process.env.STRIPE_API_KEY as string,
    stripe_connect_webhook: process.env.STRIPE_CONNECT_WEBHOOK as string,
    stripe_payment_webhook: process.env.STRIPE_PAYMENT_WEBHOOK as string,
  },
  redis: {
    host: process.env.REDIS_HOST as string,
    port: Number(process.env.REDIS_PORT as string),
    username: process.env.REDIS_USERNAME as string,
    password: process.env.REDIS_PASSWORD as string,
  },
  bullmq: {
    defaultJobOptions: {
      removeOnComplete: parseInt(
        process.env.BULLMQ_REMOVE_ON_COMPLETE || '100',
        10
      ),
      removeOnFail: parseInt(process.env.BULLMQ_ON_FAIL || '50', 10),
      attempts: parseInt(process.env.BULL_MQ_ATTEMPTS || '3', 10),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.BULLMQ_BACKOFF_DELAY || '2000', 10),
      },
    },
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY || '10', 10),
  },
});

export default getConfig;
