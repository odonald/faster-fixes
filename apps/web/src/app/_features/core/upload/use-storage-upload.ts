"use client";

import { useUploadFile } from "@better-upload/client";
import { useCallback, useState } from "react";

export type UploadCompleteInfo = {
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  raw: File;
};

type UseStorageUploadOptions = {
  route: string;
  metadata?: Record<string, string>;
  onUploadComplete?: (info: UploadCompleteInfo) => void;
  onError?: (error: { type: string; message: string }) => void;
};

/**
 * Uploads a dashboard file with whichever flow the server's storage needs:
 * a presigned PUT straight to the bucket (S3 providers) or a multipart POST
 * through the app (files stored in Postgres). Components stay agnostic.
 */
export function useStorageUpload({
  route,
  metadata,
  onUploadComplete,
  onError,
}: UseStorageUploadOptions) {
  const direct = process.env.NEXT_PUBLIC_STORAGE_PROVIDER === "database";

  const { control } = useUploadFile({
    route,
    onUploadComplete: ({ file }) => {
      onUploadComplete?.({
        key: file.objectInfo.key,
        filename: file.raw.name,
        size: file.raw.size,
        mimeType: file.raw.type,
        raw: file.raw,
      });
    },
    onError: onError ? (error) => onError(error) : undefined,
  });

  const [directPending, setDirectPending] = useState(false);

  const uploadDirect = useCallback(
    async (file: File) => {
      setDirectPending(true);
      try {
        const form = new FormData();
        form.set("route", route);
        form.set("file", file);
        if (metadata) form.set("metadata", JSON.stringify(metadata));

        const response = await fetch("/api/upload/direct", {
          method: "POST",
          body: form,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          key?: string;
          error?: string;
        };
        if (!response.ok || !payload.key) {
          onError?.({
            type: "upload_failed",
            message: payload.error ?? "Upload failed",
          });
          return;
        }
        onUploadComplete?.({
          key: payload.key,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          raw: file,
        });
      } catch (error) {
        onError?.({
          type: "network",
          message: error instanceof Error ? error.message : "Upload failed",
        });
      } finally {
        setDirectPending(false);
      }
    },
    [route, metadata, onUploadComplete, onError],
  );

  return {
    upload: (file: File) =>
      direct ? uploadDirect(file) : control.upload(file, { metadata }),
    isPending: direct ? directPending : control.isPending,
  };
}
