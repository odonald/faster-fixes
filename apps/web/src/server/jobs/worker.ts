import type { Job } from "pg-boss";
import { getBoss } from "./boss";
import type { EventPayload } from "./events";
import { allJobs } from "./registry";

let started: Promise<void> | null = null;

/**
 * Registers every job's queue, worker, and cron schedule with pg-boss. Runs
 * once per Node process (see `instrumentation.ts`). Safe to run in several
 * app replicas: pg-boss hands each job to exactly one worker.
 */
export function startJobWorker(): Promise<void> {
  if (!started) {
    started = (async () => {
      const boss = await getBoss();

      for (const job of allJobs) {
        await boss.createQueue(job.id, {
          retryLimit: job.retries,
          retryDelay: job.retryDelaySeconds,
          retryBackoff: true,
          // A job that runs longer than this is considered lost and retried.
          expireInSeconds: 15 * 60,
        });

        await boss.work<EventPayload | null>(
          job.id,
          {
            batchSize: 1,
            // One job at a time per group (feedbackId, installationId, ...),
            // mirroring the previous per-key concurrency limit of 1.
            groupConcurrency: 1,
          },
          async ([pgJob]: Job<EventPayload | null>[]) => {
            if (!pgJob) return;
            const event: EventPayload =
              pgJob.data ?? ({ name: `cron:${job.id}`, data: {} } as never);
            const result = await job.handler(event);
            if (result && typeof result === "object" && "skipped" in result) {
              console.info(`[jobs] ${job.id} skipped:`, result.skipped);
            }
          },
        );

        for (const cron of job.cronTriggers) {
          await boss.schedule(job.id, cron, null, {
            tz: process.env.JOBS_CRON_TZ ?? "UTC",
            retryLimit: job.retries,
          });
        }
      }

      console.info(`[jobs] worker started – ${allJobs.length} jobs registered`);
    })().catch((error) => {
      started = null;
      console.error("[jobs] worker failed to start:", error);
      throw error;
    });
  }
  return started;
}
