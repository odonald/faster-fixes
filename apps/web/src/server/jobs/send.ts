import { getBoss } from "./boss";
import type { EventName, EventPayload, Events } from "./events";
import { getJobsForEvent } from "./registry";

type AnyEvent = { [N in EventName]: EventPayload<N> }[EventName];

/**
 * Fan an event out to every job subscribed to it. One pg-boss job per
 * (event, subscriber) so a failing GitHub sync never blocks the Slack
 * notification for the same feedback.
 */
export async function sendEvent<N extends EventName>(
  name: N,
  data: Events[N],
): Promise<void>;
export async function sendEvent(event: AnyEvent): Promise<void>;
export async function sendEvent(events: AnyEvent[]): Promise<void>;
export async function sendEvent(
  nameOrEvent: EventName | AnyEvent | AnyEvent[],
  data?: unknown,
): Promise<void> {
  const events: AnyEvent[] = Array.isArray(nameOrEvent)
    ? nameOrEvent
    : typeof nameOrEvent === "string"
      ? [{ name: nameOrEvent, data } as AnyEvent]
      : [nameOrEvent];

  if (events.length === 0) return;

  const boss = await getBoss();

  for (const event of events) {
    for (const job of getJobsForEvent(event.name)) {
      const trigger = job.eventTriggers.find((t) => t.event === event.name);
      if (trigger?.if && !trigger.if(event.data as never)) continue;

      const concurrencyKey = job.concurrencyKey?.(event.data as never);
      const singletonKey = job.singletonKey?.(event.data as never);

      await boss.send(job.id, event, {
        retryLimit: job.retries,
        retryDelay: job.retryDelaySeconds,
        retryBackoff: true,
        ...(concurrencyKey && { group: { id: concurrencyKey } }),
        ...(singletonKey && { singletonKey }),
        ...(trigger?.delaySeconds && { startAfter: trigger.delaySeconds }),
      });
    }
  }
}
