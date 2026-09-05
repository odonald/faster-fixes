"use client";

import { useStorageUpload } from "./use-storage-upload";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Loader2, Upload } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";

type UploadButtonProps = {
  /** better-upload route name */
  route: string;
  /** File accept attribute */
  accept?: string;
  /** Button label (default: "Choose a file") */
  label?: string;
  /** Description shown below the button (e.g. file constraints) */
  description?: string;
  disabled?: boolean;
  /** Client metadata to send with the upload */
  metadata?: Record<string, string>;
  onUploadComplete?: (info: {
    key: string;
    filename: string;
    size: number;
    mimeType: string;
    raw: File;
  }) => void;
  onError?: (error: { type: string; message: string }) => void;
  /** Icon displayed in the button (default: Upload icon) */
  icon?: ReactNode;
  className?: string;
};

export function UploadButton({
  route: uploadRoute,
  accept,
  label = "Choose a file",
  description,
  disabled = false,
  metadata,
  onUploadComplete,
  onError,
  icon,
  className,
}: UploadButtonProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const { upload, isPending } = useStorageUpload({
    route: uploadRoute,
    metadata,
    onUploadComplete,
    onError,
  });

  const isDisabled = disabled || isPending;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={isDisabled}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && !isPending) {
            upload(file);
          }
          e.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={() => inputRef.current?.click()}
        className="self-start"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          (icon ?? <Upload className="size-4" />)
        )}
        {isPending ? "Uploading..." : label}
      </Button>

      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  );
}
