import {
  formatIssueBody,
  formatIssueTitle,
} from "@/server/github/format-issue-body";
import type { DiagnosticTrail } from "@fasterfixes/core";
import { getTrackerScreenshotUrl } from "@/server/storage/get-signed-asset-url";

export const issueContentInclude = {
  reviewer: { select: { name: true } },
  screenshot: { select: { key: true, bucket: true } },
} as const;

type FeedbackForContent = {
  id: string;
  comment: string;
  pageUrl: string;
  selector: string | null;
  clickX: number | null;
  clickY: number | null;
  browserName: string | null;
  browserVersion: string | null;
  os: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  metadata: unknown;
  diagnosticTrail: unknown;
  projectId: string;
  reviewer: { name: string };
  screenshot: { key: string; bucket: string } | null;
};

/**
 * Title and markdown body of the GitHub issue for a feedback. Shared by the
 * create job and the later body refresh once the screenshot has landed.
 */
export async function buildGitHubIssueContent(feedback: FeedbackForContent) {
  const screenshotUrl = feedback.screenshot
    ? await getTrackerScreenshotUrl(feedback.screenshot)
    : null;

  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.BASE_URL!;
  const dashboardUrl = `${baseUrl}/inbox?feedbackId=${feedback.id}`;

  return {
    title: formatIssueTitle(feedback.comment),
    body: formatIssueBody({
      id: feedback.id,
      comment: feedback.comment,
      pageUrl: feedback.pageUrl,
      selector: feedback.selector,
      clickX: feedback.clickX,
      clickY: feedback.clickY,
      browserName: feedback.browserName,
      browserVersion: feedback.browserVersion,
      os: feedback.os,
      viewportWidth: feedback.viewportWidth,
      viewportHeight: feedback.viewportHeight,
      screenshotUrl,
      reviewerName: feedback.reviewer.name,
      metadata: feedback.metadata as Record<string, unknown> | null,
      diagnosticTrail: feedback.diagnosticTrail as DiagnosticTrail | null,
      projectId: feedback.projectId,
      dashboardUrl,
    }),
    hasScreenshot: screenshotUrl !== null,
  };
}
