export interface AppConfig {
  env: string;
  port: number | string;
  apiPrefix: string;
  //   frontendUrls: {};
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
});

export default getConfig;
