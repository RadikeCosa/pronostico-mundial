import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

let prismaClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (prismaClient) {
    return prismaClient;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create a Prisma client.");
  }

  const adapter = new PrismaPg({ connectionString });
  prismaClient = new PrismaClient({ adapter });

  return prismaClient;
}
