import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/pronosticos_mundial?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node --experimental-strip-types prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
  },
});
