export const env = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === "true"
};
