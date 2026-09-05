/**
 * Next.js instrumentation hook – runs once when the server process starts.
 * Boots the in-process job worker so background jobs need nothing but the
 * database.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.JOBS_WORKER === "false") return;

  const { startJobWorker } = await import("@/server/jobs/worker");
  await startJobWorker().catch(() => {
    // Logged inside startJobWorker; a broken queue must not take the app down.
  });
}
