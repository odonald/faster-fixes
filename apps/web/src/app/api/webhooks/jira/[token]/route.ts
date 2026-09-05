import { sendEvent } from "@/server/jobs";
import { prisma } from "@workspace/db";
import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

type JiraWebhookPayload = {
  webhookEvent?: string;
  issue?: { id?: string };
};

type RouteParams = { params: Promise<{ token: string }> };

const HANDLED_EVENTS = new Set(["jira:issue_updated", "jira:issue_deleted"]);

/**
 * Inbound Jira Cloud webhooks.
 *
 * Jira dynamic webhooks carry no signature, so authenticity rests entirely on the
 * unguessable per-installation token in the path — and, because a URL can leak,
 * on the receiver treating the body as an untrusted hint. Nothing here reads
 * state out of the payload beyond *which* issue to look at; the sync job re-fetches
 * that issue from Jira before touching a Feedback (PRD #7). The worst a forged
 * payload with a valid token can achieve is a wasted read.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const installation = await prisma.jiraInstallation.findUnique({
    where: { webhookToken: token },
    select: { id: true },
  });

  if (!installation) {
    return NextResponse.json({ error: "Unknown webhook" }, { status: 401 });
  }

  const rawBody = await req.text();

  let payload: JiraWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as JiraWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Jira sets this header on dynamic webhook deliveries; hashing the body is the
  // fallback so a retry without it still dedupes.
  const deliveryId =
    req.headers.get("x-atlassian-webhook-identifier") ??
    crypto.createHash("sha256").update(rawBody).digest("hex");

  try {
    await prisma.rateLimit.create({
      data: {
        id: crypto.randomUUID(),
        key: `webhook:jira:${deliveryId}`,
        count: 1,
        lastRequest: BigInt(Date.now()),
      },
    });
  } catch {
    // Unique constraint violation — already processed this delivery.
    return NextResponse.json({ ok: true, skipped: "duplicate_delivery" });
  }

  const webhookEvent = payload.webhookEvent;
  if (!webhookEvent || !HANDLED_EVENTS.has(webhookEvent)) {
    return NextResponse.json({ ok: true, ignored: `event:${webhookEvent}` });
  }

  const issueId = payload.issue?.id;
  if (!issueId) {
    return NextResponse.json({ ok: true, ignored: "no_issue_id" });
  }

  await sendEvent({
    name: "jira/webhook.issue",
    data: {
      installationId: installation.id,
      issueId,
      webhookEvent,
    },
  });

  return NextResponse.json({ ok: true });
}
