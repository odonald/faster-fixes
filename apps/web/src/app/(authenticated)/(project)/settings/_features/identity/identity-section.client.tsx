"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

type IdentitySectionProps = { projectId: string };

/**
 * Lets the host app identify its own logged-in users as reviewers – no share
 * link. The host signs the user with this secret; the widget exchanges the
 * signature for a session. See the snippet below the secret.
 */
export function IdentitySection({ projectId }: IdentitySectionProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [rotateOpen, setRotateOpen] = React.useState(false);

  const projectQuery = useQuery(trpc.authenticated.projects.get.queryOptions({ projectId }));
  const secret = projectQuery.data?.identitySecret ?? null;
  const publicId = projectQuery.data?.publicId ?? "proj_xxx";

  const rotate = useMutation(
    trpc.authenticated.projects.rotateIdentitySecret.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({
          queryKey: trpc.authenticated.projects.get.queryKey({ projectId }),
        });
        setRotateOpen(false);
        setRevealed(true);
        toast.success(result.identitySecret ? "Identity secret ready" : "Identity disabled");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const serverSnippet = `import { signIdentity } from "@fasterfixes/core";

// On your server, for users allowed to give feedback:
const identity = await signIdentity(process.env.FASTERFIXES_IDENTITY_SECRET!, {
  externalId: user.id,            // Auth0 sub, Supabase id, ...
  name: user.name,
  role: user.isAdmin ? "admin" : "reviewer",
});`;

  const clientSnippet = `<FeedbackProvider projectId="${publicId}" identity={identity}>
  {children}
</FeedbackProvider>`;

  if (!secret) {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          Off. Reviewers currently need a share link. Enable identity to let your
          app mark its own logged-in users as reviewers: they see the widget
          automatically, and their feedback is attributed to them by name.
        </p>
        <Button
          onClick={() => rotate.mutate({ projectId })}
          disabled={rotate.isPending}
          className="w-fit"
        >
          <KeyRound className="size-4" />
          Enable and generate secret
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
          Identity secret
        </p>
        <div className="bg-muted flex items-center gap-2 rounded-md border p-3">
          <code className="flex-1 truncate font-mono text-xs">
            {revealed ? secret : `ffid_${"•".repeat(32)}`}
          </code>
          <Button variant="ghost" size="icon-xs" onClick={() => setRevealed((v) => !v)} aria-label={revealed ? "Hide" : "Reveal"}>
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => copy(secret, "secret")} aria-label="Copy secret">
            {copied === "secret" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Keep it on your server only. Anyone holding it can act as any reviewer of this project.
        </p>
      </div>

      <ol className="text-muted-foreground list-decimal space-y-3 pl-5">
        <li>
          <span className="text-foreground font-medium">Server:</span> decide who may review
          (a role or flag in your own user model) and sign them.
          <Snippet code={serverSnippet} onCopy={() => copy(serverSnippet, "server")} copied={copied === "server"} />
        </li>
        <li>
          <span className="text-foreground font-medium">Client:</span> pass the result to the
          provider. Users without an identity see nothing.
          <Snippet code={clientSnippet} onCopy={() => copy(clientSnippet, "client")} copied={copied === "client"} />
        </li>
        <li>
          <span className="text-foreground font-medium">Behaviour:</span> markers are hidden until
          the reviewer switches them on. Reviewers then see only their own; admins see everyone&apos;s.
          Share links keep working alongside.
        </li>
      </ol>

      <div className="flex flex-wrap gap-2">
        <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <RefreshCw className="size-3.5" />
              Rotate secret
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rotate the identity secret?</DialogTitle>
              <DialogDescription>
                Identities signed with the current secret stop working immediately. Update
                your server&apos;s environment with the new value right after.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRotateOpen(false)}>Cancel</Button>
              <Button onClick={() => rotate.mutate({ projectId })} disabled={rotate.isPending}>
                Rotate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => rotate.mutate({ projectId, disable: true })}
          disabled={rotate.isPending}
        >
          Disable identity
        </Button>
      </div>
    </div>
  );
}

function Snippet({ code, onCopy, copied }: { code: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="relative mt-2">
      <pre className="bg-muted overflow-x-auto rounded-md p-3 pr-10 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button type="button" variant="ghost" size="icon-xs" className="absolute top-2 right-2" onClick={onCopy} aria-label="Copy">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}
