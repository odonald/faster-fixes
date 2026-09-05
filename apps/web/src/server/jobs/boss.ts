import { PgBoss } from "pg-boss";

/**
 * Background jobs live in Postgres via pg-boss (MIT) – no external queue
 * service. The same DATABASE_URL the app uses; pg-boss keeps its tables in
 * the `pgboss` schema.
 *
 * Producers only need `send`; the worker (see ./worker.ts) is started once
 * per server process from `instrumentation.ts`.
 */
let bossPromise: Promise<PgBoss> | null = null;

export function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss({
        connectionString: process.env.DATABASE_URL,
        application_name: "faster-fixes-jobs",
        // Small pool: the app's Prisma client already holds the main one.
        max: Number(process.env.JOBS_DB_POOL_MAX ?? 3),
        schema: process.env.JOBS_DB_SCHEMA ?? "pgboss",
      });
      boss.on("error", (error: Error) => {
        console.error("[jobs] pg-boss error:", error);
      });
      await boss.start();
      return boss;
    })().catch((error) => {
      // Let the next call retry instead of caching a rejected promise.
      bossPromise = null;
      throw error;
    });
  }
  return bossPromise;
}
