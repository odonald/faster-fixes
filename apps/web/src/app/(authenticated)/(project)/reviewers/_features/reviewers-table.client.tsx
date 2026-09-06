"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Check, Copy } from "lucide-react";
import * as React from "react";

import type { GetReviewersOutput } from "./get-reviewers.trpc.query";
import { DeleteReviewerButton } from "./delete/delete-reviewer-button.client";
import { RestoreReviewerButton } from "./restore/restore-reviewer-button.client";
import { RevokeReviewerButton } from "./revoke/revoke-reviewer-button.client";

type ReviewersTableProps = {
  projectId: string;
  reviewers: GetReviewersOutput;
};

export function ReviewersTable({ projectId, reviewers }: ReviewersTableProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Access</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Feedback</TableHead>
          <TableHead>Share link</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {reviewers.map((reviewer) => (
          <TableRow key={reviewer.id}>
            <TableCell>
              <div className="font-medium">{reviewer.name}</div>
              {(reviewer.email || reviewer.externalId) && (
                <div className="text-muted-foreground truncate text-xs">
                  {reviewer.email ?? reviewer.externalId}
                </div>
              )}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">
                  {reviewer.source === "identity" ? "Signed in" : "Share link"}
                </Badge>
                {reviewer.role === "admin" && <Badge variant="secondary">Admin</Badge>}
              </div>
            </TableCell>
            <TableCell>
              {reviewer.isActive ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="secondary">Revoked</Badge>
              )}
            </TableCell>
            <TableCell>{reviewer.feedbackCount}</TableCell>
            <TableCell>
              {reviewer.shareUrl === null ? (
                <span className="text-muted-foreground text-xs">
                  {reviewer.lastSeenAt
                    ? `Seen ${new Date(reviewer.lastSeenAt).toLocaleDateString()}`
                    : "—"}
                </span>
              ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(reviewer.shareUrl!, reviewer.id)}
              >
                {copied === reviewer.id ? (
                  <>
                    <Check className="text-success size-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    Copy link
                  </>
                )}
              </Button>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {reviewer.isActive ? (
                  <RevokeReviewerButton
                    projectId={projectId}
                    reviewerId={reviewer.id}
                    reviewerName={reviewer.name}
                  />
                ) : (
                  <>
                    <RestoreReviewerButton
                      projectId={projectId}
                      reviewerId={reviewer.id}
                    />
                    <DeleteReviewerButton
                      projectId={projectId}
                      reviewerId={reviewer.id}
                      reviewerName={reviewer.name}
                    />
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
