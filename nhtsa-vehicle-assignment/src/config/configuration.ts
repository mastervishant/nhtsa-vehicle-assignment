export default () => ({
  app: {
    environment: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
  },

  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    name: process.env.DATABASE_NAME ?? 'nhtsa',
    synchronize:
      process.env.DB_SYNCHRONIZE === 'true',
  },

  nhtsa: {
    baseUrl:
      process.env.NHTSA_BASE_URL ??
      'https://vpic.nhtsa.dot.gov/api/vehicles',

    timeoutMs: Number(
      process.env.NHTSA_TIMEOUT_MS ?? 30000,
    ),

    retries: Number(
      process.env.NHTSA_RETRIES ?? 3,
    ),
  },

  logging: {
    level:
      process.env.LOG_LEVEL ?? 'info',
  },

  cache: {
    ttlSeconds: Number(
      process.env.CACHE_TTL_SECONDS ?? 3600,
    ),

    maxItems: Number(
      process.env.CACHE_MAX_ITEMS ?? 20000,
    ),
  },
});