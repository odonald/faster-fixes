import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

// The standard pg adapter works against any PostgreSQL 14+ (self-managed,
// Docker, Neon, Supabase, RDS, ...). Self-hosted deployments must not depend
// on a vendor-specific serverless driver.
const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

export { prisma };
