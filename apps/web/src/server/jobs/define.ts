import type { EventName, EventPayload, Events } from "./events";

/**
 * Distributive over N so each trigger's `if` sees the payload of *its* event,
 * even when one job subscribes to several events.
 */
type EventTrigger<N extends EventName> = {
  [K in N]: {
    event: K;
    /** Only run when the predicate holds for the event payload. */
    if?: (data: Events[K]) => boolean;
  };
}[N];

type CronTrigger = { cron: string };

export type JobTrigger =
  | { [N in EventName]: EventTrigger<N> }[EventName]
  | CronTrigger;

export type JobConfig<N extends EventName> = {
  /** Stable identifier; becomes the pg-boss queue name. */
  id: string;
  /** Retry attempts after the first failure. */
  retries?: number;
  /** Seconds between retries (exponential backoff is applied). */
  retryDelaySeconds?: number;
  /**
   * Jobs sharing a key never run concurrently (pg-boss group concurrency).
   * Mirrors Inngest's `concurrency: { key, limit: 1 }`.
   */
  concurrencyKey?: (data: Events[N]) => string;
  /**
   * While a job with this key is queued or running, further sends with the
   * same key are dropped. Mirrors Inngest's `idempotency` for the common
   * "same event re-emitted in quick succession" case.
   */
  singletonKey?: (data: Events[N]) => string;
  triggers: Array<EventTrigger<N> | CronTrigger>;
};

export type JobHandler<N extends EventName> = (ctx: {
  event: EventPayload<N>;
}) => Promise<unknown>;

export type JobDefinition = {
  id: string;
  retries: number;
  retryDelaySeconds: number;
  concurrencyKey?: (data: never) => string;
  singletonKey?: (data: never) => string;
  eventTriggers: Array<{ event: EventName; if?: (data: never) => boolean }>;
  cronTriggers: string[];
  handler: (event: EventPayload) => Promise<unknown>;
};

/**
 * Declares a background job. The shape intentionally mirrors
 * `inngest.createFunction` so handler bodies did not have to change when the
 * queue moved into Postgres.
 */
export function defineJob<N extends EventName>(
  config: JobConfig<N>,
  handler: JobHandler<N>,
): JobDefinition {
  const eventTriggers: JobDefinition["eventTriggers"] = [];
  const cronTriggers: string[] = [];

  for (const trigger of config.triggers) {
    if ("cron" in trigger) {
      cronTriggers.push(trigger.cron);
    } else {
      eventTriggers.push({
        event: trigger.event,
        if: trigger.if as ((data: never) => boolean) | undefined,
      });
    }
  }

  return {
    id: config.id,
    retries: config.retries ?? 3,
    retryDelaySeconds: config.retryDelaySeconds ?? 30,
    concurrencyKey: config.concurrencyKey as
      | ((data: never) => string)
      | undefined,
    singletonKey: config.singletonKey as ((data: never) => string) | undefined,
    eventTriggers,
    cronTriggers,
    handler: (event) => handler({ event: event as EventPayload<N> }),
  };
}
