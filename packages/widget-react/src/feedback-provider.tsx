import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_API_ORIGIN,
  FasterFixesClient,
  resolveReviewerToken,
} from "@fasterfixes/core";
import type {
  Labels,
  WidgetConfig,
  WidgetPosition,
} from "@fasterfixes/core";
import type { ClassNames } from "./context.js";
import { FeedbackProviderCore } from "./feedback-provider-core.js";

type FeedbackProviderProps = {
  /** Public Project ID (`proj_...`) from your Faster Fixes project settings. */
  projectId?: string;
  /**
   * @deprecated Use `projectId` instead. Still accepted for backward
   * compatibility; will be removed in a future major version.
   */
  apiKey?: string;
  apiOrigin?: string;
  color?: string;
  position?: WidgetPosition;
  classNames?: Partial<ClassNames>;
  labels?: Partial<Labels>;
  // Capture a Diagnostic Trail (console + network) with each feedback. Code-managed,
  // not a dashboard setting; set false to opt a site out of capture entirely.
  captureDiagnostics?: boolean;
  /**
   * Signed identity of the logged-in user, produced on your server with
   * `signIdentity` from @fasterfixes/core. When set, the widget identifies the
   * user instead of looking for a share-link token. Pass `undefined` for users
   * who should not see the widget.
   */
  identity?: string | null;
  children: React.ReactNode;
};

export function FeedbackProvider({
  projectId,
  apiKey,
  apiOrigin,
  color,
  position,
  classNames,
  labels,
  captureDiagnostics = true,
  identity,
  children,
}: FeedbackProviderProps) {
  const [reviewerToken, setReviewerToken] = useState<string | null>(null);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Prefer projectId; fall back to the deprecated apiKey. The server resolves
  // either a `proj_` Project ID or a legacy `ff_` key from the same header.
  const identifier = projectId ?? apiKey ?? "";

  const client = useMemo(
    () => new FasterFixesClient({ apiKey: identifier, apiOrigin }),
    [identifier, apiOrigin],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (identity) {
          // Host-asserted identity: exchange for a session, no share link needed.
          const [cfg, identified] = await Promise.all([
            client.getConfig(),
            client.identify(identity),
          ]);
          if (cancelled) return;
          setConfig(cfg);
          setReviewerToken(identified.session);
        } else {
          const token = resolveReviewerToken();
          if (!token) return;
          setReviewerToken(token);
          const cfg = await client.getConfig();
          if (cancelled) return;
          setConfig(cfg);
        }
      } catch {
        // Config/identify failed — widget won't render
      } finally {
        if (!cancelled) setInitialized(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [client, identity]);

  if (!initialized || !reviewerToken || !config || !config.enabled) {
    return <>{children}</>;
  }

  return (
    <FeedbackProviderCore
      client={client}
      reviewerToken={reviewerToken}
      config={config}
      color={color}
      position={position}
      classNames={classNames}
      labels={labels}
      captureDiagnostics={captureDiagnostics}
      apiOrigin={apiOrigin ?? DEFAULT_API_ORIGIN}
    >
      {children}
    </FeedbackProviderCore>
  );
}
