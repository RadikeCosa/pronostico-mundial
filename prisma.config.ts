import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/pronosticos_mundial?schema=public";
const appDatabaseUrl = process.env.DATABASE_URL ?? fallbackDatabaseUrl;
const migrateDatabaseUrl = process.env.DIRECT_DATABASE_URL ?? appDatabaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node --experimental-strip-types prisma/seed.ts",
  },
  datasource: {
    url: migrateDatabaseUrl,
  },
});
